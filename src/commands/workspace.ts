import { Command } from "commander";

import { writeError } from "../output/errors.js";
import { ConfigStore } from "../config/config-store.js";
import type { CliRuntime } from "../runtime.js";
import { ProjectService } from "../services/project-service.js";

export function createWorkspaceCommand(runtime: CliRuntime): Command {
  const projectService = new ProjectService(new ConfigStore(runtime.configDir), runtime.fetchImpl);
  const workspace = new Command("workspace").description("Manage the active Plane workspace");

  workspace
    .command("use")
    .description("Save the active workspace slug")
    .argument("<slug>", "Workspace slug")
    .action(async (slug: string) => {
      try {
        await projectService.setWorkspace(slug);
        runtime.stdout.write(`Active workspace set to ${slug}\n`);
      } catch (error) {
        writeError(runtime.stderr, error);
        throw error;
      }
    });

  return workspace;
}
