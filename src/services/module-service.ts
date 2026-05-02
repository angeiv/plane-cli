import type { ConfigStore } from "../config/config-store.js";
import { CliError } from "../plane/errors.js";
import { PlaneHttpClient } from "../plane/http-client.js";
import { ModulesApi, type UpdateModulePayload } from "../plane/modules-api.js";
import type { PlaneModule } from "../plane/types.js";

import { ContextService } from "./context-service.js";
import { collectUpToLimit, findByPagination } from "./pagination.js";
import { ProjectService } from "./project-service.js";

export interface ModuleContextOverrides {
	projectRef?: string;
	workspaceSlug?: string;
}

export interface ListModulesInput extends ModuleContextOverrides {
	limit?: number;
}

export interface MutateModuleInput extends ModuleContextOverrides {
	name?: string;
	description?: string;
	start_date?: string;
	target_date?: string;
	lead?: string;
	members?: string[];
	status?: string;
}

export class ModuleService {
	private readonly contextService: ContextService;
	private readonly projectService: ProjectService;

	constructor(
		private readonly store: ConfigStore,
		private readonly fetchImpl?: typeof fetch,
	) {
		this.contextService = new ContextService(store);
		this.projectService = new ProjectService(store, fetchImpl);
	}

	async list(input: ListModulesInput = {}): Promise<PlaneModule[]> {
		const { api, workspaceSlug, projectId } = await this.resolveContext(input);
		const limit = input.limit ?? 30;

		return collectUpToLimit(
			(cursor, pageSize) =>
				api.list(workspaceSlug, projectId, { cursor, perPage: pageSize }),
			limit,
		);
	}

	async view(
		moduleRef: string,
		overrides: ModuleContextOverrides = {},
	): Promise<PlaneModule> {
		const { api, workspaceSlug, projectId } =
			await this.resolveContext(overrides);
		const moduleId = await this.resolveModuleRef(
			api,
			moduleRef,
			workspaceSlug,
			projectId,
		);

		return api.retrieve(workspaceSlug, projectId, moduleId);
	}

	async create(
		input: MutateModuleInput & { name: string },
	): Promise<PlaneModule> {
		const { api, workspaceSlug, projectId } = await this.resolveContext(input);
		const payload = {
			description: input.description,
			lead: input.lead,
			members: input.members,
			name: input.name,
			start_date: input.start_date,
			status: input.status,
			target_date: input.target_date,
		};

		return api.create(workspaceSlug, projectId, payload);
	}

	async update(
		moduleRef: string,
		input: MutateModuleInput,
	): Promise<PlaneModule> {
		const { api, workspaceSlug, projectId } = await this.resolveContext(input);
		const moduleId = await this.resolveModuleRef(
			api,
			moduleRef,
			workspaceSlug,
			projectId,
		);
		const payload: UpdateModulePayload = {
			description: input.description,
			lead: input.lead,
			members: input.members,
			name: input.name,
			start_date: input.start_date,
			status: input.status,
			target_date: input.target_date,
		};

		if (Object.keys(payload).length === 0) {
			throw new CliError("EMPTY_UPDATE", "No update fields were provided.");
		}

		return api.update(workspaceSlug, projectId, moduleId, payload);
	}

	async archive(
		moduleRef: string,
		overrides: ModuleContextOverrides = {},
	): Promise<PlaneModule> {
		const { api, workspaceSlug, projectId } =
			await this.resolveContext(overrides);
		const moduleId = await this.resolveModuleRef(
			api,
			moduleRef,
			workspaceSlug,
			projectId,
		);

		return api.archive(workspaceSlug, projectId, moduleId);
	}

	async delete(
		moduleRef: string,
		overrides: ModuleContextOverrides = {},
	): Promise<void> {
		const { api, workspaceSlug, projectId } =
			await this.resolveContext(overrides);
		const moduleId = await this.resolveModuleRef(
			api,
			moduleRef,
			workspaceSlug,
			projectId,
		);
		await api.delete(workspaceSlug, projectId, moduleId);
	}

	async addIssues(
		moduleRef: string,
		issueRefs: string[],
		overrides: ModuleContextOverrides = {},
	): Promise<Array<{ id: string; issue: string; module: string }>> {
		const { api, client, workspaceSlug, projectId } =
			await this.resolveContext(overrides);
		const moduleId = await this.resolveModuleRef(
			api,
			moduleRef,
			workspaceSlug,
			projectId,
		);
		const issueIds = await this.resolveIssueIds(
			client,
			workspaceSlug,
			projectId,
			issueRefs,
		);

		return api.addIssues(workspaceSlug, projectId, moduleId, issueIds);
	}

	async removeIssues(
		moduleRef: string,
		issueRefs: string[],
		overrides: ModuleContextOverrides = {},
	): Promise<void> {
		const { api, client, workspaceSlug, projectId } =
			await this.resolveContext(overrides);
		const moduleId = await this.resolveModuleRef(
			api,
			moduleRef,
			workspaceSlug,
			projectId,
		);
		const issueIds = await this.resolveIssueIds(
			client,
			workspaceSlug,
			projectId,
			issueRefs,
		);

		return api.removeIssues(workspaceSlug, projectId, moduleId, issueIds);
	}

	private async resolveContext(overrides: ModuleContextOverrides): Promise<{
		api: ModulesApi;
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
			api: new ModulesApi(client),
			client,
			workspaceSlug,
			projectId,
		};
	}

	private async resolveModuleRef(
		api: ModulesApi,
		moduleRef: string,
		workspaceSlug: string,
		projectId: string,
	): Promise<string> {
		if (
			/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
				moduleRef,
			)
		) {
			return moduleRef;
		}

		const match = await findByPagination(
			(cursor) => api.list(workspaceSlug, projectId, { cursor, perPage: 50 }),
			(item) =>
				item.name.toLowerCase() === moduleRef.toLowerCase() ? item : undefined,
		);

		if (!match) {
			throw new CliError(
				"MODULE_NOT_FOUND",
				`Module '${moduleRef}' was not found in the active project.`,
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
}
