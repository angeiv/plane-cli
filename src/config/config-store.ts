import { mkdir, readFile, writeFile } from "node:fs/promises";

import { getConfigDir, getConfigPath } from "./config-path.js";
import { createEmptyConfig, type InstanceConfig, PlaneCliConfigSchema, type PlaneCliConfig } from "./config-schema.js";

export class ConfigStore {
  constructor(private readonly explicitConfigDir?: string) {}

  get configDir(): string {
    return getConfigDir(this.explicitConfigDir);
  }

  get configPath(): string {
    return getConfigPath(this.explicitConfigDir);
  }

  async load(): Promise<PlaneCliConfig> {
    try {
      const rawConfig = await readFile(this.configPath, "utf8");
      return PlaneCliConfigSchema.parse(JSON.parse(rawConfig));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return createEmptyConfig();
      }

      throw error;
    }
  }

  async save(config: PlaneCliConfig): Promise<void> {
    await mkdir(this.configDir, { recursive: true });
    await writeFile(this.configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  }

  async updateCurrentInstance(instanceConfig: InstanceConfig): Promise<PlaneCliConfig> {
    const config = await this.load();
    const currentInstance = config.currentInstance || "default";

    const nextConfig: PlaneCliConfig = {
      currentInstance,
      instances: {
        ...config.instances,
        [currentInstance]: instanceConfig,
      },
    };

    await this.save(nextConfig);

    return nextConfig;
  }

  async getCurrentInstance(): Promise<InstanceConfig | null> {
    const config = await this.load();
    return config.instances[config.currentInstance] ?? null;
  }
}
