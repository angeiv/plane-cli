import { Command } from "commander";

import { createAuthCommand } from "./commands/auth.js";
import { createProjectCommand } from "./commands/project.js";
import { createWorkItemCommand } from "./commands/work-item.js";
import { createWorkspaceCommand } from "./commands/workspace.js";
import { createRuntime, type CliDependencies } from "./runtime.js";

export function createCli(dependencies: CliDependencies = {}): Command {
  const runtime = createRuntime(dependencies);

  return new Command()
    .name("plane")
    .description("A gh-style CLI for self-hosted Plane Community Edition")
    .addCommand(createAuthCommand(runtime))
    .addCommand(createWorkspaceCommand(runtime))
    .addCommand(createProjectCommand(runtime))
    .addCommand(createWorkItemCommand(runtime));
}
