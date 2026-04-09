import { ConfigStore } from "../config/config-store.js";
import type { PlaneProject } from "../plane/types.js";
import { CliError } from "../plane/errors.js";
import { PlaneHttpClient } from "../plane/http-client.js";
import { ProjectsApi } from "../plane/projects-api.js";

export class ProjectService {
  constructor(
    private readonly store: ConfigStore,
    private readonly fetchImpl?: typeof fetch,
  ) {}

  async listProjects(): Promise<PlaneProject[]> {
    const instance = await this.store.getCurrentInstance();

    if (!instance) {
      throw new CliError("MISSING_AUTH", "No active Plane authentication is configured.");
    }

    if (!instance.workspaceSlug) {
      throw new CliError("MISSING_WORKSPACE", "No workspace configured. Run `plane workspace use <slug>` first.");
    }

    const api = new ProjectsApi(
      new PlaneHttpClient({
        apiKey: instance.apiKey,
        baseUrl: instance.baseUrl,
        fetchImpl: this.fetchImpl,
      }),
    );

    const response = await api.list(instance.workspaceSlug);
    return response.results;
  }

  async resolveProjectRef(projectRef: string): Promise<string> {
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(projectRef)) {
      return projectRef;
    }

    const projects = await this.listProjects();
    const project = projects.find((item) => item.identifier === projectRef || item.name === projectRef);

    if (!project) {
      throw new CliError("PROJECT_NOT_FOUND", `Project '${projectRef}' was not found in the active workspace.`);
    }

    return project.id;
  }

  async setDefaultProject(projectRef: string): Promise<string> {
    const projectId = await this.resolveProjectRef(projectRef);
    await this.store.patchCurrentInstance({ defaultProjectId: projectId });
    return projectId;
  }

  async setWorkspace(workspaceSlug: string): Promise<void> {
    await this.store.patchCurrentInstance({ workspaceSlug });
  }
}
