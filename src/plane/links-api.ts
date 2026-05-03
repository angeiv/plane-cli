import type { PlaneHttpClient } from "./http-client.js";
import type { PaginatedResponse } from "./types.js";

export interface PlaneLink {
	id: string;
	created_at: string;
	updated_at: string;
	title: string;
	url: string;
	metadata: Record<string, unknown>;
	created_by: string;
	updated_by: string;
	project: string;
	workspace: string;
	issue: string;
}

export interface CreateLinkPayload {
	url: string;
	title?: string;
}

export class LinksApi {
	constructor(private readonly client: PlaneHttpClient) {}

	async list(
		workspaceSlug: string,
		projectId: string,
		workItemId: string,
	): Promise<PaginatedResponse<PlaneLink>> {
		return this.client.requestJson<PaginatedResponse<PlaneLink>>(
			`/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/work-items/${workItemId}/links/`,
		);
	}

	async create(
		workspaceSlug: string,
		projectId: string,
		workItemId: string,
		payload: CreateLinkPayload,
	): Promise<PlaneLink> {
		return this.client.requestJson<PlaneLink>(
			`/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/work-items/${workItemId}/links/`,
			{
				body: JSON.stringify(payload),
				method: "POST",
			},
		);
	}

	async retrieve(
		workspaceSlug: string,
		projectId: string,
		workItemId: string,
		linkId: string,
	): Promise<PlaneLink> {
		return this.client.requestJson<PlaneLink>(
			`/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/work-items/${workItemId}/links/${linkId}/`,
		);
	}

	async delete(
		workspaceSlug: string,
		projectId: string,
		workItemId: string,
		linkId: string,
	): Promise<void> {
		await this.client.requestJson<null>(
			`/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/work-items/${workItemId}/links/${linkId}/`,
			{ method: "DELETE" },
		);
	}
}
