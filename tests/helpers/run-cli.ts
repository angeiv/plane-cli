export interface RunCliResult {
  stdout: string;
  stderr: string;
}

export async function runCli(argv: string[], options: { fetchImpl?: typeof fetch; configDir?: string; prompts?: string[] } = {}): Promise<RunCliResult> {
  const stdout: string[] = [];
  const stderr: string[] = [];

  const { createCli } = await import("../../src/cli.js");

  const prompts = [...(options.prompts ?? [])];
  const cli = createCli({
    fetchImpl: options.fetchImpl,
    configDir: options.configDir,
    stdout: { write: (chunk: string) => void stdout.push(chunk) },
    stderr: { write: (chunk: string) => void stderr.push(chunk) },
    promptText: async () => {
      const value = prompts.shift();

      if (typeof value !== "string") {
        throw new Error("Unexpected prompt during test execution");
      }

      return value;
    }
  });

  await cli.parseAsync(["node", "plane", ...argv], { from: "node" });

  return {
    stdout: stdout.join(""),
    stderr: stderr.join("")
  };
}
