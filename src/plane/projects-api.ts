import type { PlaneHttpClient } from "./http-client.js";
import type { PaginatedResponse, PlaneProject } from "./types.js";

export class ProjectsApi {
	constructor(private readonly client: PlaneHttpClient) {}

	async list(workspaceSlug: string): Promise<PaginatedResponse<PlaneProject>> {
		return this.client.requestJson<PaginatedResponse<PlaneProject>>(
			`/api/v1/workspaces/${workspaceSlug}/projects/`,
		);
	}
}
