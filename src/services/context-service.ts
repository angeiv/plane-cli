import { ConfigStore } from "../config/config-store.js";
import type { InstanceConfig } from "../config/config-schema.js";
import { CliError } from "../plane/errors.js";

export class ContextService {
  constructor(private readonly store: ConfigStore) {}

  async getCurrentInstance(): Promise<InstanceConfig> {
    const instance = await this.store.getCurrentInstance();

    if (!instance) {
      throw new CliError("MISSING_AUTH", "No active Plane authentication is configured.");
    }

    return instance;
  }

  async requireWorkspaceSlug(): Promise<string> {
    const instance = await this.getCurrentInstance();

    if (!instance.workspaceSlug) {
      throw new CliError("MISSING_WORKSPACE", "No workspace configured. Run `plane workspace use <slug>` first.");
    }

    return instance.workspaceSlug;
  }

  async requireProjectId(): Promise<string> {
    const instance = await this.getCurrentInstance();

    if (!instance.defaultProjectId) {
      throw new CliError("MISSING_PROJECT", "No default project configured. Run `plane project use <id|key>` first.");
    }

    return instance.defaultProjectId;
  }
}
