import type { ConfigStore } from "../config/config-store.js";
import { PlaneHttpClient } from "../plane/http-client.js";
import { LabelsApi } from "../plane/labels-api.js";

import { ContextService } from "./context-service.js";
import { ProjectService } from "./project-service.js";

export interface LabelContextOverrides {
	projectRef?: string;
	workspaceSlug?: string;
}

export class LabelService {
	private readonly contextService: ContextService;
	private readonly projectService: ProjectService;

	constructor(
		private readonly store: ConfigStore,
		private readonly fetchImpl?: typeof fetch,
	) {
		this.contextService = new ContextService(store);
		this.projectService = new ProjectService(store, fetchImpl);
	}

	private async resolveContext(overrides: LabelContextOverrides) {
		const instance = await this.contextService.getCurrentInstance();
		const workspaceSlug = overrides.workspaceSlug ?? instance.workspaceSlug;

		if (!workspaceSlug) {
			throw new Error(
				"No workspace configured. Run `plane workspace use <slug>` first.",
			);
		}

		const projectId = overrides.projectRef
			? await this.projectService.resolveProjectRef(overrides.projectRef)
			: await this.contextService.requireProjectId();

		const client = new PlaneHttpClient({
			apiKey: instance.apiKey,
			baseUrl: instance.baseUrl,
			fetchImpl: this.fetchImpl,
		});

		return { api: new LabelsApi(client), workspaceSlug, projectId };
	}

	async list(overrides: LabelContextOverrides = {}) {
		const { api, workspaceSlug, projectId } =
			await this.resolveContext(overrides);
		return api.list(workspaceSlug, projectId);
	}

	async create(
		name: string,
		color?: string,
		description?: string,
		overrides: LabelContextOverrides = {},
	) {
		const { api, workspaceSlug, projectId } =
			await this.resolveContext(overrides);
		return api.create(workspaceSlug, projectId, { name, color, description });
	}

	async delete(labelRef: string, overrides: LabelContextOverrides = {}) {
		const { api, workspaceSlug, projectId } =
			await this.resolveContext(overrides);

		// If not a UUID, resolve by name
		const UUID_RE =
			/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
		let labelId = labelRef;

		if (!UUID_RE.test(labelRef)) {
			const labels = await api.list(workspaceSlug, projectId);
			const match = labels.results.find(
				(l) => l.name.toLowerCase() === labelRef.toLowerCase(),
			);
			if (!match) throw new Error(`Label '${labelRef}' not found.`);
			labelId = match.id;
		}

		return api.delete(workspaceSlug, projectId, labelId);
	}
}
