import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";

export function parseArgs(argv) {
  const options = {
    outDir: "release-artifacts",
    tag: process.env.GITHUB_REF_NAME ?? "",
    verifyOnly: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];

    if (current === "--tag") {
      options.tag = argv[index + 1] ?? "";
      index += 1;
      continue;
    }

    if (current === "--out-dir") {
      options.outDir = argv[index + 1] ?? options.outDir;
      index += 1;
      continue;
    }

    if (current === "--verify-only") {
      options.verifyOnly = true;
    }
  }

  return options;
}

export function expectedTagForVersion(version) {
  return `v${version}`;
}

export function assertReleaseTagMatchesVersion(tag, version) {
  if (!tag) {
    throw new Error("Release tag is required. Pass --tag <vX.Y.Z> or set GITHUB_REF_NAME.");
  }

  const expectedTag = expectedTagForVersion(version);

  if (tag !== expectedTag) {
    throw new Error(
      `Release tag '${tag}' does not match package.json version '${version}'. Expected '${expectedTag}'.`,
    );
  }
}

export function buildSha256Line(filename, buffer) {
  const digest = createHash("sha256").update(buffer).digest("hex");
  return `${digest}  ${filename}`;
}

export function resolvePackedTarballPath(outDir, filename) {
  return path.isAbsolute(filename) ? filename : path.join(outDir, filename);
}

async function loadPackageMetadata() {
  const packageJson = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8"),
  );

  return {
    name: packageJson.name,
    version: packageJson.version,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const pkg = await loadPackageMetadata();

  assertReleaseTagMatchesVersion(options.tag, pkg.version);

  if (options.verifyOnly) {
    process.stdout.write(
      JSON.stringify(
        {
          name: pkg.name,
          tag: options.tag,
          version: pkg.version,
          verified: true,
        },
        null,
        2,
      ) + "\n",
    );
    return;
  }

  const outDir = path.resolve(process.cwd(), options.outDir);
  await rm(outDir, { force: true, recursive: true });
  await mkdir(outDir, { recursive: true });

  const packOutput = execFileSync(
    "pnpm",
    ["pack", "--json", "--pack-destination", outDir],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "inherit"],
    },
  );
  const packMetadata = JSON.parse(packOutput);
  const filename = Array.isArray(packMetadata) ? packMetadata[0]?.filename : packMetadata?.filename;

  if (typeof filename !== "string" || filename.length === 0) {
    throw new Error("Unable to determine packed release filename.");
  }

  const tarballPath = resolvePackedTarballPath(outDir, filename);
  const tarballName = path.basename(tarballPath);
  const tarball = await readFile(tarballPath);
  const sumsPath = path.join(outDir, "SHA256SUMS");
  const sumsContents = `${buildSha256Line(tarballName, tarball)}\n`;

  await writeFile(sumsPath, sumsContents, "utf8");

  process.stdout.write(
    JSON.stringify(
      {
        name: pkg.name,
        outDir,
        tag: options.tag,
        version: pkg.version,
        assets: [tarballName, "SHA256SUMS"],
      },
      null,
      2,
    ) + "\n",
  );
}

const isEntrypoint = import.meta.url === new URL(process.argv[1], "file://").href;

if (isEntrypoint) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
