import { Command } from "commander";
import { ConfigStore } from "../config/config-store.js";
import { writeError } from "../output/errors.js";
import { resolveFormat, writeFormatted } from "../output/format.js";
import { writeJson } from "../output/json.js";
import { formatTable } from "../output/table.js";
import type { CliRuntime } from "../runtime.js";
import { CycleService } from "../services/cycle-service.js";

function collectValues(value: string, previous: string[]): string[] {
	return [...previous, value];
}

export function createCycleCommand(runtime: CliRuntime): Command {
	const cycleService = new CycleService(
		new ConfigStore(runtime.configDir),
		runtime.fetchImpl,
	);
	const cycle = new Command("cycle").description(
		"Query and mutate Plane cycles",
	);

	cycle
		.command("list")
		.description("List cycles for the active project")
		.option("--limit <number>", "Results per page", "20")
		.option("--cursor <cursor>", "Pagination cursor")
		.option("--workspace <slug>", "Override workspace slug")
		.option("--project <id-or-key>", "Override project UUID or key")
		.option("--json", "Print JSON output")
		.option("--tsv", "Print TSV output")
		.option("--format <fmt>", "Output format: table/json/tsv/template/jq")
		.option("--template <expr>", "Go template expression")
		.option("--jq <expr>", "JQ expression")
		.action(async (options) => {
			try {
				const result = await cycleService.list({
					cursor: options.cursor,
					limit: Number(options.limit),
					projectRef: options.project,
					workspaceSlug: options.workspace,
				});

				const format = resolveFormat(options);
				const headers = ["ID", "NAME", "STATUS", "START", "END"];
				const rows = result.results.map((item) => [
					item.id.slice(0, 8),
					item.name,
					item.status ?? "none",
					item.start_date ?? "-",
					item.end_date ?? "-",
				]);

				writeFormatted(
					runtime.stdout,
					format,
					{ headers, rows, data: result },
					options.template,
					options.jq,
				);
			} catch (error) {
				writeError(runtime.stderr, error);
				throw error;
			}
		});

	cycle
		.command("view")
		.description("View a single cycle")
		.argument("<ref>", "Cycle UUID or name")
		.option("--workspace <slug>", "Override workspace slug")
		.option("--project <id-or-key>", "Override project UUID or key")
		.option("--json", "Print JSON output")
		.action(async (ref: string, options) => {
			try {
				const result = await cycleService.view(ref, {
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
							["name", result.name],
							["status", result.status ?? "none"],
							["start_date", result.start_date ?? "-"],
							["end_date", result.end_date ?? "-"],
							["owned_by", result.owned_by ?? "-"],
						],
					),
				);
			} catch (error) {
				writeError(runtime.stderr, error);
				throw error;
			}
		});

	cycle
		.command("create")
		.description("Create a cycle")
		.requiredOption("--name <name>", "Cycle name")
		.option("--description <text>", "Cycle description")
		.option("--start-date <date>", "Start date (YYYY-MM-DD)")
		.option("--end-date <date>", "End date (YYYY-MM-DD)")
		.option("--owned-by <uuid>", "Owner UUID")
		.option("--workspace <slug>", "Override workspace slug")
		.option("--project <id-or-key>", "Override project UUID or key")
		.option("--json", "Print JSON output")
		.action(async (options) => {
			try {
				const result = await cycleService.create({
					description: options.description,
					end_date: options.endDate,
					name: options.name,
					owned_by: options.ownedBy,
					start_date: options.startDate,
					projectRef: options.project,
					workspaceSlug: options.workspace,
				});

				if (options.json) {
					writeJson(runtime.stdout, result);
					return;
				}

				runtime.stdout.write(`Created cycle ${result.id} (${result.name})\n`);
			} catch (error) {
				writeError(runtime.stderr, error);
				throw error;
			}
		});

	cycle
		.command("update")
		.description("Update a cycle")
		.argument("<ref>", "Cycle UUID or name")
		.option("--name <name>", "Updated name")
		.option("--description <text>", "Updated description")
		.option("--start-date <date>", "Start date (YYYY-MM-DD)")
		.option("--end-date <date>", "End date (YYYY-MM-DD)")
		.option("--owned-by <uuid>", "Owner UUID")
		.option("--workspace <slug>", "Override workspace slug")
		.option("--project <id-or-key>", "Override project UUID or key")
		.option("--json", "Print JSON output")
		.action(async (ref: string, options) => {
			try {
				const result = await cycleService.update(ref, {
					description: options.description,
					end_date: options.endDate,
					name: options.name,
					owned_by: options.ownedBy,
					start_date: options.startDate,
					projectRef: options.project,
					workspaceSlug: options.workspace,
				});

				if (options.json) {
					writeJson(runtime.stdout, result);
					return;
				}

				runtime.stdout.write(`Updated cycle ${result.id}\n`);
			} catch (error) {
				writeError(runtime.stderr, error);
				throw error;
			}
		});

	cycle
		.command("archive")
		.description("Archive a cycle")
		.argument("<ref>", "Cycle UUID or name")
		.option("--workspace <slug>", "Override workspace slug")
		.option("--project <id-or-key>", "Override project UUID or key")
		.option("--json", "Print JSON output")
		.action(async (ref: string, options) => {
			try {
				const result = await cycleService.archive(ref, {
					projectRef: options.project,
					workspaceSlug: options.workspace,
				});

				if (options.json) {
					writeJson(runtime.stdout, result);
					return;
				}

				runtime.stdout.write(`Archived cycle ${result.id}\n`);
			} catch (error) {
				writeError(runtime.stderr, error);
				throw error;
			}
		});

	cycle
		.command("delete")
		.description("Delete a cycle")
		.argument("<ref>", "Cycle UUID or name")
		.option("--workspace <slug>", "Override workspace slug")
		.option("--project <id-or-key>", "Override project UUID or key")
		.action(async (ref: string, options) => {
			try {
				await cycleService.delete(ref, {
					projectRef: options.project,
					workspaceSlug: options.workspace,
				});

				runtime.stdout.write(`Deleted cycle ${ref}\n`);
			} catch (error) {
				writeError(runtime.stderr, error);
				throw error;
			}
		});

	cycle
		.command("add-issue")
		.description("Add work items to a cycle")
		.argument("<ref>", "Cycle UUID or name")
		.requiredOption(
			"--issue <value>",
			"Work item UUID or sequence ID",
			collectValues,
			[],
		)
		.option("--workspace <slug>", "Override workspace slug")
		.option("--project <id-or-key>", "Override project UUID or key")
		.option("--json", "Print JSON output")
		.action(async (ref: string, options) => {
			try {
				const result = await cycleService.addIssues(ref, options.issue, {
					projectRef: options.project,
					workspaceSlug: options.workspace,
				});

				if (options.json) {
					writeJson(runtime.stdout, result);
					return;
				}

				runtime.stdout.write(
					`Added ${result.length} issue(s) to cycle ${ref}\n`,
				);
			} catch (error) {
				writeError(runtime.stderr, error);
				throw error;
			}
		});

	cycle
		.command("remove-issue")
		.description("Remove work items from a cycle")
		.argument("<ref>", "Cycle UUID or name")
		.requiredOption(
			"--issue <value>",
			"Work item UUID or sequence ID",
			collectValues,
			[],
		)
		.option("--workspace <slug>", "Override workspace slug")
		.option("--project <id-or-key>", "Override project UUID or key")
		.action(async (ref: string, options) => {
			try {
				await cycleService.removeIssues(ref, options.issue, {
					projectRef: options.project,
					workspaceSlug: options.workspace,
				});

				runtime.stdout.write(
					`Removed ${options.issue.length} issue(s) from cycle ${ref}\n`,
				);
			} catch (error) {
				writeError(runtime.stderr, error);
				throw error;
			}
		});

	return cycle;
}
