"use client";

import { BulkQuoteImportWorkspace } from "@/components/quotes/BulkQuoteImportWorkspace";
import {
  labelPersonalPurpose,
  labelPersonalSecurity,
} from "@/lib/pricing/personal/labels";
import { personalCalcRequestSchema } from "@/lib/pricing/personal/schema";

function stringValue(row: Record<string, unknown>, field: string): string {
  return typeof row[field] === "string" ? row[field] : "";
}

export function PersonalBulkQuoteImport() {
  return (
    <BulkQuoteImportWorkspace
      verticalLabel="Personal Loan"
      vertical="personal"
      quoteBasePath="/personal-loans"
      failedFilename="personal-loan-bulk-import-unresolved.json"
      schema={personalCalcRequestSchema}
      foreignMarkers={[
        { label: "Home Loan", fields: ["propertyValue", "rateType"] },
        {
          label: "Commercial Loan",
          fields: ["facilityType", "businessName", "industryCategory"],
        },
      ]}
      summarize={(row) => ({
        label:
          stringValue(row, "customerReference").trim() || "Unlabelled customer",
        amount: typeof row.loanAmount === "number" ? row.loanAmount : null,
        scenario: [
          labelPersonalPurpose(stringValue(row, "loanPurpose")),
          labelPersonalSecurity(stringValue(row, "securityType")),
        ].join(" · "),
      })}
    />
  );
}
