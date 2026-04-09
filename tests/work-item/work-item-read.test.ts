import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { runCli } from "../helpers/run-cli.js";

function createWorkItemReadFetch() {
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

    if (url.includes("/work-items/?per_page=2")) {
      return new Response(
        JSON.stringify({
          count: 1,
          results: [
            {
              id: "22222222-2222-4222-8222-222222222222",
              sequence_id: 7,
              name: "Fix auth flow",
              priority: "high",
              state: "state-1",
              assignees: []
            }
          ]
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    if (url.includes("/work-items/?per_page=20")) {
      return new Response(
        JSON.stringify({
          count: 1,
          results: [
            {
              id: "22222222-2222-4222-8222-222222222222",
              sequence_id: 7,
              name: "Fix auth flow",
              priority: "high",
              state: "state-1",
              assignees: []
            }
          ]
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    if (url.endsWith("/work-items/22222222-2222-4222-8222-222222222222/")) {
      return new Response(
        JSON.stringify({
          id: "22222222-2222-4222-8222-222222222222",
          sequence_id: 7,
          name: "Fix auth flow",
          priority: "high",
          state: "state-1",
          assignees: []
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

describe("work-item read commands", () => {
  let configDir: string;

  beforeEach(async () => {
    configDir = await mkdtemp(path.join(os.tmpdir(), "plane-cli-work-item-read-"));
  });

  it("lists work items using per_page and cursor-compatible params", async () => {
    const fetchImpl = createWorkItemReadFetch();

    await runCli(
      [
        "auth",
        "login",
        "--base-url",
        "https://plane.example.internal",
        "--api-key",
        "secret-token",
        "--workspace",
        "example-workspace",
        "--project",
        "11111111-1111-4111-8111-111111111111"
      ],
      { configDir, fetchImpl },
    );

    const result = await runCli(["work-item", "list", "--limit", "2", "--json"], {
      configDir,
      fetchImpl
    });

    expect(result.stdout).toContain('"sequence_id": 7');
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/workspaces/example-workspace/projects/11111111-1111-4111-8111-111111111111/work-items/?per_page=2"),
      expect.any(Object),
    );
  });

  it("resolves a numeric ref before fetching detail", async () => {
    const fetchImpl = createWorkItemReadFetch();

    await runCli(
      [
        "auth",
        "login",
        "--base-url",
        "https://plane.example.internal",
        "--api-key",
        "secret-token",
        "--workspace",
        "example-workspace",
        "--project",
        "11111111-1111-4111-8111-111111111111"
      ],
      { configDir, fetchImpl },
    );

    const result = await runCli(["work-item", "view", "7", "--json"], {
      configDir,
      fetchImpl
    });

    expect(result.stdout).toContain('"id": "22222222-2222-4222-8222-222222222222"');
    expect(result.stdout).toContain('"name": "Fix auth flow"');
  });
});
