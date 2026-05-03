import type { PlaneHttpClient } from "./http-client.js";
import type { PaginatedResponse, PlaneModule } from "./types.js";

export interface PlaneModuleIssue {
	id: string;
	issue: string;
	module: string;
	project: string;
	workspace: string;
	created_at: string;
	updated_at: string;
}

export interface ListModulesParams {
	cursor?: string;
	perPage?: number;
}

export interface CreateModulePayload {
	name: string;
	project_id: string;
	description?: string;
	start_date?: string;
	target_date?: string;
	lead?: string;
	members?: string[];
	status?: string;
}

export interface UpdateModulePayload {
	name?: string;
	description?: string;
	start_date?: string;
	target_date?: string;
	lead?: string;
	members?: string[];
	status?: string;
}

export class ModulesApi {
	constructor(private readonly client: PlaneHttpClient) {}

	async list(
		workspaceSlug: string,
		projectId: string,
		params: ListModulesParams = {},
	): Promise<PaginatedResponse<PlaneModule>> {
		const query = new URLSearchParams();
		query.set("per_page", String(params.perPage ?? 20));

		if (params.cursor) {
			query.set("cursor", params.cursor);
		}

		return this.client.requestJson<PaginatedResponse<PlaneModule>>(
			`/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/modules/?${query.toString()}`,
		);
	}

	async retrieve(
		workspaceSlug: string,
		projectId: string,
		moduleId: string,
	): Promise<PlaneModule> {
		return this.client.requestJson<PlaneModule>(
			`/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/modules/${moduleId}/`,
		);
	}

	async create(
		workspaceSlug: string,
		projectId: string,
		payload: Omit<CreateModulePayload, "project_id">,
	): Promise<PlaneModule> {
		return this.client.requestJson<PlaneModule>(
			`/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/modules/`,
			{
				body: JSON.stringify({ ...payload, project_id: projectId }),
				method: "POST",
			},
		);
	}

	async update(
		workspaceSlug: string,
		projectId: string,
		moduleId: string,
		payload: UpdateModulePayload,
	): Promise<PlaneModule> {
		return this.client.requestJson<PlaneModule>(
			`/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/modules/${moduleId}/`,
			{
				body: JSON.stringify(payload),
				method: "PATCH",
			},
		);
	}

	async delete(
		workspaceSlug: string,
		projectId: string,
		moduleId: string,
	): Promise<void> {
		await this.client.requestJson<null>(
			`/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/modules/${moduleId}/`,
			{
				method: "DELETE",
			},
		);
	}

	async archive(
		workspaceSlug: string,
		projectId: string,
		moduleId: string,
	): Promise<PlaneModule> {
		return this.client.requestJson<PlaneModule>(
			`/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/modules/${moduleId}/archive/`,
			{
				method: "POST",
			},
		);
	}

	async addIssues(
		workspaceSlug: string,
		projectId: string,
		moduleId: string,
		issueIds: string[],
	): Promise<Array<{ id: string; issue: string; module: string }>> {
		return this.client.requestJson<
			Array<{ id: string; issue: string; module: string }>
		>(
			`/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/modules/${moduleId}/module-issues/`,
			{
				body: JSON.stringify({ issues: issueIds }),
				method: "POST",
			},
		);
	}

	async listModuleIssues(
		workspaceSlug: string,
		projectId: string,
		moduleId: string,
	): Promise<PlaneModuleIssue[]> {
		const all: PlaneModuleIssue[] = [];
		let cursor: string | undefined;
		do {
			const query = new URLSearchParams();
			query.set("per_page", "50");
			if (cursor) query.set("cursor", cursor);
			const page = await this.client.requestJson<
				PaginatedResponse<PlaneModuleIssue>
			>(
				`/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/modules/${moduleId}/module-issues/?${query.toString()}`,
			);
			all.push(...page.results);
			cursor = page.next_cursor ?? undefined;
			if (!page.next_page_results) break;
		} while (cursor);
		return all;
	}

	async removeIssues(
		workspaceSlug: string,
		projectId: string,
		moduleId: string,
		issueIds: string[],
	): Promise<void> {
		// Need to find the module-issue association IDs first
		const moduleIssues = await this.listModuleIssues(
			workspaceSlug,
			projectId,
			moduleId,
		);

		const toRemove = moduleIssues.filter((mi) => issueIds.includes(mi.issue));

		for (const mi of toRemove) {
			await this.client.requestJson<null>(
				`/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/modules/${moduleId}/module-issues/${mi.id}/`,
				{ method: "DELETE" },
			);
		}
	}
}
