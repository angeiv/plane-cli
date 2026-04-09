import { Command } from "commander";

import { writeError } from "../output/errors.js";
import { writeJson } from "../output/json.js";
import { ConfigStore } from "../config/config-store.js";
import type { CliRuntime } from "../runtime.js";
import { AuthService } from "../services/auth-service.js";

async function requireValue(value: string | undefined, label: string, runtime: CliRuntime): Promise<string> {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  return runtime.promptText(label);
}

export function createAuthCommand(runtime: CliRuntime): Command {
  const authService = new AuthService(new ConfigStore(runtime.configDir), runtime.fetchImpl);
  const auth = new Command("auth").description("Manage Plane authentication");

  auth
    .command("login")
    .description("Save authentication settings")
    .option("--base-url <url>", "Plane base URL")
    .option("--api-key <token>", "Plane personal access token")
    .option("--workspace <slug>", "Default workspace slug")
    .option("--project <uuid>", "Default project UUID")
    .option("--json", "Print JSON output")
    .action(async (options) => {
      try {
        const status = await authService.login({
          apiKey: await requireValue(options.apiKey, "Plane API key: ", runtime),
          baseUrl: await requireValue(options.baseUrl, "Plane base URL: ", runtime),
          defaultProjectId: options.project,
          workspaceSlug: options.workspace,
        });

        if (options.json) {
          writeJson(runtime.stdout, status);
          return;
        }

        runtime.stdout.write(`Authentication saved for ${status.baseUrl}\n`);
      } catch (error) {
        writeError(runtime.stderr, error);
        throw error;
      }
    });

  auth
    .command("status")
    .description("Check the active authentication settings")
    .option("--json", "Print JSON output")
    .action(async (options) => {
      try {
        const status = await authService.getStatus();

        if (options.json) {
          writeJson(runtime.stdout, status);
          return;
        }

        runtime.stdout.write(`Connected to ${status.baseUrl}\n`);
      } catch (error) {
        writeError(runtime.stderr, error);
        throw error;
      }
    });

  return auth;
}
