import { Command } from "commander";
import { ConfigStore } from "../config/config-store.js";
import { writeError } from "../output/errors.js";
import { resolveFormat, writeFormatted } from "../output/format.js";
import { writeJson } from "../output/json.js";
import { formatKvView, formatTabList } from "../output/table.js";
import type { CliRuntime } from "../runtime.js";
import { CycleService } from "../services/cycle-service.js";
import { ModuleService } from "../services/module-service.js";
import { WorkItemService } from "../services/work-item-service.js";

function collectValues(value: string, previous: string[]): string[] {
	return [...previous, value];
}

function shortId(id: string): string {
	return id.length > 8 ? id.slice(0, 8) : id;
}

function parseParentRef(value: string | undefined): string | null | undefined {
	if (value === undefined) {
		return undefined;
	}

	if (value.toLowerCase() === "none" || value.toLowerCase() === "null") {
		return null;
	}

	return value;
}

export function createWorkItemCommand(runtime: CliRuntime): Command {
	const store = new ConfigStore(runtime.configDir);
	const workItems = new WorkItemService(store, runtime.fetchImpl);
	const cycleService = new CycleService(store, runtime.fetchImpl);
	const moduleService = new ModuleService(store, runtime.fetchImpl);
	const workItem = new Command("work-item").description(
		"Query and mutate Plane work items",
	);

	workItem
		.command("list")
		.description("List work items for the active project")
		.option(
			"-L, --limit <number>",
			"Maximum number of items to fetch (0 for all)",
			"30",
		)
		.option("--workspace <slug>", "Override workspace slug")
		.option("--project <id-or-key>", "Override project UUID or key")
		.option("--json", "Print JSON output")
		.option("--tsv", "Print TSV output")
		.option("--format <fmt>", "Output format: table/json/tsv/template/jq")
		.option("--template <expr>", "Go template expression (e.g. '{{.name}}')")
		.option("--jq <expr>", "JQ expression (e.g. '.results[].name')")
		.action(async (options) => {
			try {
				const items = await workItems.list({
					limit: Number(options.limit),
					projectRef: options.project,
					workspaceSlug: options.workspace,
				});

				const format = resolveFormat(options);
				if (format === "table") {
					const headers = ["SEQ", "ID", "NAME", "PRIORITY"];
					const rows = items.map((item) => [
						String(item.sequence_id ?? "?"),
						item.id.slice(0, 8),
						item.name,
						item.priority ?? "none",
					]);
					runtime.stdout.write(formatTabList(headers, rows));
				} else {
					const headers = ["SEQ", "ID", "SHORT_ID", "NAME", "PRIORITY"];
					const rows = items.map((item) => [
						String(item.sequence_id ?? "?"),
						item.id,
						item.id.slice(0, 8),
						item.name,
						item.priority ?? "none",
					]);
					writeFormatted(
						runtime.stdout,
						format,
						{ headers, rows, data: { results: items } },
						options.template,
						options.jq,
					);
				}
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
		.option("--tsv", "Print TSV output")
		.option("--format <fmt>", "Output format: table/json/tsv/template/jq")
		.option("--template <expr>", "Go template expression")
		.option("--jq <expr>", "JQ expression")
		.action(async (ref: string, options) => {
			try {
				const result = await workItems.view(ref, {
					projectRef: options.project,
					workspaceSlug: options.workspace,
				});

				const format = resolveFormat(options);
				if (format === "table") {
					runtime.stdout.write(
						formatKvView([
							["id", shortId(result.id)],
							["sequence", String(result.sequence_id ?? "?")],
							["name", result.name],
							["priority", result.priority ?? "none"],
						]),
					);
					runtime.stdout.write("\n");
				} else {
					const headers = ["FIELD", "VALUE"];
					const rows = [
						["id", shortId(result.id)],
						["sequence", String(result.sequence_id ?? "?")],
						["name", result.name],
						["priority", result.priority ?? "none"],
					];
					writeFormatted(
						runtime.stdout,
						format,
						{ headers, rows, data: result },
						options.template,
						options.jq,
					);
				}
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
		.option(
			"--assignee <value>",
			"Assignee email, display name, or UUID",
			collectValues,
			[],
		)
		.option("--label <value>", "Label name or UUID", collectValues, [])
		.option("--description <text>", "Description text")
		.option("--start-date <date>", "Start date (YYYY-MM-DD)")
		.option("--target-date <date>", "Target date (YYYY-MM-DD)")
		.option(
			"--parent <ref>",
			"Parent work item UUID or sequence ID (use 'none' to clear)",
		)
		.option("--cycle <ref>", "Cycle UUID or name to add the work item to")
		.option("--module <ref>", "Module UUID or name to add the work item to")
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
					start_date: options.startDate,
					target_date: options.targetDate,
					parent: parseParentRef(options.parent),
					workspaceSlug: options.workspace,
				});

				const ctxOverrides = {
					projectRef: options.project,
					workspaceSlug: options.workspace,
				};

				if (options.cycle) {
					await cycleService.addIssues(
						options.cycle,
						[String(result.sequence_id)],
						ctxOverrides,
					);
				}

				if (options.module) {
					await moduleService.addIssues(
						options.module,
						[String(result.sequence_id)],
						ctxOverrides,
					);
				}

				if (options.json) {
					writeJson(runtime.stdout, result);
					return;
				}

				runtime.stdout.write(
					`Created work item ${result.sequence_id} (id: ${shortId(result.id)})`,
				);
				if (options.cycle)
					runtime.stdout.write(` (added to cycle ${options.cycle})`);
				if (options.module)
					runtime.stdout.write(` (added to module ${options.module})`);
				runtime.stdout.write("\n");
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
		.option(
			"--assignee <value>",
			"Assignee email, display name, or UUID",
			collectValues,
			[],
		)
		.option("--label <value>", "Label name or UUID", collectValues, [])
		.option("--description <text>", "Description text")
		.option("--start-date <date>", "Start date (YYYY-MM-DD)")
		.option("--target-date <date>", "Target date (YYYY-MM-DD)")
		.option(
			"--parent <ref>",
			"Parent work item UUID or sequence ID (use 'none' to clear)",
		)
		.option("--cycle <ref>", "Cycle UUID or name to add the work item to")
		.option("--module <ref>", "Module UUID or name to add the work item to")
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
					start_date: options.startDate,
					target_date: options.targetDate,
					parent: parseParentRef(options.parent),
					workspaceSlug: options.workspace,
				});

				const ctxOverrides = {
					projectRef: options.project,
					workspaceSlug: options.workspace,
				};

				if (options.cycle) {
					await cycleService.addIssues(
						options.cycle,
						[String(result.sequence_id)],
						ctxOverrides,
					);
				}

				if (options.module) {
					await moduleService.addIssues(
						options.module,
						[String(result.sequence_id)],
						ctxOverrides,
					);
				}

				if (options.json) {
					writeJson(runtime.stdout, result);
					return;
				}

				runtime.stdout.write(
					`Updated work item ${result.sequence_id} (id: ${shortId(result.id)})`,
				);
				if (options.cycle)
					runtime.stdout.write(` (added to cycle ${options.cycle})`);
				if (options.module)
					runtime.stdout.write(` (added to module ${options.module})`);
				runtime.stdout.write("\n");
			} catch (error) {
				writeError(runtime.stderr, error);
				throw error;
			}
		});

	workItem
		.command("comment")
		.description("Add a comment to a work item")
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

	workItem
		.command("list-comments")
		.description("List comments on a work item")
		.argument("<ref>", "Work-item UUID or numeric sequence")
		.option(
			"-L, --limit <number>",
			"Maximum number of items to fetch (0 for all)",
			"30",
		)
		.option("--workspace <slug>", "Override workspace slug")
		.option("--project <id-or-key>", "Override project UUID or key")
		.option("--json", "Print JSON output")
		.action(async (ref: string, options) => {
			try {
				const result = await workItems.listComments(
					ref,
					{
						perPage: Number(options.limit),
					},
					{
						projectRef: options.project,
						workspaceSlug: options.workspace,
					},
				);

				if (options.json) {
					writeJson(runtime.stdout, result);
					return;
				}

				runtime.stdout.write(
					formatTabList(
						["ID", "AUTHOR", "CREATED", "CONTENT"],
						result.results.map((item) => [
							item.id.slice(0, 8),
							item.actor_detail?.display_name ?? item.actor ?? "-",
							(item.created_at ?? "-").slice(0, 16),
							(item.comment_stripped_html ?? item.comment_html ?? "").slice(
								0,
								60,
							),
						]),
					),
				);
			} catch (error) {
				writeError(runtime.stderr, error);
				throw error;
			}
		});

	workItem
		.command("update-comment")
		.description("Update a comment on a work item")
		.argument("<ref>", "Work-item UUID or numeric sequence")
		.argument("<comment-id>", "Comment UUID")
		.requiredOption("--body <text>", "Updated comment text")
		.option("--workspace <slug>", "Override workspace slug")
		.option("--project <id-or-key>", "Override project UUID or key")
		.option("--json", "Print JSON output")
		.action(async (ref: string, commentId: string, options) => {
			try {
				const result = await workItems.updateComment(
					ref,
					commentId,
					options.body,
					{
						projectRef: options.project,
						workspaceSlug: options.workspace,
					},
				);

				if (options.json) {
					writeJson(runtime.stdout, result);
					return;
				}

				runtime.stdout.write(`Updated comment ${result.id}\n`);
			} catch (error) {
				writeError(runtime.stderr, error);
				throw error;
			}
		});

	workItem
		.command("delete-comment")
		.description("Delete a comment on a work item")
		.argument("<ref>", "Work-item UUID or numeric sequence")
		.argument("<comment-id>", "Comment UUID")
		.option("--workspace <slug>", "Override workspace slug")
		.option("--project <id-or-key>", "Override project UUID or key")
		.action(async (ref: string, commentId: string, options) => {
			try {
				await workItems.deleteComment(ref, commentId, {
					projectRef: options.project,
					workspaceSlug: options.workspace,
				});

				runtime.stdout.write(`Deleted comment ${commentId}\n`);
			} catch (error) {
				writeError(runtime.stderr, error);
				throw error;
			}
		});

	workItem
		.command("delete")
		.description("Delete a work item")
		.argument("<ref>", "Work-item UUID or numeric sequence")
		.option("--workspace <slug>", "Override workspace slug")
		.option("--project <id-or-key>", "Override project UUID or key")
		.action(async (ref: string, options) => {
			try {
				await workItems.delete(ref, {
					projectRef: options.project,
					workspaceSlug: options.workspace,
				});

				runtime.stdout.write(`Deleted work item ${ref}\n`);
			} catch (error) {
				writeError(runtime.stderr, error);
				throw error;
			}
		});

	return workItem;
}
