import os from "node:os";
import path from "node:path";

export function getConfigDir(explicitConfigDir?: string): string {
  return explicitConfigDir
    ?? process.env.PLANE_CLI_CONFIG_DIR
    ?? path.join(os.homedir(), ".config", "plane-cli");
}

export function getConfigPath(explicitConfigDir?: string): string {
  return path.join(getConfigDir(explicitConfigDir), "config.json");
}
