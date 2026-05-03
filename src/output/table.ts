/**
 * gh-style tab-separated output: no header separator, aligned with tabs
 */
export function formatTable(headers: string[], rows: string[][]): string {
	const widths = headers.map((header, index) =>
		Math.max(header.length, ...rows.map((row) => (row[index] ?? "").length)),
	);

	const renderRow = (row: string[]) =>
		row
			.map((cell, index) => (cell ?? "").padEnd(widths[index], " "))
			.join("  ")
			.trimEnd();

	return `${renderRow(headers)}\n${renderRow(widths.map((width) => "-".repeat(width)))}\n${rows
		.map(renderRow)
		.join("\n")}\n`;
}

/**
 * gh-style tab-separated list: just headers + rows, tab-delimited, no borders
 */
export function formatTabList(headers: string[], rows: string[][]): string {
	const lines: string[] = [];
	lines.push(headers.join("\t"));
	for (const row of rows) {
		lines.push(row.join("\t"));
	}
	return `${lines.join("\n")}\n`;
}

/**
 * gh-style view output: key:\tvalue pairs
 */
export function formatKvView(pairs: [key: string, value: string][]): string {
	const maxKeyLen = Math.max(...pairs.map(([k]) => k.length + 1));
	return pairs
		.map(([key, value]) => `${(`${key}:`).padEnd(maxKeyLen)}\t${value}`)
		.join("\n");
}
