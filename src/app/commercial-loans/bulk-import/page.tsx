import { CommercialBulkQuoteImport } from "@/components/quotes/CommercialBulkQuoteImport";
import { PageHeader } from "@/components/ui/PageHeader";

export default function CommercialLoanBulkImportPage() {
  return (
    <div>
      <PageHeader
        title="Bulk import Commercial Loan drafts"
        caption="Review existing Commercial Loan quote inputs before this browser reprices and saves each valid row independently."
        backHref="/commercial-loans"
        backLabel="Back to Commercial Loan quotes"
      />
      <CommercialBulkQuoteImport />
    </div>
  );
}
