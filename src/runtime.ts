import { createInterface } from "node:readline/promises";
import process from "node:process";

export interface WriterLike {
  write(chunk: string): unknown;
}

export interface CliDependencies {
  configDir?: string;
  fetchImpl?: typeof fetch;
  promptText?: (label: string) => Promise<string>;
  stderr?: WriterLike;
  stdout?: WriterLike;
}

export interface CliRuntime {
  configDir?: string;
  fetchImpl: typeof fetch;
  promptText: (label: string) => Promise<string>;
  stderr: WriterLike;
  stdout: WriterLike;
}

async function defaultPromptText(label: string): Promise<string> {
  const readline = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    return (await readline.question(label)).trim();
  } finally {
    readline.close();
  }
}

export function createRuntime(dependencies: CliDependencies = {}): CliRuntime {
  return {
    configDir: dependencies.configDir,
    fetchImpl: dependencies.fetchImpl ?? fetch,
    promptText: dependencies.promptText ?? defaultPromptText,
    stderr: dependencies.stderr ?? process.stderr,
    stdout: dependencies.stdout ?? process.stdout,
  };
}
