import { PersonalBulkQuoteImport } from "@/components/quotes/PersonalBulkQuoteImport";
import { PageHeader } from "@/components/ui/PageHeader";

export default function PersonalLoanBulkImportPage() {
  return (
    <div>
      <PageHeader
        title="Bulk import Personal Loan drafts"
        caption="Review existing Personal Loan quote inputs before this browser reprices and saves each valid row independently."
        backHref="/personal-loans"
        backLabel="Back to Personal Loan quotes"
      />
      <PersonalBulkQuoteImport />
    </div>
  );
}
