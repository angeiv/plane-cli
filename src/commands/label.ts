import { Command } from "commander";

import { writeError } from "../output/errors.js";
import { writeJson } from "../output/json.js";
import { formatTable } from "../output/table.js";
import { ConfigStore } from "../config/config-store.js";
import type { CliRuntime } from "../runtime.js";
import { LabelService } from "../services/label-service.js";
import { resolveFormat, writeFormatted } from "../output/format.js";

export function createLabelCommand(runtime: CliRuntime): Command {
  const labelService = new LabelService(new ConfigStore(runtime.configDir), runtime.fetchImpl);
  const label = new Command("label").description("Query and mutate Plane labels");

  label
    .command("list")
    .description("List labels for the active project")
    .option("--workspace <slug>", "Override workspace slug")
    .option("--project <id-or-key>", "Override project UUID or key")
    .option("--json", "Print JSON output")
    .option("--tsv", "Print TSV output")
    .option("--format <fmt>", "Output format: table/json/tsv/template/jq")
    .option("--template <expr>", "Go template expression")
    .option("--jq <expr>", "JQ expression")
    .action(async (options) => {
      try {
        const result = await labelService.list({
          projectRef: options.project,
          workspaceSlug: options.workspace,
        });

        const format = resolveFormat(options);
        const headers = ["ID", "NAME", "COLOR", "DESCRIPTION"];
        const rows = result.results.map((item) => [
          item.id.slice(0, 8),
          item.name,
          item.color ?? "-",
          (item.description ?? "-").slice(0, 40),
        ]);

        writeFormatted(runtime.stdout, format, { headers, rows, data: result }, options.template, options.jq);
      } catch (error) {
        writeError(runtime.stderr, error);
        throw error;
      }
    });

  label
    .command("create")
    .description("Create a label")
    .requiredOption("--name <name>", "Label name")
    .option("--color <hex>", "Label color (e.g. #E54545)", "#000000")
    .option("--description <text>", "Label description")
    .option("--workspace <slug>", "Override workspace slug")
    .option("--project <id-or-key>", "Override project UUID or key")
    .option("--json", "Print JSON output")
    .action(async (options) => {
      try {
        const result = await labelService.create(options.name, options.color, options.description, {
          projectRef: options.project,
          workspaceSlug: options.workspace,
        });

        if (options.json) {
          writeJson(runtime.stdout, result);
          return;
        }

        runtime.stdout.write(`Created label ${result.id.slice(0, 8)}... (${result.name})\n`);
      } catch (error) {
        writeError(runtime.stderr, error);
        throw error;
      }
    });

  label
    .command("delete")
    .description("Delete a label")
    .argument("<ref>", "Label UUID or name")
    .option("--workspace <slug>", "Override workspace slug")
    .option("--project <id-or-key>", "Override project UUID or key")
    .action(async (ref: string, options) => {
      try {
        await labelService.delete(ref, {
          projectRef: options.project,
          workspaceSlug: options.workspace,
        });

        runtime.stdout.write(`Deleted label ${ref}\n`);
      } catch (error) {
        writeError(runtime.stderr, error);
        throw error;
      }
    });

  return label;
}