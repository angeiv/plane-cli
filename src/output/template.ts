/**
 * Minimal Go-style template renderer for CLI output.
 *
 * Supports: {{.Field}}, {{.Nested.Field}}, {{if .Field}}...{{end}}, {{range .List}}...{{end}}
 * Does NOT support: else, with, pipelines, functions, variables.
 */

interface TemplateToken {
	type: "text" | "field" | "if-start" | "if-end" | "range-start" | "range-end";
	value: string;
}

function tokenize(template: string): TemplateToken[] {
	const tokens: TemplateToken[] = [];
	const regex = /\{\{(.*?)\}\}/g;
	let lastIndex = 0;
	let match: RegExpExecArray | null = null;

	while ((match = regex.exec(template)) !== null) {
		if (match.index > lastIndex) {
			tokens.push({
				type: "text",
				value: template.slice(lastIndex, match.index),
			});
		}

		const content = match[1].trim();
		if (content.startsWith("if ")) {
			tokens.push({ type: "if-start", value: content.slice(3) });
		} else if (content === "end") {
			if (tokens.some((t) => t.type === "range-start")) {
				tokens.push({ type: "range-end", value: "" });
			} else {
				tokens.push({ type: "if-end", value: "" });
			}
		} else if (content.startsWith("range ")) {
			tokens.push({ type: "range-start", value: content.slice(6) });
		} else if (content.startsWith(".")) {
			tokens.push({ type: "field", value: content });
		}

		lastIndex = regex.lastIndex;
	}

	if (lastIndex < template.length) {
		tokens.push({ type: "text", value: template.slice(lastIndex) });
	}

	return tokens;
}

function resolveField(data: unknown, path: string): unknown {
	const parts = path.replace(/^\./, "").split(".");
	let current: unknown = data;
	for (const part of parts) {
		if (current == null || typeof current !== "object") return undefined;
		current = (current as Record<string, unknown>)[part];
	}
	return current;
}

export function renderTemplate(template: string, data: unknown): string {
	const tokens = tokenize(template);
	const output: string[] = [];
	let i = 0;

	const renderTokens = (
		scopeData: unknown,
		endAt?: "if-end" | "range-end",
	): void => {
		while (i < tokens.length) {
			const token = tokens[i++];

			if (token.type === "text") {
				output.push(token.value);
			} else if (token.type === "field") {
				const value = resolveField(scopeData, token.value);
				output.push(String(value ?? ""));
			} else if (token.type === "if-start") {
				const condition = resolveField(scopeData, token.value);
				if (condition) {
					renderTokens(scopeData, "if-end");
				} else {
					// skip until end
					while (i < tokens.length && tokens[i].type !== "if-end") i++;
					i++; // consume end
				}
			} else if (token.type === "if-end" && endAt === "if-end") {
				return;
			} else if (token.type === "range-start") {
				const list = resolveField(scopeData, token.value);
				if (Array.isArray(list)) {
					for (const item of list) {
						renderTokens(item, "range-end");
					}
				}
			} else if (token.type === "range-end" && endAt === "range-end") {
				return;
			}
		}
	};

	renderTokens(data);
	return output.join("");
}
