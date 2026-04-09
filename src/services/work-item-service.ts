import { ConfigStore } from "../config/config-store.js";
import { CliError } from "../plane/errors.js";
import { PlaneHttpClient } from "../plane/http-client.js";
import type { PaginatedResponse, PlaneComment, PlaneLabel, PlaneState, PlaneWorkItem } from "../plane/types.js";
import { CommentsApi } from "../plane/comments-api.js";
import { LabelsApi } from "../plane/labels-api.js";
import { MembersApi } from "../plane/members-api.js";
import { StatesApi } from "../plane/states-api.js";
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

export interface MutateWorkItemInput extends WorkItemContextOverrides {
  assignees?: string[];
  description?: string;
  labels?: string[];
  name?: string;
  priority?: string;
  state?: string;
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

  async create(input: MutateWorkItemInput & { name: string }): Promise<PlaneWorkItem> {
    const { api, client, workspaceSlug, projectId } = await this.resolveContext(input);
    const payload = await this.buildMutationPayload(client, workspaceSlug, projectId, input);

    return api.create(workspaceSlug, projectId, payload);
  }

  async update(workItemRef: string, input: MutateWorkItemInput): Promise<PlaneWorkItem> {
    const { api, client, workspaceSlug, projectId } = await this.resolveContext(input);
    const workItemId = await this.resolveWorkItemRef(api, workItemRef, workspaceSlug, projectId);
    const payload = await this.buildMutationPayload(client, workspaceSlug, projectId, input);

    if (Object.keys(payload).length === 0) {
      throw new CliError("EMPTY_UPDATE", "No update fields were provided.");
    }

    return api.update(workspaceSlug, projectId, workItemId, payload);
  }

  async comment(workItemRef: string, body: string, overrides: WorkItemContextOverrides = {}): Promise<PlaneComment> {
    const { api, client, workspaceSlug, projectId } = await this.resolveContext(overrides);
    const workItemId = await this.resolveWorkItemRef(api, workItemRef, workspaceSlug, projectId);
    const commentsApi = new CommentsApi(client);

    return commentsApi.create(workspaceSlug, projectId, workItemId, this.ensureHtmlParagraph(body));
  }

  async delete(workItemRef: string, overrides: WorkItemContextOverrides = {}): Promise<void> {
    const { api, workspaceSlug, projectId } = await this.resolveContext(overrides);
    const workItemId = await this.resolveWorkItemRef(api, workItemRef, workspaceSlug, projectId);
    await api.delete(workspaceSlug, projectId, workItemId);
  }

  private async resolveContext(
    overrides: WorkItemContextOverrides,
  ): Promise<{ api: WorkItemsApi; client: PlaneHttpClient; projectId: string; workspaceSlug: string }> {
    const instance = await this.contextService.getCurrentInstance();
    const workspaceSlug = overrides.workspaceSlug ?? instance.workspaceSlug;

    if (!workspaceSlug) {
      throw new CliError("MISSING_WORKSPACE", "No workspace configured. Run `plane workspace use <slug>` first.");
    }

    const projectId = overrides.projectRef
      ? await this.projectService.resolveProjectRef(overrides.projectRef)
      : await this.contextService.requireProjectId();

    const client = new PlaneHttpClient({
      apiKey: instance.apiKey,
      baseUrl: instance.baseUrl,
      fetchImpl: this.fetchImpl,
    });

    return {
      api: new WorkItemsApi(client),
      client,
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

  private async buildMutationPayload(
    client: PlaneHttpClient,
    workspaceSlug: string,
    projectId: string,
    input: MutateWorkItemInput,
  ): Promise<Record<string, unknown>> {
    const payload: Record<string, unknown> = {};

    if (input.name) {
      payload.name = input.name;
    }

    if (input.priority) {
      payload.priority = input.priority;
    }

    if (input.description) {
      payload.description_html = this.ensureHtmlParagraph(input.description);
    }

    if (input.state) {
      payload.state = await this.resolveState(client, workspaceSlug, projectId, input.state);
    }

    if (input.assignees && input.assignees.length > 0) {
      payload.assignees = await this.resolveAssignees(client, workspaceSlug, projectId, input.assignees);
    }

    if (input.labels && input.labels.length > 0) {
      payload.labels = await this.resolveLabels(client, workspaceSlug, projectId, input.labels);
    }

    return payload;
  }

  private ensureHtmlParagraph(text: string): string {
    return text.trim().startsWith("<") ? text.trim() : `<p>${text.trim()}</p>`;
  }

  private async resolveState(client: PlaneHttpClient, workspaceSlug: string, projectId: string, stateRef: string): Promise<string> {
    if (this.looksLikeUuid(stateRef)) {
      return stateRef;
    }

    const states = await new StatesApi(client).list(workspaceSlug, projectId);
    const state = this.findByName(states.results, stateRef);

    if (!state) {
      throw new CliError("STATE_NOT_FOUND", `State '${stateRef}' was not found in the active project.`);
    }

    return state.id;
  }

  private async resolveAssignees(
    client: PlaneHttpClient,
    workspaceSlug: string,
    projectId: string,
    assigneeRefs: string[],
  ): Promise<string[]> {
    const projectMembers = await new MembersApi(client).listProjectMembers(workspaceSlug, projectId);

    return assigneeRefs.map((ref) => {
      if (this.looksLikeUuid(ref)) {
        return ref;
      }

      const member = projectMembers.find((item) => item.email === ref || item.display_name === ref);

      if (!member) {
        throw new CliError("ASSIGNEE_NOT_FOUND", `Assignee '${ref}' was not found in the active project.`);
      }

      return member.id;
    });
  }

  private async resolveLabels(
    client: PlaneHttpClient,
    workspaceSlug: string,
    projectId: string,
    labelRefs: string[],
  ): Promise<string[]> {
    const labels = await new LabelsApi(client).list(workspaceSlug, projectId);

    return labelRefs.map((ref) => {
      if (this.looksLikeUuid(ref)) {
        return ref;
      }

      const label = this.findByName(labels.results, ref);

      if (!label) {
        throw new CliError("LABEL_NOT_FOUND", `Label '${ref}' was not found in the active project.`);
      }

      return label.id;
    });
  }

  private findByName<T extends PlaneState | PlaneLabel>(items: T[], ref: string): T | undefined {
    const normalizedRef = ref.toLowerCase();
    return items.find((item) => item.name.toLowerCase() === normalizedRef);
  }

  private looksLikeUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }
}
