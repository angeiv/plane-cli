import type { PlaneHttpClient } from "./http-client.js";
import type { PaginatedResponse, PlaneCycle } from "./types.js";

export interface PlaneCycleIssue {
	id: string;
	issue: string;
	cycle: string;
	project: string;
	workspace: string;
	created_at: string;
	updated_at: string;
}

export interface ListCyclesParams {
	cursor?: string;
	perPage?: number;
}

export interface CreateCyclePayload {
	name: string;
	project_id: string;
	description?: string;
	start_date?: string;
	end_date?: string;
	owned_by?: string;
}

export interface UpdateCyclePayload {
	name?: string;
	description?: string;
	start_date?: string;
	end_date?: string;
	owned_by?: string;
}

export class CyclesApi {
	constructor(private readonly client: PlaneHttpClient) {}

	async list(
		workspaceSlug: string,
		projectId: string,
		params: ListCyclesParams = {},
	): Promise<PaginatedResponse<PlaneCycle>> {
		const query = new URLSearchParams();
		query.set("per_page", String(params.perPage ?? 20));

		if (params.cursor) {
			query.set("cursor", params.cursor);
		}

		return this.client.requestJson<PaginatedResponse<PlaneCycle>>(
			`/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/cycles/?${query.toString()}`,
		);
	}

	async retrieve(
		workspaceSlug: string,
		projectId: string,
		cycleId: string,
	): Promise<PlaneCycle> {
		return this.client.requestJson<PlaneCycle>(
			`/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/cycles/${cycleId}/`,
		);
	}

	async create(
		workspaceSlug: string,
		projectId: string,
		payload: Omit<CreateCyclePayload, "project_id">,
	): Promise<PlaneCycle> {
		return this.client.requestJson<PlaneCycle>(
			`/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/cycles/`,
			{
				body: JSON.stringify({ ...payload, project_id: projectId }),
				method: "POST",
			},
		);
	}

	async update(
		workspaceSlug: string,
		projectId: string,
		cycleId: string,
		payload: UpdateCyclePayload,
	): Promise<PlaneCycle> {
		return this.client.requestJson<PlaneCycle>(
			`/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/cycles/${cycleId}/`,
			{
				body: JSON.stringify(payload),
				method: "PATCH",
			},
		);
	}

	async delete(
		workspaceSlug: string,
		projectId: string,
		cycleId: string,
	): Promise<void> {
		await this.client.requestJson<null>(
			`/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/cycles/${cycleId}/`,
			{
				method: "DELETE",
			},
		);
	}

	async archive(
		workspaceSlug: string,
		projectId: string,
		cycleId: string,
	): Promise<PlaneCycle> {
		return this.client.requestJson<PlaneCycle>(
			`/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/cycles/${cycleId}/archive/`,
			{
				method: "POST",
			},
		);
	}

	async addIssues(
		workspaceSlug: string,
		projectId: string,
		cycleId: string,
		issueIds: string[],
	): Promise<Array<{ id: string; issue: string; cycle: string }>> {
		return this.client.requestJson<
			Array<{ id: string; issue: string; cycle: string }>
		>(
			`/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/cycles/${cycleId}/cycle-issues/`,
			{
				body: JSON.stringify({ issues: issueIds }),
				method: "POST",
			},
		);
	}

	async listCycleIssues(
		workspaceSlug: string,
		projectId: string,
		cycleId: string,
	): Promise<PlaneCycleIssue[]> {
		const all: PlaneCycleIssue[] = [];
		let cursor: string | undefined;
		do {
			const query = new URLSearchParams();
			query.set("per_page", "50");
			if (cursor) query.set("cursor", cursor);
			const page = await this.client.requestJson<
				PaginatedResponse<PlaneCycleIssue>
			>(
				`/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/cycles/${cycleId}/cycle-issues/?${query.toString()}`,
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
		cycleId: string,
		issueIds: string[],
	): Promise<void> {
		const cycleIssues = await this.listCycleIssues(
			workspaceSlug,
			projectId,
			cycleId,
		);
		const toRemove = cycleIssues.filter((ci) => issueIds.includes(ci.issue));
		for (const ci of toRemove) {
			await this.client.requestJson<null>(
				`/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/cycles/${cycleId}/cycle-issues/${ci.id}/`,
				{ method: "DELETE" },
			);
		}
	}
}
