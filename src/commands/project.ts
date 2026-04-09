import { Command } from "commander";

import { writeError } from "../output/errors.js";
import { writeJson } from "../output/json.js";
import { ConfigStore } from "../config/config-store.js";
import type { CliRuntime } from "../runtime.js";
import { ProjectService } from "../services/project-service.js";

export function createProjectCommand(runtime: CliRuntime): Command {
  const projectService = new ProjectService(new ConfigStore(runtime.configDir), runtime.fetchImpl);
  const project = new Command("project").description("List and select Plane projects");

  project
    .command("list")
    .description("List projects for the active workspace")
    .option("--json", "Print JSON output")
    .action(async (options) => {
      try {
        const projects = await projectService.listProjects();

        if (options.json) {
          writeJson(runtime.stdout, projects);
          return;
        }

        runtime.stdout.write(`${projects.map((item) => `${item.identifier ?? item.id}\t${item.name}`).join("\n")}\n`);
      } catch (error) {
        writeError(runtime.stderr, error);
        throw error;
      }
    });

  project
    .command("use")
    .description("Save the active project by UUID or key")
    .argument("<id-or-key>", "Project UUID or identifier")
    .option("--json", "Print JSON output")
    .action(async (projectRef: string, options) => {
      try {
        const projectId = await projectService.setDefaultProject(projectRef);

        if (options.json) {
          writeJson(runtime.stdout, { defaultProjectId: projectId });
          return;
        }

        runtime.stdout.write(`Default project set to ${projectId}\n`);
      } catch (error) {
        writeError(runtime.stderr, error);
        throw error;
      }
    });

  return project;
}
