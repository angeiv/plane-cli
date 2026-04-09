import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

describe("plane-cli reusable skill", () => {
  it("documents the command surface, plane concepts, and CE constraints", async () => {
    const skill = await readFile("skills/plane-cli-usage/SKILL.md", "utf8");
    const concepts = await readFile("skills/plane-cli-usage/references/plane-concepts.md", "utf8");
    const workflows = await readFile("skills/plane-cli-usage/references/cli-workflows.md", "utf8");
    const constraints = await readFile("skills/plane-cli-usage/references/ce-api-constraints.md", "utf8");

    expect(skill).toContain("plane work-item");
    expect(skill).toContain("self-hosted Plane CE");
    expect(concepts).toContain("work-item");
    expect(workflows).toContain("plane auth login");
    expect(constraints).toContain("x-api-key");
    expect(constraints).toContain("project UUID");
  });
});
