import type { PlaneHttpClient } from "./http-client.js";
import type { PaginatedResponse } from "./types.js";

export interface PlaneAttachment {
	id: string;
	created_at: string;
	updated_at: string;
	name: string;
	size: number;
	type: string;
	asset: string;
	description: string | null;
	created_by: string;
	updated_by: string;
	project: string;
	workspace: string;
	issue: string;
}

export class AttachmentsApi {
	constructor(private readonly client: PlaneHttpClient) {}

	async list(
		workspaceSlug: string,
		projectId: string,
		workItemId: string,
	): Promise<PaginatedResponse<PlaneAttachment>> {
		return this.client.requestJson<PaginatedResponse<PlaneAttachment>>(
			`/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/work-items/${workItemId}/attachments/`,
		);
	}

	async delete(
		workspaceSlug: string,
		projectId: string,
		workItemId: string,
		attachmentId: string,
	): Promise<void> {
		await this.client.requestJson<null>(
			`/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/work-items/${workItemId}/attachments/${attachmentId}/`,
			{ method: "DELETE" },
		);
	}
}
