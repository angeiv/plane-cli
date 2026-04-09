import type { WriterLike } from "../runtime.js";

export function formatJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function writeJson(writer: WriterLike, value: unknown): void {
  writer.write(formatJson(value));
}
