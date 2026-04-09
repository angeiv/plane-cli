import type { PaginatedResponse, PlaneWorkItem } from "./types.js";

import { PlaneHttpClient } from "./http-client.js";

export interface ListWorkItemsParams {
  cursor?: string;
  perPage?: number;
}

export interface UpsertWorkItemPayload {
  assignees?: string[];
  description_html?: string;
  name?: string;
  priority?: string;
  state?: string;
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

  async create(workspaceSlug: string, projectId: string, payload: UpsertWorkItemPayload): Promise<PlaneWorkItem> {
    return this.client.requestJson<PlaneWorkItem>(
      `/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/work-items/`,
      {
        body: JSON.stringify(payload),
        method: "POST",
      },
    );
  }

  async update(
    workspaceSlug: string,
    projectId: string,
    workItemId: string,
    payload: UpsertWorkItemPayload,
  ): Promise<PlaneWorkItem> {
    return this.client.requestJson<PlaneWorkItem>(
      `/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/work-items/${workItemId}/`,
      {
        body: JSON.stringify(payload),
        method: "PATCH",
      },
    );
  }

  async delete(workspaceSlug: string, projectId: string, workItemId: string): Promise<void> {
    await this.client.requestJson<null>(
      `/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/work-items/${workItemId}/`,
      {
        method: "DELETE",
      },
    );
  }
}
