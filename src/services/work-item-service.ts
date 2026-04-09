import { ConfigStore } from "../config/config-store.js";
import { CliError } from "../plane/errors.js";
import { PlaneHttpClient } from "../plane/http-client.js";
import type { PaginatedResponse, PlaneWorkItem } from "../plane/types.js";
import { WorkItemsApi } from "../plane/work-items-api.js";

import { ContextService } from "./context-service.js";
import { ProjectService } from "./project-service.js";

export interface WorkItemContextOverrides {
  projectRef?: string;
  workspaceSlug?: string;
}

export interface ListWorkItemsInput extends WorkItemContextOverrides {
  cursor?: string;
  limit?: number;
}

export class WorkItemService {
  private readonly contextService: ContextService;
  private readonly projectService: ProjectService;

  constructor(
    private readonly store: ConfigStore,
    private readonly fetchImpl?: typeof fetch,
  ) {
    this.contextService = new ContextService(store);
    this.projectService = new ProjectService(store, fetchImpl);
  }

  async list(input: ListWorkItemsInput = {}): Promise<PaginatedResponse<PlaneWorkItem>> {
    const { api, workspaceSlug, projectId } = await this.resolveContext(input);

    return api.list(workspaceSlug, projectId, {
      cursor: input.cursor,
      perPage: input.limit,
    });
  }

  async view(workItemRef: string, overrides: WorkItemContextOverrides = {}): Promise<PlaneWorkItem> {
    const { api, workspaceSlug, projectId } = await this.resolveContext(overrides);
    const workItemId = await this.resolveWorkItemRef(api, workItemRef, workspaceSlug, projectId);

    return api.retrieve(workspaceSlug, projectId, workItemId);
  }

  private async resolveContext(overrides: WorkItemContextOverrides): Promise<{ api: WorkItemsApi; projectId: string; workspaceSlug: string }> {
    const instance = await this.contextService.getCurrentInstance();
    const workspaceSlug = overrides.workspaceSlug ?? instance.workspaceSlug;

    if (!workspaceSlug) {
      throw new CliError("MISSING_WORKSPACE", "No workspace configured. Run `plane workspace use <slug>` first.");
    }

    const projectId = overrides.projectRef
      ? await this.projectService.resolveProjectRef(overrides.projectRef)
      : await this.contextService.requireProjectId();

    return {
      api: new WorkItemsApi(
        new PlaneHttpClient({
          apiKey: instance.apiKey,
          baseUrl: instance.baseUrl,
          fetchImpl: this.fetchImpl,
        }),
      ),
      workspaceSlug,
      projectId,
    };
  }

  private async resolveWorkItemRef(
    api: WorkItemsApi,
    workItemRef: string,
    workspaceSlug: string,
    projectId: string,
  ): Promise<string> {
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(workItemRef)) {
      return workItemRef;
    }

    const sequenceId = Number(workItemRef);

    if (!Number.isInteger(sequenceId)) {
      throw new CliError("WORK_ITEM_NOT_FOUND", `Work item ref '${workItemRef}' could not be resolved.`);
    }

    const workItems = await api.list(workspaceSlug, projectId, { perPage: 20 });
    const match = workItems.results.find((item) => item.sequence_id === sequenceId);

    if (!match) {
      throw new CliError("WORK_ITEM_NOT_FOUND", `Work item '${workItemRef}' was not found in the active project.`);
    }

    return match.id;
  }
}
