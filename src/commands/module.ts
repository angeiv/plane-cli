import { Command } from "commander";
import { ConfigStore } from "../config/config-store.js";
import { writeError } from "../output/errors.js";
import { resolveFormat, writeFormatted } from "../output/format.js";
import { writeJson } from "../output/json.js";
import { formatTable } from "../output/table.js";
import { PlaneHttpClient } from "../plane/http-client.js";

import { MembersApi } from "../plane/members-api.js";
import type { CliRuntime } from "../runtime.js";
import { ContextService } from "../services/context-service.js";
import { ModuleService } from "../services/module-service.js";

function collectValues(value: string, previous: string[]): string[] {
	return [...previous, value];
}

const MODULE_STATUS_MAP: Record<string, string> = {
	backlog: "backlog",
	planned: "planned",
	"in-progress": "in-progress",
	in_progress: "in-progress",
	inprogress: "in-progress",
	paused: "paused",
	completed: "completed",
	cancelled: "cancelled",
	// 中文映射
	待办: "backlog",
	已计划: "planned",
	进行中: "in-progress",
	已暂停: "paused",
	已完成: "completed",
	已取消: "cancelled",
};

function resolveModuleStatus(value: string): string {
	const normalized = value.toLowerCase().replace(/\s+/g, "");
	const resolved = MODULE_STATUS_MAP[normalized];
	if (!resolved) {
		const validChoices =
			"backlog, planned, in-progress, paused, completed, cancelled";
		throw new Error(
			`Invalid module status '${value}'. Valid choices: ${validChoices} (or Chinese: 待办, 已计划, 进行中, 已暂停, 已完成, 已取消)`,
		);
	}
	return resolved;
}

async function resolveMemberRefs(
	store: ConfigStore,
	fetchImpl: typeof fetch | undefined,
	refs: string[],
): Promise<string[]> {
	if (refs.length === 0) return [];

	const UUID_RE =
		/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
	if (refs.every((r) => UUID_RE.test(r))) return refs;

	const contextService = new ContextService(store);
	const instance = await contextService.getCurrentInstance();
	if (!instance)
		throw new Error("No active instance. Run `plane auth login` first.");

	const client = new PlaneHttpClient({
		apiKey: instance.apiKey,
		baseUrl: instance.baseUrl,
		fetchImpl,
	});
	const membersApi = new MembersApi(client);
	const members = await membersApi.list(instance.workspaceSlug ?? "yocloud");

	return refs.map((ref) => {
		if (UUID_RE.test(ref)) return ref;
		const match = members.find(
			(m) => m.email === ref || m.display_name === ref,
		);
		if (!match)
			throw new Error(
				`Member '${ref}' not found. Use UUID, email, or display name.`,
			);
		return match.id;
	});
}

export function createModuleCommand(runtime: CliRuntime): Command {
	const moduleService = new ModuleService(
		new ConfigStore(runtime.configDir),
		runtime.fetchImpl,
	);
	const module = new Command("module").description(
		"Query and mutate Plane modules",
	);

	module
		.command("list")
		.description("List modules for the active project")
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
		.action(async (options) => {
			try {
				const items = await moduleService.list({
					limit: Number(options.limit),
					projectRef: options.project,
					workspaceSlug: options.workspace,
				});

				const format = resolveFormat(options);
				const headers = ["ID", "NAME", "STATUS", "START", "TARGET", "LEAD"];
				const rows = items.map((item) => [
					item.id.slice(0, 8),
					item.name,
					item.status ?? "none",
					item.start_date ?? "-",
					item.target_date ?? "-",
					item.lead ? item.lead.slice(0, 8) : "-",
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

	module
		.command("view")
		.description("View a single module")
		.argument("<ref>", "Module UUID or name")
		.option("--workspace <slug>", "Override workspace slug")
		.option("--project <id-or-key>", "Override project UUID or key")
		.option("--json", "Print JSON output")
		.action(async (ref: string, options) => {
			try {
				const result = await moduleService.view(ref, {
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
							["target_date", result.target_date ?? "-"],
							["lead", result.lead ?? "-"],
							[
								"members",
								result.members && result.members.length > 0
									? result.members.join(", ")
									: "-",
							],
						],
					),
				);
			} catch (error) {
				writeError(runtime.stderr, error);
				throw error;
			}
		});

	module
		.command("create")
		.description("Create a module")
		.requiredOption("--name <name>", "Module name")
		.option("--description <text>", "Module description")
		.option(
			"--status <status>",
			"Status: backlog/planned/in-progress/paused/completed/cancelled (or Chinese)",
		)
		.option("--start-date <date>", "Start date (YYYY-MM-DD)")
		.option("--target-date <date>", "Target date (YYYY-MM-DD)")
		.option("--lead <ref>", "Lead: UUID, email, or display name")
		.option(
			"--members <ref>",
			"Member: UUID, email, or display name (repeatable)",
			collectValues,
			[],
		)
		.option("--workspace <slug>", "Override workspace slug")
		.option("--project <id-or-key>", "Override project UUID or key")
		.option("--json", "Print JSON output")
		.action(async (options) => {
			try {
				const leadRefs = options.lead ? [options.lead] : [];
				const resolvedLead = await resolveMemberRefs(
					new ConfigStore(runtime.configDir),
					runtime.fetchImpl,
					leadRefs,
				);
				const resolvedMembers = await resolveMemberRefs(
					new ConfigStore(runtime.configDir),
					runtime.fetchImpl,
					options.members,
				);

				const result = await moduleService.create({
					description: options.description,
					lead: resolvedLead[0] ?? undefined,
					members: resolvedMembers.length > 0 ? resolvedMembers : undefined,
					name: options.name,
					status: options.status
						? resolveModuleStatus(options.status)
						: undefined,
					start_date: options.startDate,
					target_date: options.targetDate,
					projectRef: options.project,
					workspaceSlug: options.workspace,
				});

				if (options.json) {
					writeJson(runtime.stdout, result);
					return;
				}

				runtime.stdout.write(`Created module ${result.id} (${result.name})\n`);
			} catch (error) {
				writeError(runtime.stderr, error);
				throw error;
			}
		});

	module
		.command("update")
		.description("Update a module")
		.argument("<ref>", "Module UUID or name")
		.option("--name <name>", "Updated name")
		.option("--description <text>", "Updated description")
		.option("--start-date <date>", "Start date (YYYY-MM-DD)")
		.option("--target-date <date>", "Target date (YYYY-MM-DD)")
		.option("--lead <ref>", "Lead: UUID, email, or display name")
		.option(
			"--members <ref>",
			"Member: UUID, email, or display name (repeatable)",
			collectValues,
			[],
		)
		.option(
			"--status <status>",
			"Status: backlog/planned/in-progress/paused/completed/cancelled (or Chinese)",
		)
		.option("--workspace <slug>", "Override workspace slug")
		.option("--project <id-or-key>", "Override project UUID or key")
		.option("--json", "Print JSON output")
		.action(async (ref: string, options) => {
			try {
				const leadRefs = options.lead ? [options.lead] : [];
				const resolvedLead = await resolveMemberRefs(
					new ConfigStore(runtime.configDir),
					runtime.fetchImpl,
					leadRefs,
				);
				const resolvedMembers = await resolveMemberRefs(
					new ConfigStore(runtime.configDir),
					runtime.fetchImpl,
					options.members,
				);

				const result = await moduleService.update(ref, {
					description: options.description,
					lead: resolvedLead[0] ?? undefined,
					members: resolvedMembers.length > 0 ? resolvedMembers : undefined,
					name: options.name,
					start_date: options.startDate,
					status: options.status
						? resolveModuleStatus(options.status)
						: undefined,
					target_date: options.targetDate,
					projectRef: options.project,
					workspaceSlug: options.workspace,
				});

				if (options.json) {
					writeJson(runtime.stdout, result);
					return;
				}

				runtime.stdout.write(`Updated module ${result.id}\n`);
			} catch (error) {
				writeError(runtime.stderr, error);
				throw error;
			}
		});

	module
		.command("archive")
		.description("Archive a module")
		.argument("<ref>", "Module UUID or name")
		.option("--workspace <slug>", "Override workspace slug")
		.option("--project <id-or-key>", "Override project UUID or key")
		.option("--json", "Print JSON output")
		.action(async (ref: string, options) => {
			try {
				const result = await moduleService.archive(ref, {
					projectRef: options.project,
					workspaceSlug: options.workspace,
				});

				if (options.json) {
					writeJson(runtime.stdout, result);
					return;
				}

				runtime.stdout.write(`Archived module ${result.id}\n`);
			} catch (error) {
				writeError(runtime.stderr, error);
				throw error;
			}
		});

	module
		.command("delete")
		.description("Delete a module")
		.argument("<ref>", "Module UUID or name")
		.option("--workspace <slug>", "Override workspace slug")
		.option("--project <id-or-key>", "Override project UUID or key")
		.action(async (ref: string, options) => {
			try {
				await moduleService.delete(ref, {
					projectRef: options.project,
					workspaceSlug: options.workspace,
				});

				runtime.stdout.write(`Deleted module ${ref}\n`);
			} catch (error) {
				writeError(runtime.stderr, error);
				throw error;
			}
		});

	module
		.command("add-issue")
		.description("Add work items to a module")
		.argument("<ref>", "Module UUID or name")
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
				const result = await moduleService.addIssues(ref, options.issue, {
					projectRef: options.project,
					workspaceSlug: options.workspace,
				});

				if (options.json) {
					writeJson(runtime.stdout, result);
					return;
				}

				runtime.stdout.write(
					`Added ${result.length} issue(s) to module ${ref}\n`,
				);
			} catch (error) {
				writeError(runtime.stderr, error);
				throw error;
			}
		});

	module
		.command("remove-issue")
		.description("Remove work items from a module")
		.argument("<ref>", "Module UUID or name")
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
				await moduleService.removeIssues(ref, options.issue, {
					projectRef: options.project,
					workspaceSlug: options.workspace,
				});

				runtime.stdout.write(
					`Removed ${options.issue.length} issue(s) from module ${ref}\n`,
				);
			} catch (error) {
				writeError(runtime.stderr, error);
				throw error;
			}
		});

	return module;
}
