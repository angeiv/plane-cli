import { Command } from "commander";

import { writeError } from "../output/errors.js";
import { writeJson } from "../output/json.js";
import { ConfigStore } from "../config/config-store.js";
import type { CliRuntime } from "../runtime.js";
import { WorkItemService } from "../services/work-item-service.js";

export function createWorkItemCommand(runtime: CliRuntime): Command {
  const workItems = new WorkItemService(new ConfigStore(runtime.configDir), runtime.fetchImpl);
  const workItem = new Command("work-item").description("Query and mutate Plane work items");

  workItem
    .command("list")
    .description("List work items for the active project")
    .option("--limit <number>", "Results per page", "20")
    .option("--cursor <cursor>", "Pagination cursor")
    .option("--workspace <slug>", "Override workspace slug")
    .option("--project <id-or-key>", "Override project UUID or key")
    .option("--json", "Print JSON output")
    .action(async (options) => {
      try {
        const result = await workItems.list({
          cursor: options.cursor,
          limit: Number(options.limit),
          projectRef: options.project,
          workspaceSlug: options.workspace,
        });

        if (options.json) {
          writeJson(runtime.stdout, result);
          return;
        }

        runtime.stdout.write(`${result.results.map((item) => `${item.sequence_id ?? "?"}\t${item.name}`).join("\n")}\n`);
      } catch (error) {
        writeError(runtime.stderr, error);
        throw error;
      }
    });

  workItem
    .command("view")
    .description("View a single work item")
    .argument("<ref>", "Work-item UUID or numeric sequence")
    .option("--workspace <slug>", "Override workspace slug")
    .option("--project <id-or-key>", "Override project UUID or key")
    .option("--json", "Print JSON output")
    .action(async (ref: string, options) => {
      try {
        const result = await workItems.view(ref, {
          projectRef: options.project,
          workspaceSlug: options.workspace,
        });

        if (options.json) {
          writeJson(runtime.stdout, result);
          return;
        }

        runtime.stdout.write(`${result.sequence_id ?? "?"}\t${result.name}\n`);
      } catch (error) {
        writeError(runtime.stderr, error);
        throw error;
      }
    });

  return workItem;
}
