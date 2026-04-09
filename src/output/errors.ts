import type { WriterLike } from "../runtime.js";

import { CliError, PlaneApiError } from "../plane/errors.js";

export function renderError(error: unknown): string {
  if (error instanceof CliError) {
    return `${error.message}\n`;
  }

  if (error instanceof PlaneApiError) {
    return `Plane API error (${error.status}): ${JSON.stringify(error.payload)}\n`;
  }

  if (error instanceof Error) {
    return `${error.message}\n`;
  }

  return `${String(error)}\n`;
}

export function writeError(writer: WriterLike, error: unknown): void {
  writer.write(renderError(error));
}
