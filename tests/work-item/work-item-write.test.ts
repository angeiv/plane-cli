import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { runCli } from "../helpers/run-cli.js";

function createWorkItemWriteFetch() {
  return vi.fn(async (input: string | URL, init?: RequestInit) => {
    const url = String(input);
    const body = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : undefined;

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

    if (url.endsWith("/states/")) {
      return new Response(
        JSON.stringify({
          count: 2,
          results: [
            { id: "state-backlog", name: "Backlog" },
            { id: "state-progress", name: "In Progress" }
          ]
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    if (url.endsWith("/project-members/")) {
      return new Response(
        JSON.stringify([
          {
            id: "user-2",
            email: "agent@example.com",
            display_name: "Agent Smith"
          }
        ]),
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
              state: "state-backlog",
              assignees: []
            }
          ]
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    if (url.endsWith("/work-items/") && init?.method === "POST") {
      return new Response(
        JSON.stringify({
          id: "33333333-3333-4333-8333-333333333333",
          sequence_id: 8,
          name: body?.name,
          priority: body?.priority ?? "none",
          state: body?.state ?? "state-backlog",
          assignees: body?.assignees ?? []
        }),
        { status: 201, headers: { "content-type": "application/json" } },
      );
    }

    if (url.endsWith("/work-items/22222222-2222-4222-8222-222222222222/") && init?.method === "PATCH") {
      return new Response(
        JSON.stringify({
          id: "22222222-2222-4222-8222-222222222222",
          sequence_id: 7,
          name: body?.name ?? "Fix auth flow",
          priority: body?.priority ?? "high",
          state: body?.state ?? "state-progress",
          assignees: body?.assignees ?? []
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    if (url.endsWith("/comments/") && init?.method === "POST") {
      return new Response(
        JSON.stringify({
          id: "comment-1",
          comment_html: body?.comment_html,
          issue: "22222222-2222-4222-8222-222222222222"
        }),
        { status: 201, headers: { "content-type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ error: "not found" }), {
      status: 404,
      headers: { "content-type": "application/json" }
    });
  }) as unknown as typeof fetch;
}

describe("work-item write commands", () => {
  let configDir: string;

  beforeEach(async () => {
    configDir = await mkdtemp(path.join(os.tmpdir(), "plane-cli-work-item-write-"));
  });

  it("creates a work item with the minimum name payload", async () => {
    const fetchImpl = createWorkItemWriteFetch();

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

    const result = await runCli(["work-item", "create", "--name", "CLI test", "--json"], {
      configDir,
      fetchImpl
    });

    expect(result.stdout).toContain('"name": "CLI test"');
  });

  it("maps state names and assignee emails before patching", async () => {
    const fetchImpl = createWorkItemWriteFetch();

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

    const result = await runCli(
      [
        "work-item",
        "update",
        "7",
        "--state",
        "In Progress",
        "--assignee",
        "agent@example.com",
        "--priority",
        "high",
        "--description",
        "Updated by CLI",
        "--json"
      ],
      { configDir, fetchImpl },
    );

    expect(result.stdout).toContain('"state": "state-progress"');
    expect(result.stdout).toContain('"assignees": [\n    "user-2"\n  ]');
  });

  it("posts an HTML comment for the resolved work item", async () => {
    const fetchImpl = createWorkItemWriteFetch();

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

    const result = await runCli(
      ["work-item", "comment", "7", "--body", "Temporary comment", "--json"],
      { configDir, fetchImpl },
    );

    expect(result.stdout).toContain('"comment_html": "<p>Temporary comment</p>"');
  });
});
