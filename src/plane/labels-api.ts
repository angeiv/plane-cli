import type { PlaneHttpClient } from "./http-client.js";
import type { PaginatedResponse, PlaneLabel } from "./types.js";

export interface CreateLabelPayload {
	name: string;
	color?: string;
	description?: string;
	parent?: string;
}

export class LabelsApi {
	constructor(private readonly client: PlaneHttpClient) {}

	async list(
		workspaceSlug: string,
		projectId: string,
	): Promise<PaginatedResponse<PlaneLabel>> {
		return this.client.requestJson<PaginatedResponse<PlaneLabel>>(
			`/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/labels/`,
		);
	}

	async create(
		workspaceSlug: string,
		projectId: string,
		payload: CreateLabelPayload,
	): Promise<PlaneLabel> {
		return this.client.requestJson<PlaneLabel>(
			`/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/labels/`,
			{
				body: JSON.stringify(payload),
				method: "POST",
			},
		);
	}

	async delete(
		workspaceSlug: string,
		projectId: string,
		labelId: string,
	): Promise<void> {
		await this.client.requestJson<null>(
			`/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/labels/${labelId}/`,
			{
				method: "DELETE",
			},
		);
	}
}
