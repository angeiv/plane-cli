import type { PlaneComment } from "./types.js";

import { PlaneHttpClient } from "./http-client.js";

export class CommentsApi {
  constructor(private readonly client: PlaneHttpClient) {}

  async create(workspaceSlug: string, projectId: string, workItemId: string, commentHtml: string): Promise<PlaneComment> {
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
}
