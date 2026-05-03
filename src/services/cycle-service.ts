import type { ConfigStore } from "../config/config-store.js";
import { CyclesApi, type UpdateCyclePayload } from "../plane/cycles-api.js";
import { CliError } from "../plane/errors.js";
import { PlaneHttpClient } from "../plane/http-client.js";
import type { PaginatedResponse, PlaneCycle } from "../plane/types.js";

import { ContextService } from "./context-service.js";
import { collectUpToLimit, findByPagination } from "./pagination.js";
import { ProjectService } from "./project-service.js";

export interface CycleContextOverrides {
	projectRef?: string;
	workspaceSlug?: string;
}

export interface ListCyclesInput extends CycleContextOverrides {
	limit?: number;
}

export interface MutateCycleInput extends CycleContextOverrides {
	name?: string;
	description?: string;
	start_date?: string;
	end_date?: string;
	owned_by?: string;
}

export class CycleService {
	private readonly contextService: ContextService;
	private readonly projectService: ProjectService;

	constructor(
		private readonly store: ConfigStore,
		private readonly fetchImpl?: typeof fetch,
	) {
		this.contextService = new ContextService(store);
		this.projectService = new ProjectService(store, fetchImpl);
	}

	async list(input: ListCyclesInput = {}): Promise<PlaneCycle[]> {
		const { api, workspaceSlug, projectId } = await this.resolveContext(input);
		const limit = input.limit ?? 30;

		return collectUpToLimit(
			(cursor, pageSize) =>
				api.list(workspaceSlug, projectId, { cursor, perPage: pageSize }),
			limit,
		);
	}

	async view(
		cycleRef: string,
		overrides: CycleContextOverrides = {},
	): Promise<PlaneCycle> {
		const { api, workspaceSlug, projectId } =
			await this.resolveContext(overrides);
		const cycleId = await this.resolveCycleRef(
			api,
			cycleRef,
			workspaceSlug,
			projectId,
		);

		return api.retrieve(workspaceSlug, projectId, cycleId);
	}

	async create(
		input: MutateCycleInput & { name: string },
	): Promise<PlaneCycle> {
		const { api, workspaceSlug, projectId } = await this.resolveContext(input);
		const payload = {
			description: input.description,
			end_date: input.end_date,
			name: input.name,
			owned_by: input.owned_by,
			start_date: input.start_date,
		};

		return api.create(workspaceSlug, projectId, payload);
	}

	async update(cycleRef: string, input: MutateCycleInput): Promise<PlaneCycle> {
		const { api, workspaceSlug, projectId } = await this.resolveContext(input);
		const cycleId = await this.resolveCycleRef(
			api,
			cycleRef,
			workspaceSlug,
			projectId,
		);
		const payload: UpdateCyclePayload = {
			description: input.description,
			end_date: input.end_date,
			name: input.name,
			owned_by: input.owned_by,
			start_date: input.start_date,
		};

		if (Object.keys(payload).length === 0) {
			throw new CliError("EMPTY_UPDATE", "No update fields were provided.");
		}

		return api.update(workspaceSlug, projectId, cycleId, payload);
	}

	async archive(
		cycleRef: string,
		overrides: CycleContextOverrides = {},
	): Promise<PlaneCycle> {
		const { api, workspaceSlug, projectId } =
			await this.resolveContext(overrides);
		const cycleId = await this.resolveCycleRef(
			api,
			cycleRef,
			workspaceSlug,
			projectId,
		);

		return api.archive(workspaceSlug, projectId, cycleId);
	}

	async delete(
		cycleRef: string,
		overrides: CycleContextOverrides = {},
	): Promise<void> {
		const { api, workspaceSlug, projectId } =
			await this.resolveContext(overrides);
		const cycleId = await this.resolveCycleRef(
			api,
			cycleRef,
			workspaceSlug,
			projectId,
		);
		await api.delete(workspaceSlug, projectId, cycleId);
	}

	async addIssues(
		cycleRef: string,
		issueRefs: string[],
		overrides: CycleContextOverrides = {},
	): Promise<Array<{ id: string; issue: string; cycle: string }>> {
		const { api, client, workspaceSlug, projectId } =
			await this.resolveContext(overrides);
		const cycleId = await this.resolveCycleRef(
			api,
			cycleRef,
			workspaceSlug,
			projectId,
		);
		const issueIds = await this.resolveIssueIds(
			client,
			workspaceSlug,
			projectId,
			issueRefs,
		);

		return api.addIssues(workspaceSlug, projectId, cycleId, issueIds);
	}

	async removeIssues(
		cycleRef: string,
		issueRefs: string[],
		overrides: CycleContextOverrides = {},
	): Promise<void> {
		const { api, client, workspaceSlug, projectId } =
			await this.resolveContext(overrides);
		const cycleId = await this.resolveCycleRef(
			api,
			cycleRef,
			workspaceSlug,
			projectId,
		);
		const issueIds = await this.resolveIssueIds(
			client,
			workspaceSlug,
			projectId,
			issueRefs,
		);

		return api.removeIssues(workspaceSlug, projectId, cycleId, issueIds);
	}

	private async resolveContext(overrides: CycleContextOverrides): Promise<{
		api: CyclesApi;
		client: PlaneHttpClient;
		workspaceSlug: string;
		projectId: string;
	}> {
		const instance = await this.contextService.getCurrentInstance();
		const workspaceSlug = overrides.workspaceSlug ?? instance.workspaceSlug;

		if (!workspaceSlug) {
			throw new CliError(
				"MISSING_WORKSPACE",
				"No workspace configured. Run `plane workspace use <slug>` first.",
			);
		}

		const projectId = overrides.projectRef
			? await this.projectService.resolveProjectRef(overrides.projectRef)
			: await this.contextService.requireProjectId();

		const client = new PlaneHttpClient({
			apiKey: instance.apiKey,
			baseUrl: instance.baseUrl,
			fetchImpl: this.fetchImpl,
		});

		return {
			api: new CyclesApi(client),
			client,
			workspaceSlug,
			projectId,
		};
	}

	private async resolveCycleRef(
		api: CyclesApi,
		cycleRef: string,
		workspaceSlug: string,
		projectId: string,
	): Promise<string> {
		if (
			/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
				cycleRef,
			)
		) {
			return cycleRef;
		}

		// Short UUID prefix match (8+ hex chars, no dashes)
		if (/^[0-9a-f]{8,}$/i.test(cycleRef)) {
			return this.resolveByPrefix(
				api,
				cycleRef,
				workspaceSlug,
				projectId,
				"cycle",
				"CYCLE_NOT_FOUND",
				"CYCLE_AMBIGUOUS",
			);
		}

		const match = await findByPagination(
			(cursor) => api.list(workspaceSlug, projectId, { cursor, perPage: 50 }),
			(item) =>
				item.name.toLowerCase() === cycleRef.toLowerCase() ? item : undefined,
		);

		if (!match) {
			throw new CliError(
				"CYCLE_NOT_FOUND",
				`Cycle '${cycleRef}' was not found in the active project.`,
			);
		}

		return match.id;
	}

	private async resolveIssueIds(
		client: PlaneHttpClient,
		workspaceSlug: string,
		projectId: string,
		issueRefs: string[],
	): Promise<string[]> {
		const { WorkItemsApi } = await import("../plane/work-items-api.js");
		const workItemsApi = new WorkItemsApi(client);

		return Promise.all(
			issueRefs.map(async (ref) => {
				if (
					/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
						ref,
					)
				) {
					return ref;
				}

				// Short UUID prefix match (8+ hex chars, no dashes)
				if (/^[0-9a-f]{8,}$/i.test(ref)) {
					return this.resolveByPrefix(
						workItemsApi,
						ref,
						workspaceSlug,
						projectId,
						"work item",
						"WORK_ITEM_NOT_FOUND",
						"WORK_ITEM_AMBIGUOUS",
					);
				}

				const sequenceId = Number(ref);
				if (!Number.isInteger(sequenceId)) {
					throw new CliError(
						"WORK_ITEM_NOT_FOUND",
						`Work item ref '${ref}' could not be resolved.`,
					);
				}

				const match = await findByPagination(
					(cursor) =>
						workItemsApi.list(workspaceSlug, projectId, {
							cursor,
							perPage: 50,
						}),
					(item) => (item.sequence_id === sequenceId ? item : undefined),
				);

				if (!match) {
					throw new CliError(
						"WORK_ITEM_NOT_FOUND",
						`Work item '${ref}' was not found in the active project.`,
					);
				}

				return match.id;
			}),
		);
	}

	private async resolveByPrefix<T extends { id: string; name?: string }>(
		api: {
			list: (
				ws: string,
				pid: string,
				p: { cursor?: string; perPage: number },
			) => Promise<PaginatedResponse<T>>;
		},
		prefix: string,
		workspaceSlug: string,
		projectId: string,
		singular: string,
		notFoundCode: string,
		ambiguousCode: string,
	): Promise<string> {
		const all: T[] = [];
		let cursor: string | undefined;
		do {
			const page = await api.list(workspaceSlug, projectId, {
				cursor,
				perPage: 50,
			});
			all.push(...page.results);
			cursor = page.next_cursor ?? undefined;
			if (!page.next_page_results) break;
		} while (cursor);

		const matches = all.filter((item) =>
			item.id.toLowerCase().startsWith(prefix.toLowerCase()),
		);

		if (matches.length === 0) {
			throw new CliError(
				notFoundCode,
				`${singular.charAt(0).toUpperCase() + singular.slice(1)} '${prefix}' was not found in the active project.`,
			);
		}

		if (matches.length > 1) {
			const ids = matches.map((m) => m.id.slice(0, 8)).join(", ");
			throw new CliError(
				ambiguousCode,
				`Prefix '${prefix}' matches multiple ${singular}s: ${ids}. Use a longer prefix or the full UUID.`,
			);
		}

		return matches[0].id;
	}
}
