import { formatTable } from "./table.js";
import { formatTsv } from "./tsv.js";
import { renderTemplate } from "./template.js";
import { applyJq } from "./jq.js";
import { formatJson } from "./json.js";
import type { WriterLike } from "../runtime.js";

export type OutputFormat = "table" | "json" | "tsv" | "template" | "jq";

export function resolveFormat(options: { json?: boolean; format?: string; tsv?: boolean; jq?: string; template?: string }): OutputFormat {
  if (options.json) return "json";
  if (options.tsv) return "tsv";
  if (options.jq) return "jq";
  if (options.template) return "template";
  if (options.format) {
    const fmt = options.format.toLowerCase();
    if (fmt === "json" || fmt === "table" || fmt === "tsv" || fmt === "template" || fmt === "jq") {
      return fmt as OutputFormat;
    }
    throw new Error(`Unknown output format '${options.format}'. Valid: table, json, tsv, template, jq`);
  }
  return "table";
}

export interface ListOutputOptions {
  headers: string[];
  rows: string[][];
  data: unknown;
}

export function writeFormatted(
  writer: WriterLike,
  format: OutputFormat,
  listOpts: ListOutputOptions,
  templateExpr?: string,
  jqExpr?: string,
): void {
  switch (format) {
    case "json":
      writer.write(formatJson(listOpts.data));
      break;
    case "tsv":
      writer.write(formatTsv(listOpts.headers, listOpts.rows));
      break;
    case "table":
      writer.write(formatTable(listOpts.headers, listOpts.rows));
      break;
    case "template":
      if (!templateExpr) throw new Error("--template requires a template expression, e.g. '{{.name}}'");
      writer.write(renderTemplate(templateExpr, listOpts.data));
      break;
    case "jq":
      if (!jqExpr) throw new Error("--jq requires a jq expression, e.g. '.results[].name'");
      writer.write(formatJson(applyJq(jqExpr, listOpts.data)));
      break;
  }
}