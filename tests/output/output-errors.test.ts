import { describe, expect, it } from "vitest";

import { formatJson } from "../../src/output/json.js";
import { renderError } from "../../src/output/errors.js";
import { CliError } from "../../src/plane/errors.js";

describe("output helpers", () => {
  it("renders configuration errors without stack noise", () => {
    const text = renderError(new CliError("MISSING_WORKSPACE", "No workspace configured"));

    expect(text).toContain("No workspace configured");
    expect(text).not.toContain("stack");
  });

  it("renders stable pretty JSON output", () => {
    expect(formatJson({ ok: true })).toBe('{\n  "ok": true\n}\n');
  });
});
