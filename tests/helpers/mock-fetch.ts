import { vi } from "vitest";

export interface MockJsonResponseOptions {
  body: unknown;
  ok?: boolean;
  status?: number;
  statusText?: string;
}

export function createMockFetch({ body, ok = true, status = 200, statusText = "OK" }: MockJsonResponseOptions) {
  return vi.fn(async () =>
    new Response(JSON.stringify(body), {
      status,
      statusText,
      headers: {
        "content-type": "application/json"
      }
    }),
  ) as unknown as typeof fetch;
}
