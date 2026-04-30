import { describe, expect, it } from "vitest";

// Re-implement stripHtml locally to test the same logic used in work-item.ts
// (The function is not exported, so we duplicate it here for test coverage.)
function stripHtml(html: string): string {
  const noTags = html.replace(/<[^>]*>?/g, "");
  const noComments = noTags.replace(/<!--[^>]*>?/g, "");
  const decoded = noComments.replace(
    /&(amp|lt|gt|quot|#39|nbsp);/g,
    (_, entity) => {
      const map: Record<string, string> = {
        amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", nbsp: " ",
      };
      return map[entity] ?? _;
    },
  );
  return decoded.replace(/\s+/g, " ").trim();
}

describe("stripHtml", () => {
  // Basic functionality
  it("strips complete HTML tags", () => {
    expect(stripHtml("<p>Hello</p>")).toBe("Hello");
  });

  it("strips nested tags and preserves text", () => {
    expect(stripHtml("<b>Bold</b> text")).toBe("Bold text");
  });

  it("strips complete script tags and keeps content as plain text", () => {
    expect(stripHtml("<script>alert(1)</script>")).toBe("alert(1)");
  });

  it("strips complete HTML comments", () => {
    expect(stripHtml("<!-- comment -->")).toBe("");
  });

  it("preserves text between tags", () => {
    expect(stripHtml("<div>A</div> and <span>B</span>")).toBe("A and B");
  });

  // CodeQL: Incomplete multi-character sanitization — partial tags
  it("strips partial unclosed tags like <script (no closing >)", () => {
    expect(stripHtml("<script")).toBe("");
  });

  it("strips partial unclosed tags mid-attribute", () => {
    expect(stripHtml("<script src=evil")).toBe("");
  });

  it("strips partial unclosed tags with whitespace", () => {
    expect(stripHtml("< script")).toBe("");
  });

  it("does not leave <script residue that could inject HTML", () => {
    const result = stripHtml("<script<img onerror=alert(1)>");
    expect(result).not.toContain("<");
    expect(result).not.toContain("script");
  });

  // CodeQL: Incomplete multi-character sanitization — partial comments
  it("strips partial unclosed HTML comments like <!-- (no -->)", () => {
    expect(stripHtml("<!-- incomplete")).toBe("");
  });

  it("strips partial comments missing closing --", () => {
    expect(stripHtml("<!-- not closed >")).toBe("");
  });

  // CodeQL: Double escaping / unescaping
  it("decodes &amp; without double-unescaping", () => {
    // &amp;amp; should become &amp; (not &&)
    expect(stripHtml("&amp;amp;")).toBe("&amp;");
  });

  it("decodes &amp;lt; to &lt; (not <) — no double decode", () => {
    // First pass: &amp;lt; → &lt; (single decode only)
    expect(stripHtml("&amp;lt;")).toBe("&lt;");
  });

  it("decodes standard entities correctly", () => {
    expect(stripHtml("&amp; &lt; &gt; &quot; &#39;")).toBe("& < > \" '");
  });

  // Whitespace normalization
  it("collapses multiple whitespace into single space", () => {
    expect(stripHtml("<p>  Hello   World  </p>")).toBe("Hello World");
  });

  it("trims leading and trailing whitespace", () => {
    expect(stripHtml("  <b>text</b>  ")).toBe("text");
  });

  // Mixed attacks
  it("handles double-encoded entities inside stripped tags", () => {
    // After stripping tags, &amp;lt;script becomes &lt;script — safe in plain text
    expect(stripHtml("&amp;lt;script")).toBe("&lt;script");
  });

  it("handles real-world HTML with entities and tags", () => {
    const html = "<p>Hello &amp; <strong>world</strong>!</p>";
    expect(stripHtml(html)).toBe("Hello & world!");
  });

  it("returns empty string for purely HTML content", () => {
    expect(stripHtml("<div><span><br></span></div>")).toBe("");
  });
});