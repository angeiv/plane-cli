import { Command } from "commander";

import type { CliRuntime } from "../runtime.js";

export function createWorkspaceCommand(_runtime: CliRuntime): Command {
  return new Command("workspace").description("Manage the active Plane workspace");
}
