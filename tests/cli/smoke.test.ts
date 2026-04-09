import { describe, expect, it } from "vitest";

import { createCli } from "../../src/cli.js";

describe("createCli", () => {
  it("registers the expected top-level command groups", () => {
    const cli = createCli();

    expect(cli.commands.map((command) => command.name())).toEqual([
      "auth",
      "workspace",
      "project",
      "work-item"
    ]);
  });
});
