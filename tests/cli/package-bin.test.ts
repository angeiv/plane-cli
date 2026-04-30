import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("package.json", () => {
  it("points the published plane bin to the built CLI entrypoint", () => {
    const packageJson = JSON.parse(
      readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
    ) as { bin?: Record<string, string> };

    expect(packageJson.bin?.plane).toBe("./dist/src/bin/plane.js");
  });

  it("declares the Node 22 pnpm baseline for local and CI installs", () => {
    const packageJson = JSON.parse(
      readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
    ) as { engines?: { node?: string }; packageManager?: string };

    expect(packageJson.engines?.node).toBe(">=22");
    expect(packageJson.packageManager).toBe("pnpm@10.33.0");
  });
});
