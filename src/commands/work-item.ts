import { Command } from "commander";
import { ConfigStore } from "../config/config-store.js";
import { writeError } from "../output/errors.js";
import { resolveFormat, writeFormatted } from "../output/format.js";
import { writeJson } from "../output/json.js";
import { formatTable } from "../output/table.js";
import type { RelationType } from "../plane/relations-api.js";
import type { CliRuntime } from "../runtime.js";
import { CycleService } from "../services/cycle-service.js";
import { ModuleService } from "../services/module-service.js";
import { WorkItemService } from "../services/work-item-service.js";

function collectValues(value: string, previous: string[]): string[] {
	return [...previous, value];
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
				const headers = ["SEQ", "NAME", "PRIORITY"];
				const rows = items.map((item) => [
					String(item.sequence_id ?? "?"),
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
				const headers = ["FIELD", "VALUE"];
				const rows = [
					["id", result.id],
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

				runtime.stdout.write(`Created work item ${result.id}`);
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

				runtime.stdout.write(`Updated work item ${result.id}`);
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
					formatTable(
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

	// ===== Activity =====
	workItem
		.command("activity")
		.description("List activity history for a work item")
		.argument("<ref>", "Work-item UUID or numeric sequence")
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
		.option("--template <expr>", "Go template expression")
		.option("--jq <expr>", "JQ expression")
		.action(async (ref: string, options) => {
			try {
				const activities = await workItems.listActivities(ref, {
					projectRef: options.project,
					workspaceSlug: options.workspace,
				});
				const limit = Number(options.limit);
				const items = limit > 0 ? activities.slice(0, limit) : activities;

				const format = resolveFormat(options);
				const headers = ["VERB", "FIELD", "OLD", "NEW", "ACTOR", "DATE"];
				const rows = items.map((a) => [
					a.verb,
					a.field ?? "-",
					(a.old_value ?? "-").slice(0, 30),
					(a.new_value ?? "-").slice(0, 30),
					a.actor.slice(0, 8),
					a.created_at.slice(0, 16),
				]);

				writeFormatted(
					runtime.stdout,
					format,
					{ headers, rows, data: { results: items } },
					options.template,
					options.jq,
				);
			} catch (error) {
				writeError(runtime.stderr, error);
				throw error;
			}
		});

	// ===== Link =====
	workItem
		.command("link")
		.description("Manage links on a work item")
		.addCommand(
			new Command("list")
				.description("List links on a work item")
				.argument("<ref>", "Work-item UUID or numeric sequence")
				.option("--workspace <slug>", "Override workspace slug")
				.option("--project <id-or-key>", "Override project UUID or key")
				.option("--json", "Print JSON output")
				.action(async (ref: string, options) => {
					try {
						const links = await workItems.listLinks(ref, {
							projectRef: options.project,
							workspaceSlug: options.workspace,
						});
						if (options.json) {
							writeJson(runtime.stdout, { results: links });
							return;
						}
						runtime.stdout.write(
							formatTable(
								["ID", "TITLE", "URL"],
								links.map((l) => [
									l.id.slice(0, 8),
									l.title,
									l.url.slice(0, 60),
								]),
							),
						);
					} catch (error) {
						writeError(runtime.stderr, error);
						throw error;
					}
				}),
		)
		.addCommand(
			new Command("add")
				.description("Add a link to a work item")
				.argument("<ref>", "Work-item UUID or numeric sequence")
				.requiredOption("--url <url>", "Link URL")
				.option("--title <title>", "Link title")
				.option("--workspace <slug>", "Override workspace slug")
				.option("--project <id-or-key>", "Override project UUID or key")
				.option("--json", "Print JSON output")
				.action(async (ref: string, options) => {
					try {
						const result = await workItems.addLink(
							ref,
							options.url,
							options.title,
							{
								projectRef: options.project,
								workspaceSlug: options.workspace,
							},
						);
						if (options.json) {
							writeJson(runtime.stdout, result);
							return;
						}
						runtime.stdout.write(`Added link ${result.id} (${result.title})\n`);
					} catch (error) {
						writeError(runtime.stderr, error);
						throw error;
					}
				}),
		)
		.addCommand(
			new Command("remove")
				.description("Remove a link from a work item")
				.argument("<ref>", "Work-item UUID or numeric sequence")
				.argument("<link-id>", "Link UUID")
				.option("--workspace <slug>", "Override workspace slug")
				.option("--project <id-or-key>", "Override project UUID or key")
				.action(async (ref: string, linkId: string, options) => {
					try {
						await workItems.removeLink(ref, linkId, {
							projectRef: options.project,
							workspaceSlug: options.workspace,
						});
						runtime.stdout.write(`Removed link ${linkId}\n`);
					} catch (error) {
						writeError(runtime.stderr, error);
						throw error;
					}
				}),
		);

	// ===== Relation =====
	const RELATION_TYPES = [
		"blocking",
		"blocked_by",
		"duplicate",
		"relates_to",
		"start_after",
		"start_before",
		"finish_after",
		"finish_before",
	] as const;

	workItem
		.command("relation")
		.description("Manage relations between work items")
		.addCommand(
			new Command("list")
				.description("List relations on a work item")
				.argument("<ref>", "Work-item UUID or numeric sequence")
				.option("--workspace <slug>", "Override workspace slug")
				.option("--project <id-or-key>", "Override project UUID or key")
				.option("--json", "Print JSON output")
				.action(async (ref: string, options) => {
					try {
						const grouped = await workItems.listRelations(ref, {
							projectRef: options.project,
							workspaceSlug: options.workspace,
						});
						if (options.json) {
							writeJson(runtime.stdout, grouped);
							return;
						}
						const rows: string[][] = [];
						for (const [type, relations] of Object.entries(grouped)) {
							for (const r of relations) {
								rows.push([
									type,
									r.id.slice(0, 8),
									r.related_issue.slice(0, 8),
								]);
							}
						}
						runtime.stdout.write(formatTable(["TYPE", "ID", "RELATED"], rows));
					} catch (error) {
						writeError(runtime.stderr, error);
						throw error;
					}
				}),
		)
		.addCommand(
			new Command("add")
				.description("Add a relation between work items")
				.argument("<ref>", "Work-item UUID or numeric sequence")
				.requiredOption(
					"--type <type>",
					`Relation type: ${RELATION_TYPES.join("/")}`,
				)
				.requiredOption("--related <ref>", "Related work item UUID or sequence")
				.option("--workspace <slug>", "Override workspace slug")
				.option("--project <id-or-key>", "Override project UUID or key")
				.option("--json", "Print JSON output")
				.action(async (ref: string, options) => {
					try {
						const result = await workItems.addRelation(
							ref,
							options.type as RelationType,
							options.related,
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
							`Added relation ${options.type} → ${options.related}\n`,
						);
					} catch (error) {
						writeError(runtime.stderr, error);
						throw error;
					}
				}),
		)
		.addCommand(
			new Command("remove")
				.description("Remove a relation")
				.argument("<ref>", "Work-item UUID or numeric sequence")
				.argument("<relation-id>", "Relation UUID")
				.option("--workspace <slug>", "Override workspace slug")
				.option("--project <id-or-key>", "Override project UUID or key")
				.action(async (ref: string, relationId: string, options) => {
					try {
						await workItems.removeRelation(ref, relationId, {
							projectRef: options.project,
							workspaceSlug: options.workspace,
						});
						runtime.stdout.write(`Removed relation ${relationId}\n`);
					} catch (error) {
						writeError(runtime.stderr, error);
						throw error;
					}
				}),
		);

	// ===== Attach =====
	workItem
		.command("attach")
		.description("Manage attachments on a work item")
		.addCommand(
			new Command("list")
				.description("List attachments on a work item")
				.argument("<ref>", "Work-item UUID or numeric sequence")
				.option("--workspace <slug>", "Override workspace slug")
				.option("--project <id-or-key>", "Override project UUID or key")
				.option("--json", "Print JSON output")
				.action(async (ref: string, options) => {
					try {
						const attachments = await workItems.listAttachments(ref, {
							projectRef: options.project,
							workspaceSlug: options.workspace,
						});
						if (options.json) {
							writeJson(runtime.stdout, { results: attachments });
							return;
						}
						runtime.stdout.write(
							formatTable(
								["ID", "NAME", "SIZE", "TYPE", "CREATED"],
								attachments.map((a) => [
									a.id.slice(0, 8),
									a.name,
									String(a.size),
									a.type,
									a.created_at.slice(0, 16),
								]),
							),
						);
					} catch (error) {
						writeError(runtime.stderr, error);
						throw error;
					}
				}),
		)
		.addCommand(
			new Command("delete")
				.description("Delete an attachment")
				.argument("<ref>", "Work-item UUID or numeric sequence")
				.argument("<attachment-id>", "Attachment UUID")
				.option("--workspace <slug>", "Override workspace slug")
				.option("--project <id-or-key>", "Override project UUID or key")
				.action(async (ref: string, attachmentId: string, options) => {
					try {
						await workItems.deleteAttachment(ref, attachmentId, {
							projectRef: options.project,
							workspaceSlug: options.workspace,
						});
						runtime.stdout.write(`Deleted attachment ${attachmentId}\n`);
					} catch (error) {
						writeError(runtime.stderr, error);
						throw error;
					}
				}),
		);

	return workItem;
}
