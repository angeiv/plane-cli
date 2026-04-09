import { z } from "zod";

export const InstanceConfigSchema = z.object({
  baseUrl: z.string().url(),
  apiKey: z.string().min(1),
  workspaceSlug: z.string().min(1).optional(),
  defaultProjectId: z.string().uuid().optional(),
});

export const PlaneCliConfigSchema = z.object({
  currentInstance: z.string().min(1),
  instances: z.record(z.string(), InstanceConfigSchema),
});

export type InstanceConfig = z.infer<typeof InstanceConfigSchema>;
export type PlaneCliConfig = z.infer<typeof PlaneCliConfigSchema>;

export function createEmptyConfig(): PlaneCliConfig {
  return {
    currentInstance: "default",
    instances: {},
  };
}
