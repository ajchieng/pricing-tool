import { HomeBulkQuoteImport } from "@/components/quotes/HomeBulkQuoteImport";
import { PageHeader } from "@/components/ui/PageHeader";

export default function HomeLoanBulkImportPage() {
  return (
    <div>
      <PageHeader
        title="Bulk import Home Loan drafts"
        caption="Review existing Home Loan quote inputs before this browser reprices and saves each valid row independently."
        backHref="/home-loans"
        backLabel="Back to Home Loan quotes"
      />
      <HomeBulkQuoteImport />
    </div>
  );
}
