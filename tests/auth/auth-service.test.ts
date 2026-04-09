import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { beforeEach, describe, expect, it } from "vitest";

import { createMockFetch } from "../helpers/mock-fetch.js";
import { runCli } from "../helpers/run-cli.js";

describe("auth commands", () => {
  let configDir: string;

  beforeEach(async () => {
    configDir = await mkdtemp(path.join(os.tmpdir(), "plane-cli-auth-"));
  });

  it("persists a single active instance config via auth login", async () => {
    const fetchImpl = createMockFetch({
      body: {
        id: "user-1",
        email: "agent@example.com",
        display_name: "Agent"
      }
    });

    await runCli(
      [
        "auth",
        "login",
        "--base-url",
        "https://plane.example.internal",
        "--api-key",
        "secret-token",
        "--workspace",
        "example-workspace"
      ],
      { configDir, fetchImpl },
    );

    const rawConfig = await readFile(path.join(configDir, "config.json"), "utf8");
    const config = JSON.parse(rawConfig) as {
      currentInstance: string;
      instances: Record<string, { baseUrl: string; apiKey: string; workspaceSlug: string }>;
    };

    expect(config.currentInstance).toBe("default");
    expect(config.instances.default.baseUrl).toBe("https://plane.example.internal");
    expect(config.instances.default.apiKey).toBe("secret-token");
    expect(config.instances.default.workspaceSlug).toBe("example-workspace");
  });

  it("validates auth status through users/me using x-api-key", async () => {
    const fetchImpl = createMockFetch({
      body: {
        id: "user-1",
        email: "agent@example.com",
        display_name: "Agent"
      }
    });

    await runCli(
      [
        "auth",
        "login",
        "--base-url",
        "https://plane.example.internal",
        "--api-key",
        "secret-token",
        "--workspace",
        "example-workspace"
      ],
      { configDir, fetchImpl },
    );

    const result = await runCli(["auth", "status", "--json"], {
      configDir,
      fetchImpl
    });

    expect(result.stdout).toContain('"ok": true');
    expect(result.stdout).toContain('"workspaceSlug": "example-workspace"');
  });
});
