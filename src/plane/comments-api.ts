import type { PlaneHttpClient } from "./http-client.js";
import type { PaginatedResponse, PlaneComment } from "./types.js";

export interface ListCommentsParams {
	cursor?: string;
	perPage?: number;
}

export class CommentsApi {
	constructor(private readonly client: PlaneHttpClient) {}

	async list(
		workspaceSlug: string,
		projectId: string,
		workItemId: string,
		params: ListCommentsParams = {},
	): Promise<PaginatedResponse<PlaneComment>> {
		const query = new URLSearchParams();
		query.set("per_page", String(params.perPage ?? 20));

		if (params.cursor) {
			query.set("cursor", params.cursor);
		}

		return this.client.requestJson<PaginatedResponse<PlaneComment>>(
			`/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/work-items/${workItemId}/comments/?${query.toString()}`,
		);
	}

	async create(
		workspaceSlug: string,
		projectId: string,
		workItemId: string,
		commentHtml: string,
	): Promise<PlaneComment> {
		return this.client.requestJson<PlaneComment>(
			`/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/work-items/${workItemId}/comments/`,
			{
				body: JSON.stringify({
					comment_html: commentHtml,
				}),
				method: "POST",
			},
		);
	}

	async update(
		workspaceSlug: string,
		projectId: string,
		workItemId: string,
		commentId: string,
		commentHtml: string,
	): Promise<PlaneComment> {
		return this.client.requestJson<PlaneComment>(
			`/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/work-items/${workItemId}/comments/${commentId}/`,
			{
				body: JSON.stringify({
					comment_html: commentHtml,
				}),
				method: "PATCH",
			},
		);
	}

	async delete(
		workspaceSlug: string,
		projectId: string,
		workItemId: string,
		commentId: string,
	): Promise<void> {
		await this.client.requestJson<null>(
			`/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/work-items/${workItemId}/comments/${commentId}/`,
			{
				method: "DELETE",
			},
		);
	}
}
