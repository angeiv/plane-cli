/**
 * Minimal JQ-like expression filter for CLI output.
 *
 * Supports:
 *   .              → identity (output entire input)
 *   .field         → select field
 *   .nested.field  → nested field access
 *   .list[]        → array iteration (flatten)
 *   .list[].field  → array iteration + field select
 *   {key: .field}  → object construction
 *
 * Does NOT support: pipes, functions, selectors, string interpolation.
 */

interface JqNode {
	type:
		| "identity"
		| "field"
		| "nested"
		| "iterate"
		| "iterate-field"
		| "object";
	fields?: string[];
	pairs?: Array<{ key: string; valuePath: string[] }>;
}

function parseJq(expr: string): JqNode {
	const trimmed = expr.trim();

	if (trimmed === ".") return { type: "identity" };

	// Object construction: {name: .field, ...}
	if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
		const inner = trimmed.slice(1, -1);
		const pairs = inner.split(",").map((pair) => {
			const [key, val] = pair.split(":").map((s) => s.trim());
			const valPath = val.replace(/^\./, "").split(".");
			return { key, valuePath: valPath };
		});
		return { type: "object", pairs };
	}

	// Array iteration: .list[].field or .list[]
	const arrayIterMatch = trimmed.match(
		/^\.(\w+(?:\.\w+)*)\[\](?:\.(\w+(?:\.\w+)*))?$/,
	);
	if (arrayIterMatch) {
		if (arrayIterMatch[2]) {
			return {
				type: "iterate-field",
				fields: [
					...arrayIterMatch[1].split("."),
					...arrayIterMatch[2].split("."),
				],
			};
		}
		return { type: "iterate", fields: arrayIterMatch[1].split(".") };
	}

	// Simple or nested field
	const parts = trimmed.replace(/^\./, "").split(".");
	if (parts.length === 1) return { type: "field", fields: parts };
	return { type: "nested", fields: parts };
}

function resolvePath(data: unknown, path: string[]): unknown {
	let current: unknown = data;
	for (const part of path) {
		if (current == null || typeof current !== "object") return undefined;
		if (Array.isArray(current)) {
			current = current.map(
				(item) => (item as Record<string, unknown>)?.[part],
			);
		} else {
			current = (current as Record<string, unknown>)[part];
		}
	}
	return current;
}

export function applyJq(expr: string, data: unknown): unknown {
	const node = parseJq(expr);

	switch (node.type) {
		case "identity":
			return data;

		case "field":
			return resolvePath(data, node.fields ?? []);

		case "nested":
			return resolvePath(data, node.fields ?? []);

		case "iterate": {
			const arr = resolvePath(data, node.fields ?? []) as unknown[];
			return Array.isArray(arr) ? arr : [];
		}

		case "iterate-field": {
			const fields = node.fields ?? [];
			const listPath = fields.slice(0, -1);
			const lastField = fields[fields.length - 1];
			const arr = resolvePath(data, listPath) as unknown[];
			if (!Array.isArray(arr)) return [];
			return arr.map((item) => (item as Record<string, unknown>)?.[lastField]);
		}

		case "object": {
			const result: Record<string, unknown> = {};
			for (const pair of node.pairs ?? []) {
				result[pair.key] = resolvePath(data, pair.valuePath);
			}
			return result;
		}

		default:
			return data;
	}
}
