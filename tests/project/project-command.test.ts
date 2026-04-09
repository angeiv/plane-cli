import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { runCli } from "../helpers/run-cli.js";

function createProjectFetch() {
  return vi.fn(async (input: string | URL) => {
    const url = String(input);

    if (url.endsWith("/api/v1/users/me/")) {
      return new Response(
        JSON.stringify({
          id: "user-1",
          email: "agent@example.com",
          display_name: "Agent"
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    if (url.includes("/api/v1/workspaces/example-workspace/projects/")) {
      return new Response(
        JSON.stringify({
          count: 1,
          results: [
            {
              id: "11111111-1111-1111-1111-111111111111",
              identifier: "PROJECT",
              name: "Example Project"
            }
          ]
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ error: "not found" }), {
      status: 404,
      headers: { "content-type": "application/json" }
    });
  }) as unknown as typeof fetch;
}

describe("workspace and project commands", () => {
  let configDir: string;

  beforeEach(async () => {
    configDir = await mkdtemp(path.join(os.tmpdir(), "plane-cli-project-"));
  });

  it("persists the selected workspace slug", async () => {
    const fetchImpl = createProjectFetch();

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

    await runCli(["workspace", "use", "next-workspace"], { configDir, fetchImpl });

    const rawConfig = await readFile(path.join(configDir, "config.json"), "utf8");
    const config = JSON.parse(rawConfig) as {
      instances: Record<string, { workspaceSlug: string }>;
    };

    expect(config.instances.default.workspaceSlug).toBe("next-workspace");
  });

  it("resolves a project key to UUID before saving the default project", async () => {
    const fetchImpl = createProjectFetch();

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

    await runCli(["project", "use", "PROJECT"], { configDir, fetchImpl });

    const rawConfig = await readFile(path.join(configDir, "config.json"), "utf8");
    const config = JSON.parse(rawConfig) as {
      instances: Record<string, { defaultProjectId: string }>;
    };

    expect(config.instances.default.defaultProjectId).toBe("11111111-1111-1111-1111-111111111111");
  });

  it("lists projects for the active workspace as JSON", async () => {
    const fetchImpl = createProjectFetch();

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

    const result = await runCli(["project", "list", "--json"], { configDir, fetchImpl });

    expect(result.stdout).toContain('"identifier": "PROJECT"');
    expect(result.stdout).toContain('"name": "Example Project"');
  });
});
