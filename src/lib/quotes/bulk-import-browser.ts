import type { ZodType } from "zod";
import {
  BULK_QUOTE_IMPORT_MAX_FILE_BYTES,
  BULK_QUOTE_IMPORT_MAX_ROWS,
} from "./bulk-import-contract";

export type BulkQuoteImportSummary = {
  label: string;
  amount: number | null;
  scenario: string;
};

export type PreparedBulkQuoteImportRow = {
  rowNumber: number;
  original: unknown;
  normalized: Record<string, unknown> | null;
  summary: BulkQuoteImportSummary;
  errors: string[];
  unknownFields: string[];
};

export type BulkQuoteImportParseResult =
  | { ok: true; rows: PreparedBulkQuoteImportRow[] }
  | { ok: false; error: string };

export type BulkQuoteImportParseConfig = {
  schema: ZodType;
  knownFields: ReadonlySet<string>;
  foreignMarkers: Array<{ label: string; fields: readonly string[] }>;
  summarize: (normalized: Record<string, unknown>) => BulkQuoteImportSummary;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function emptySummary(rowNumber: number): BulkQuoteImportSummary {
  return {
    label: `Unrecognised row ${rowNumber}`,
    amount: null,
    scenario: "Cannot preview",
  };
}

export function zodInputFieldNames(schema: ZodType): ReadonlySet<string> {
  let current: unknown = schema;
  for (let depth = 0; depth < 8; depth += 1) {
    if (!current || typeof current !== "object") break;
    const candidate = current as {
      shape?: Record<string, unknown>;
      _def?: { in?: unknown; innerType?: unknown; schema?: unknown };
    };
    if (candidate.shape) return new Set(Object.keys(candidate.shape));
    current =
      candidate._def?.in ?? candidate._def?.innerType ?? candidate._def?.schema;
  }
  return new Set();
}

export function parseBulkQuoteImport(
  input: { text: string; fileSize: number },
  config: BulkQuoteImportParseConfig,
): BulkQuoteImportParseResult {
  if (input.fileSize > BULK_QUOTE_IMPORT_MAX_FILE_BYTES) {
    return {
      ok: false,
      error: "Choose a JSON file no larger than 2 MiB.",
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(input.text) as unknown;
  } catch {
    return { ok: false, error: "That file is not valid JSON." };
  }
  if (!Array.isArray(parsed)) {
    return {
      ok: false,
      error: "Expected a JSON array of quote-input objects.",
    };
  }
  if (parsed.length === 0) {
    return {
      ok: false,
      error: "The JSON array must contain at least one quote.",
    };
  }
  if (parsed.length > BULK_QUOTE_IMPORT_MAX_ROWS) {
    return {
      ok: false,
      error: `A bulk import can contain at most ${BULK_QUOTE_IMPORT_MAX_ROWS} quotes.`,
    };
  }

  return {
    ok: true,
    rows: parsed.map((row, index): PreparedBulkQuoteImportRow => {
      const rowNumber = index + 1;
      if (!isRecord(row)) {
        return {
          rowNumber,
          original: row,
          normalized: null,
          summary: emptySummary(rowNumber),
          errors: ["Expected a JSON object of quote fields."],
          unknownFields: [],
        };
      }

      const unknownFields = Object.keys(row)
        .filter((field) => field !== "approvalContext")
        .filter((field) => !config.knownFields.has(field))
        .sort();
      const foreign = config.foreignMarkers.find(({ fields }) =>
        fields.some((field) => Object.hasOwn(row, field)),
      );
      const errors: string[] = [];
      if (foreign) {
        errors.push(
          `This appears to be a ${foreign.label} quote, not this vertical.`,
        );
      }
      if (row.revisedFromQuoteId != null) {
        errors.push(
          "Bulk import creates new Draft quotes and cannot create revisions.",
        );
      }

      // Pricing-admin exports carry read-only operational approval provenance.
      // It is display context only and must never become calculation input.
      const pricingInput = { ...row };
      delete pricingInput.approvalContext;
      const validation = config.schema.safeParse(pricingInput);
      if (!validation.success) {
        errors.push(
          ...validation.error.issues.map((issue) => {
            const path = issue.path.join(".");
            return path ? `${path}: ${issue.message}` : issue.message;
          }),
        );
      }
      const normalized =
        validation.success && isRecord(validation.data)
          ? validation.data
          : null;
      return {
        rowNumber,
        original: row,
        normalized,
        summary: config.summarize(normalized ?? row),
        errors,
        unknownFields,
      };
    }),
  };
}

export function failedBulkQuoteRowsJson(
  rows: Array<{ original: unknown; status: string }>,
): string {
  const failed = rows
    .filter((row) => !["created", "deduplicated"].includes(row.status))
    .map((row) => row.original);
  return `${JSON.stringify(failed, null, 2)}\n`;
}
