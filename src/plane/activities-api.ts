import type { PlaneHttpClient } from "./http-client.js";
import type { PaginatedResponse } from "./types.js";

export interface PlaneActivity {
	id: string;
	created_at: string;
	updated_at: string;
	verb: string;
	field: string | null;
	old_value: string | null;
	new_value: string | null;
	comment: string | null;
	old_identifier: string | null;
	new_identifier: string | null;
	epoch: number;
	issue: string;
	actor: string;
	issue_comment: string | null;
	attachments: unknown[];
	project: string;
	workspace: string;
}

export interface ListActivitiesParams {
	perPage?: number;
	cursor?: string;
}

export class ActivitiesApi {
	constructor(private readonly client: PlaneHttpClient) {}

	async list(
		workspaceSlug: string,
		projectId: string,
		workItemId: string,
		params: ListActivitiesParams = {},
	): Promise<PaginatedResponse<PlaneActivity>> {
		const query = new URLSearchParams();
		query.set("per_page", String(params.perPage ?? 20));
		if (params.cursor) query.set("cursor", params.cursor);
		return this.client.requestJson<PaginatedResponse<PlaneActivity>>(
			`/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/work-items/${workItemId}/activities/?${query.toString()}`,
		);
	}
}
