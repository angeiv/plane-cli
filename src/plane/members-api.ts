import type { PlaneHttpClient } from "./http-client.js";
import type { PlaneMember } from "./types.js";

export class MembersApi {
	constructor(private readonly client: PlaneHttpClient) {}

	async list(workspaceSlug: string): Promise<PlaneMember[]> {
		return this.client.requestJson<PlaneMember[]>(
			`/api/v1/workspaces/${workspaceSlug}/members/`,
		);
	}

	async listProjectMembers(
		workspaceSlug: string,
		projectId: string,
	): Promise<PlaneMember[]> {
		return this.client.requestJson<PlaneMember[]>(
			`/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/project-members/`,
		);
	}
}
