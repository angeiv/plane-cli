import { Command } from "commander";

import type { CliRuntime } from "../runtime.js";

export function createProjectCommand(_runtime: CliRuntime): Command {
  return new Command("project").description("List and select Plane projects");
}
