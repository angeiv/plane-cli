import { ConfigStore } from "../config/config-store.js";
import { type InstanceConfig } from "../config/config-schema.js";
import { CliError } from "../plane/errors.js";
import { PlaneHttpClient } from "../plane/http-client.js";

export interface AuthLoginInput {
  apiKey: string;
  baseUrl: string;
  defaultProjectId?: string;
  workspaceSlug?: string;
}

export interface AuthStatus {
  baseUrl: string;
  defaultProjectId?: string;
  ok: boolean;
  user: unknown;
  workspaceSlug?: string;
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

export class AuthService {
  constructor(
    private readonly store: ConfigStore,
    private readonly fetchImpl?: typeof fetch,
  ) {}

  async login(input: AuthLoginInput): Promise<AuthStatus> {
    const instanceConfig: InstanceConfig = {
      apiKey: input.apiKey,
      baseUrl: normalizeBaseUrl(input.baseUrl),
      defaultProjectId: input.defaultProjectId,
      workspaceSlug: input.workspaceSlug,
    };

    const status = await this.validateInstance(instanceConfig);
    await this.store.updateCurrentInstance(instanceConfig);

    return status;
  }

  async getStatus(): Promise<AuthStatus> {
    const instance = await this.store.getCurrentInstance();

    if (!instance) {
      throw new CliError("MISSING_AUTH", "No active Plane authentication is configured.");
    }

    return this.validateInstance(instance);
  }

  private async validateInstance(instance: InstanceConfig): Promise<AuthStatus> {
    const client = new PlaneHttpClient({
      apiKey: instance.apiKey,
      baseUrl: instance.baseUrl,
      fetchImpl: this.fetchImpl,
    });

    const user = await client.requestJson<unknown>("/api/v1/users/me/");

    return {
      baseUrl: instance.baseUrl,
      defaultProjectId: instance.defaultProjectId,
      ok: true,
      user,
      workspaceSlug: instance.workspaceSlug,
    };
  }
}
