import path from "node:path";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  assertReleaseTagMatchesVersion,
  buildSha256Line,
  expectedTagForVersion,
  parseArgs,
  resolvePackedTarballPath,
} from "../../scripts/prepare-release.mjs";

describe("prepare-release", () => {
  it("derives the expected tag from package.json version", () => {
    const packageJson = JSON.parse(
      readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
    ) as { version: string };

    expect(expectedTagForVersion(packageJson.version)).toBe(`v${packageJson.version}`);
  });

  it("rejects a tag that does not match the package version", () => {
    expect(() => assertReleaseTagMatchesVersion("v9.9.9", "0.1.0")).toThrow(
      "does not match package.json version",
    );
  });

  it("builds a stable sha256 sums line", () => {
    expect(buildSha256Line("plane-cli.tgz", Buffer.from("plane-cli"))).toMatch(
      /^[a-f0-9]{64}  plane-cli\.tgz$/,
    );
  });

  it("reuses an absolute packed tarball path returned by pnpm", () => {
    expect(
      resolvePackedTarballPath(
        "/tmp/release-artifacts",
        "/tmp/release-artifacts/plane-cli-0.1.0.tgz",
      ),
    ).toBe("/tmp/release-artifacts/plane-cli-0.1.0.tgz");
  });

  it("joins a relative packed tarball filename with the output directory", () => {
    expect(resolvePackedTarballPath("/tmp/release-artifacts", "plane-cli-0.1.0.tgz")).toBe(
      "/tmp/release-artifacts/plane-cli-0.1.0.tgz",
    );
  });

  it("derives the tarball basename from an absolute packed path", () => {
    expect(
      path.basename(
        resolvePackedTarballPath(
          "/tmp/release-artifacts",
          "/tmp/release-artifacts/plane-cli-0.1.0.tgz",
        ),
      ),
    ).toBe("plane-cli-0.1.0.tgz");
  });

  it("parses explicit release options", () => {
    expect(parseArgs(["--tag", "v0.1.0", "--out-dir", "tmp/release"])).toEqual({
      outDir: "tmp/release",
      tag: "v0.1.0",
      verifyOnly: false,
    });
  });

  it("supports verify-only mode", () => {
    expect(parseArgs(["--tag", "v0.1.0", "--verify-only"])).toEqual({
      outDir: "release-artifacts",
      tag: "v0.1.0",
      verifyOnly: true,
    });
  });
});

describe("package.json release metadata", () => {
  it("publishes only the runtime payload required for release artifacts", () => {
    const packageJson = JSON.parse(
      readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
    ) as { files?: string[] };

    expect(packageJson.files).toEqual(["dist/src", "LICENSE", "README.md"]);
  });

  it("excludes local secrets and development sources from pnpm pack output", () => {
    const packOutput = execFileSync("pnpm", ["pack", "--dry-run", "--json"], {
      encoding: "utf8",
    });
    const { files } = JSON.parse(packOutput) as { files: Array<{ path: string }> };
    const paths = files.map((file) => file.path);

    expect(paths).not.toContain(".pat");
    expect(paths).not.toContain(".test.env");
    expect(paths.some((path) => path.startsWith("src/"))).toBe(false);
    expect(paths.some((path) => path.startsWith("tests/"))).toBe(false);
  });
});
