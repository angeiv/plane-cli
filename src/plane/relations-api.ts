import type { PlaneHttpClient } from "./http-client.js";

export type RelationType =
	| "blocking"
	| "blocked_by"
	| "duplicate"
	| "relates_to"
	| "start_after"
	| "start_before"
	| "finish_after"
	| "finish_before";

export interface PlaneRelation {
	id: string;
	created_at: string;
	updated_at: string;
	relation_type: RelationType;
	project: string;
	workspace: string;
	issue: string;
	related_issue: string;
	created_by: string;
	updated_by: string;
}

export interface PlaneRelationGrouped {
	blocking: PlaneRelation[];
	blocked_by: PlaneRelation[];
	duplicate: PlaneRelation[];
	relates_to: PlaneRelation[];
	start_after: PlaneRelation[];
	start_before: PlaneRelation[];
	finish_after: PlaneRelation[];
	finish_before: PlaneRelation[];
}

export interface CreateRelationPayload {
	relation_type: RelationType;
	related_issue: string;
}

export class RelationsApi {
	constructor(private readonly client: PlaneHttpClient) {}

	async list(
		workspaceSlug: string,
		projectId: string,
		workItemId: string,
	): Promise<PlaneRelationGrouped> {
		return this.client.requestJson<PlaneRelationGrouped>(
			`/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/work-items/${workItemId}/relations/`,
		);
	}

	async create(
		workspaceSlug: string,
		projectId: string,
		workItemId: string,
		payload: CreateRelationPayload,
	): Promise<PlaneRelation> {
		return this.client.requestJson<PlaneRelation>(
			`/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/work-items/${workItemId}/relations/`,
			{
				body: JSON.stringify(payload),
				method: "POST",
			},
		);
	}

	async delete(
		workspaceSlug: string,
		projectId: string,
		workItemId: string,
		relationId: string,
	): Promise<void> {
		await this.client.requestJson<null>(
			`/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/work-items/${workItemId}/relations/${relationId}/`,
			{ method: "DELETE" },
		);
	}
}
