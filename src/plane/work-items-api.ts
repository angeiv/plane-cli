import type { PaginatedResponse, PlaneWorkItem } from "./types.js";

import { PlaneHttpClient } from "./http-client.js";

export interface ListWorkItemsParams {
  cursor?: string;
  perPage?: number;
}

export class WorkItemsApi {
  constructor(private readonly client: PlaneHttpClient) {}

  async list(
    workspaceSlug: string,
    projectId: string,
    params: ListWorkItemsParams = {},
  ): Promise<PaginatedResponse<PlaneWorkItem>> {
    const query = new URLSearchParams();
    query.set("per_page", String(params.perPage ?? 20));

    if (params.cursor) {
      query.set("cursor", params.cursor);
    }

    return this.client.requestJson<PaginatedResponse<PlaneWorkItem>>(
      `/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/work-items/?${query.toString()}`,
    );
  }

  async retrieve(workspaceSlug: string, projectId: string, workItemId: string): Promise<PlaneWorkItem> {
    return this.client.requestJson<PlaneWorkItem>(
      `/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/work-items/${workItemId}/`,
    );
  }
}
