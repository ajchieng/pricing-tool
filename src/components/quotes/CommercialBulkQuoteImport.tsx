"use client";

import { BulkQuoteImportWorkspace } from "@/components/quotes/BulkQuoteImportWorkspace";
import {
  labelFacilityType,
  labelRiskGrade,
} from "@/lib/pricing/commercial/labels";
import { commercialCalcRequestSchema } from "@/lib/pricing/commercial/schema";

function stringValue(row: Record<string, unknown>, field: string): string {
  return typeof row[field] === "string" ? row[field] : "";
}

export function CommercialBulkQuoteImport() {
  return (
    <BulkQuoteImportWorkspace
      verticalLabel="Commercial Loan"
      vertical="commercial"
      quoteBasePath="/commercial-loans"
      failedFilename="commercial-loan-bulk-import-unresolved.json"
      schema={commercialCalcRequestSchema}
      foreignMarkers={[
        { label: "Home Loan", fields: ["propertyValue", "rateType"] },
        { label: "Personal Loan", fields: ["loanTermMonths"] },
      ]}
      summarize={(row) => ({
        label: stringValue(row, "businessName").trim() || "Unlabelled business",
        amount: typeof row.loanAmount === "number" ? row.loanAmount : null,
        scenario: [
          labelFacilityType(stringValue(row, "facilityType")),
          labelRiskGrade(stringValue(row, "businessRiskGrade")),
        ].join(" · "),
      })}
    />
  );
}
