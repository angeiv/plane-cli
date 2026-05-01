export function formatTsv(headers: string[], rows: string[][]): string {
	const escapeTsvField = (value: string): string => {
		if (value.includes("\t") || value.includes("\n") || value.includes('"')) {
			return `"${value.replace(/"/g, '""')}"`;
		}
		return value;
	};

	const headerLine = headers.map(escapeTsvField).join("\t");
	const dataLines = rows.map((row) =>
		row.map((cell) => escapeTsvField(cell ?? "")).join("\t"),
	);

	return `${headerLine}\n${dataLines.join("\n")}\n`;
}
