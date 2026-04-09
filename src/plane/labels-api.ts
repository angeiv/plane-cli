import type { PaginatedResponse, PlaneLabel } from "./types.js";

import { PlaneHttpClient } from "./http-client.js";

export class LabelsApi {
  constructor(private readonly client: PlaneHttpClient) {}

  async list(workspaceSlug: string, projectId: string): Promise<PaginatedResponse<PlaneLabel>> {
    return this.client.requestJson<PaginatedResponse<PlaneLabel>>(
      `/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/labels/`,
    );
  }
}
