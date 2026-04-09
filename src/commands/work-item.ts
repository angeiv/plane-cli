import { Command } from "commander";

import { writeError } from "../output/errors.js";
import { writeJson } from "../output/json.js";
import { formatTable } from "../output/table.js";
import { ConfigStore } from "../config/config-store.js";
import type { CliRuntime } from "../runtime.js";
import { WorkItemService } from "../services/work-item-service.js";

function collectValues(value: string, previous: string[]): string[] {
  return [...previous, value];
}

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

        runtime.stdout.write(
          formatTable(
            ["SEQ", "NAME", "PRIORITY"],
            result.results.map((item) => [
              String(item.sequence_id ?? "?"),
              item.name,
              item.priority ?? "none",
            ]),
          ),
        );
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

        runtime.stdout.write(
          formatTable(
            ["FIELD", "VALUE"],
            [
              ["id", result.id],
              ["sequence", String(result.sequence_id ?? "?")],
              ["name", result.name],
              ["priority", result.priority ?? "none"],
            ],
          ),
        );
      } catch (error) {
        writeError(runtime.stderr, error);
        throw error;
      }
    });

  workItem
    .command("create")
    .description("Create a work item")
    .requiredOption("--name <name>", "Work item title")
    .option("--priority <priority>", "Priority value")
    .option("--state <state>", "State name or UUID")
    .option("--assignee <value>", "Assignee email, display name, or UUID", collectValues, [])
    .option("--label <value>", "Label name or UUID", collectValues, [])
    .option("--description <text>", "Description text")
    .option("--workspace <slug>", "Override workspace slug")
    .option("--project <id-or-key>", "Override project UUID or key")
    .option("--json", "Print JSON output")
    .action(async (options) => {
      try {
        const result = await workItems.create({
          assignees: options.assignee,
          description: options.description,
          labels: options.label,
          name: options.name,
          priority: options.priority,
          projectRef: options.project,
          state: options.state,
          workspaceSlug: options.workspace,
        });

        if (options.json) {
          writeJson(runtime.stdout, result);
          return;
        }

        runtime.stdout.write(`Created work item ${result.id}\n`);
      } catch (error) {
        writeError(runtime.stderr, error);
        throw error;
      }
    });

  workItem
    .command("update")
    .description("Update a work item")
    .argument("<ref>", "Work-item UUID or numeric sequence")
    .option("--name <name>", "Updated title")
    .option("--priority <priority>", "Priority value")
    .option("--state <state>", "State name or UUID")
    .option("--assignee <value>", "Assignee email, display name, or UUID", collectValues, [])
    .option("--label <value>", "Label name or UUID", collectValues, [])
    .option("--description <text>", "Description text")
    .option("--workspace <slug>", "Override workspace slug")
    .option("--project <id-or-key>", "Override project UUID or key")
    .option("--json", "Print JSON output")
    .action(async (ref: string, options) => {
      try {
        const result = await workItems.update(ref, {
          assignees: options.assignee,
          description: options.description,
          labels: options.label,
          name: options.name,
          priority: options.priority,
          projectRef: options.project,
          state: options.state,
          workspaceSlug: options.workspace,
        });

        if (options.json) {
          writeJson(runtime.stdout, result);
          return;
        }

        runtime.stdout.write(`Updated work item ${result.id}\n`);
      } catch (error) {
        writeError(runtime.stderr, error);
        throw error;
      }
    });

  workItem
    .command("comment")
    .description("Comment on a work item")
    .argument("<ref>", "Work-item UUID or numeric sequence")
    .requiredOption("--body <text>", "Comment text")
    .option("--workspace <slug>", "Override workspace slug")
    .option("--project <id-or-key>", "Override project UUID or key")
    .option("--json", "Print JSON output")
    .action(async (ref: string, options) => {
      try {
        const result = await workItems.comment(ref, options.body, {
          projectRef: options.project,
          workspaceSlug: options.workspace,
        });

        if (options.json) {
          writeJson(runtime.stdout, result);
          return;
        }

        runtime.stdout.write(`Commented on work item ${result.issue ?? ref}\n`);
      } catch (error) {
        writeError(runtime.stderr, error);
        throw error;
      }
    });

  return workItem;
}
