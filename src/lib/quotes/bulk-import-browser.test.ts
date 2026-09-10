import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  BULK_QUOTE_IMPORT_MAX_FILE_BYTES,
  BULK_QUOTE_IMPORT_MAX_ROWS,
} from "./bulk-import-contract";
import {
  failedBulkQuoteRowsJson,
  parseBulkQuoteImport,
  zodInputFieldNames,
} from "./bulk-import-browser";

const schema = z.object({
  customerReference: z.string().trim().default(""),
  revisedFromQuoteId: z.number().int().positive().nullable().default(null),
  loanAmount: z.coerce.number().positive(),
  loanPurpose: z.enum(["owner_occupied", "investment"]),
});

const config = {
  schema,
  knownFields: zodInputFieldNames(schema),
  foreignMarkers: [
    { label: "Commercial Loan", fields: ["businessName", "facilityType"] },
  ],
  summarize: (row: Record<string, unknown>) => ({
    label:
      typeof row.customerReference === "string"
        ? row.customerReference
        : "Unlabelled customer",
    amount: typeof row.loanAmount === "number" ? row.loanAmount : null,
    scenario:
      typeof row.loanPurpose === "string" ? row.loanPurpose : "Unspecified",
  }),
};

function parse(value: unknown, fileSize = 100) {
  return parseBulkQuoteImport(
    { text: JSON.stringify(value), fileSize },
    config,
  );
}

describe("parseBulkQuoteImport", () => {
  it("discovers request fields through transformed Zod schemas", () => {
    const transformed = z
      .object({ facilityType: z.string(), loanAmount: z.number() })
      .transform((value) => ({ ...value, normalized: true }));
    expect([...zodInputFieldNames(transformed)].sort()).toEqual([
      "facilityType",
      "loanAmount",
    ]);
  });

  it("rejects invalid JSON, JSONL, non-arrays, and empty arrays", () => {
    expect(
      parseBulkQuoteImport(
        { text: '{"loanAmount": 1}\n{"loanAmount": 2}', fileSize: 50 },
        config,
      ),
    ).toEqual({ ok: false, error: "That file is not valid JSON." });
    expect(parse({ loanAmount: 1 })).toMatchObject({ ok: false });
    expect(parse([])).toMatchObject({ ok: false });
  });

  it("enforces the 2 MiB file and 25-row limits", () => {
    expect(parse([], BULK_QUOTE_IMPORT_MAX_FILE_BYTES + 1)).toEqual({
      ok: false,
      error: "Choose a JSON file no larger than 2 MiB.",
    });
    expect(
      parse(Array.from({ length: BULK_QUOTE_IMPORT_MAX_ROWS + 1 })),
    ).toEqual({
      ok: false,
      error: "A bulk import can contain at most 25 quotes.",
    });
  });

  it("prepares valid rows independently and preserves row summaries", () => {
    const result = parse([
      {
        customerReference: "  Member 42  ",
        revisedFromQuoteId: null,
        loanAmount: "350000",
        loanPurpose: "owner_occupied",
      },
      {
        customerReference: "Invalid amount",
        revisedFromQuoteId: null,
        loanAmount: -1,
        loanPurpose: "investment",
      },
      "not an object",
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.rows[0]).toMatchObject({
      rowNumber: 1,
      normalized: {
        customerReference: "Member 42",
        loanAmount: 350000,
      },
      summary: {
        label: "Member 42",
        amount: 350000,
        scenario: "owner_occupied",
      },
      errors: [],
    });
    expect(result.rows[1].normalized).toBeNull();
    expect(result.rows[1].errors[0]).toContain("loanAmount");
    expect(result.rows[2]).toMatchObject({
      normalized: null,
      errors: ["Expected a JSON object of quote fields."],
    });
  });

  it("warns about ignored unknown fields without invalidating a row", () => {
    const result = parse([
      {
        customerReference: "Known customer",
        revisedFromQuoteId: null,
        loanAmount: 120000,
        loanPurpose: "investment",
        exportedDisplayRate: 6.25,
      },
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows[0].unknownFields).toEqual(["exportedDisplayRate"]);
    expect(result.rows[0].errors).toEqual([]);
    expect(result.rows[0].normalized).not.toHaveProperty("exportedDisplayRate");
  });

  it("silently strips read-only approval export context", () => {
    const result = parse([
      {
        customerReference: "Known customer",
        revisedFromQuoteId: null,
        loanAmount: 120000,
        loanPurpose: "investment",
        approvalContext: {
          version: 1,
          effectiveLevel: "exception",
        },
      },
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows[0].unknownFields).toEqual([]);
    expect(result.rows[0].normalized).not.toHaveProperty("approvalContext");
  });

  it("rejects revisions and rows marked as another pricing vertical", () => {
    const result = parse([
      {
        customerReference: "Revision",
        revisedFromQuoteId: 12,
        loanAmount: 120000,
        loanPurpose: "investment",
      },
      {
        businessName: "Foreign vertical",
        facilityType: "term_loan",
        customerReference: "",
        revisedFromQuoteId: null,
        loanAmount: 120000,
        loanPurpose: "investment",
      },
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows[0].errors).toContain(
      "Bulk import creates new Draft quotes and cannot create revisions.",
    );
    expect(result.rows[1].errors).toContain(
      "This appears to be a Commercial Loan quote, not this vertical.",
    );
  });
});

describe("failedBulkQuoteRowsJson", () => {
  it("exports only invalid, failed, and not-attempted original rows", () => {
    const json = failedBulkQuoteRowsJson([
      { original: { row: 1 }, status: "created" },
      { original: { row: 2 }, status: "deduplicated" },
      { original: { row: 3 }, status: "failed" },
      { original: { row: 4 }, status: "invalid" },
      { original: { row: 5 }, status: "not_attempted" },
    ]);
    expect(JSON.parse(json)).toEqual([{ row: 3 }, { row: 4 }, { row: 5 }]);
  });
});
