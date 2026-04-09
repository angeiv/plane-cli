import { Command } from "commander";

import type { CliRuntime } from "../runtime.js";

export function createWorkItemCommand(_runtime: CliRuntime): Command {
  return new Command("work-item").description("Query and mutate Plane work items");
}
