import { PlaneApiError } from "./errors.js";

export interface PlaneHttpClientOptions {
  apiKey: string;
  baseUrl: string;
  fetchImpl?: typeof fetch;
}

function joinUrl(baseUrl: string, resourcePath: string): string {
  return `${baseUrl.replace(/\/+$/, "")}${resourcePath.startsWith("/") ? resourcePath : `/${resourcePath}`}`;
}

export class PlaneHttpClient {
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: PlaneHttpClientOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async requestJson<T>(resourcePath: string, init?: RequestInit): Promise<T> {
    const response = await this.fetchImpl(joinUrl(this.options.baseUrl, resourcePath), {
      ...init,
      headers: {
        "content-type": "application/json",
        "x-api-key": this.options.apiKey,
        ...(init?.headers ?? {}),
      },
    });

    const rawBody = await response.text();
    const parsedBody = rawBody.length > 0 ? JSON.parse(rawBody) : null;

    if (!response.ok) {
      throw new PlaneApiError(
        `Plane API request failed with status ${response.status}`,
        response.status,
        parsedBody,
      );
    }

    return parsedBody as T;
  }
}
