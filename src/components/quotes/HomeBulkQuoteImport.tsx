"use client";

import { BulkQuoteImportWorkspace } from "@/components/quotes/BulkQuoteImportWorkspace";
import { LOAN_PURPOSE_LABELS, RATE_TYPE_LABELS } from "@/lib/format";
import { calcRequestSchema } from "@/lib/pricing/schema";

function stringValue(row: Record<string, unknown>, field: string): string {
  return typeof row[field] === "string" ? row[field] : "";
}

export function HomeBulkQuoteImport() {
  return (
    <BulkQuoteImportWorkspace
      verticalLabel="Home Loan"
      vertical="home"
      quoteBasePath="/home-loans"
      failedFilename="home-loan-bulk-import-unresolved.json"
      schema={calcRequestSchema}
      foreignMarkers={[
        { label: "Personal Loan", fields: ["loanTermMonths"] },
        {
          label: "Commercial Loan",
          fields: ["facilityType", "businessName", "industryCategory"],
        },
      ]}
      summarize={(row) => {
        const purpose = stringValue(row, "loanPurpose");
        const rateType = stringValue(row, "rateType");
        const fixedMonths =
          typeof row.fixedPeriodMonths === "number"
            ? row.fixedPeriodMonths
            : null;
        const rateLabel =
          (RATE_TYPE_LABELS[rateType] ?? rateType) || "Unspecified rate";
        return {
          label:
            stringValue(row, "customerReference").trim() ||
            "Unlabelled customer",
          amount: typeof row.loanAmount === "number" ? row.loanAmount : null,
          scenario:
            [
              LOAN_PURPOSE_LABELS[purpose] ?? purpose,
              fixedMonths ? `${rateLabel} · ${fixedMonths} months` : rateLabel,
            ]
              .filter(Boolean)
              .join(" · ") || "Unspecified scenario",
        };
      }}
    />
  );
}
