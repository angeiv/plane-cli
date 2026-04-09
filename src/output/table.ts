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
