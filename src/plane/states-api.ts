import type { PaginatedResponse, PlaneState } from "./types.js";

import { PlaneHttpClient } from "./http-client.js";

export class StatesApi {
  constructor(private readonly client: PlaneHttpClient) {}

  async list(workspaceSlug: string, projectId: string): Promise<PaginatedResponse<PlaneState>> {
    return this.client.requestJson<PaginatedResponse<PlaneState>>(
      `/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/states/`,
    );
  }
}
