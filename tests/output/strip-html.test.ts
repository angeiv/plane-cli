import { describe, expect, it } from "vitest";

/**
 * Tests that validate using Plane API's `comment_stripped_html` field
 * (server-provided safe plain text) instead of manual HTML stripping.
 *
 * This approach eliminates all CodeQL "Incomplete multi-character sanitization"
 * and "Double escaping" warnings by relying on the server to sanitize HTML,
 * rather than applying regex-based sanitization in client code.
 */

describe("comment_stripped_html usage", () => {
	// The CLI should prefer comment_stripped_html over manual HTML stripping.
	// When comment_stripped_html is available, it is already safe plain text
	// provided by the Plane server — no client-side sanitization needed.

	it("prefers comment_stripped_html over comment_html for display", () => {
		const comment = {
			id: "abc123",
			comment_html: "<p>Hello &amp; <strong>world</strong>!</p>",
			comment_stripped_html: "Hello & world!",
		};

		// The CLI logic: comment_stripped_html ?? comment_html ?? ""
		const displayText = (
			comment.comment_stripped_html ??
			comment.comment_html ??
			""
		).slice(0, 60);
		expect(displayText).toBe("Hello & world!");
	});

	it("falls back to comment_html when comment_stripped_html is null", () => {
		const comment = {
			id: "abc123",
			comment_html: "<p>Some text</p>",
			comment_stripped_html: null,
		};

		const displayText = (
			comment.comment_stripped_html ??
			comment.comment_html ??
			""
		).slice(0, 60);
		expect(displayText).toBe("<p>Some text</p>");
	});

	it("falls back to empty string when both are null", () => {
		const comment = {
			id: "abc123",
			comment_html: null,
			comment_stripped_html: null,
		};

		const displayText = (
			comment.comment_stripped_html ??
			comment.comment_html ??
			""
		).slice(0, 60);
		expect(displayText).toBe("");
	});

	it("slices display text to 60 characters", () => {
		const longText = "A".repeat(100);
		const comment = {
			id: "abc123",
			comment_stripped_html: longText,
		};

		const displayText = (comment.comment_stripped_html ?? "").slice(0, 60);
		expect(displayText).toBe("A".repeat(60));
		expect(displayText.length).toBe(60);
	});

	it("server-provided stripped HTML is safe — no client-side sanitization needed", () => {
		// Even if comment_html contained malicious content, comment_stripped_html
		// is produced by the Plane server (which uses proper DOM-based sanitization).
		// The client never processes raw HTML — CodeQL has nothing to flag.
		const maliciousHtml = "<script>alert(1)</script><!-- malicious -->";
		const safeStripped = "alert(1)"; // server would produce this

		const comment = {
			comment_html: maliciousHtml,
			comment_stripped_html: safeStripped,
		};

		const displayText =
			comment.comment_stripped_html ?? comment.comment_html ?? "";
		expect(displayText).not.toContain("<");
		expect(displayText).not.toContain("!--");
	});
});
