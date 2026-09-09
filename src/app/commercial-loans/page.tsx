import { Suspense } from "react";
import { QuotesPage } from "@/components/demo/QuotePages";
export default function Page() {
  return (
    <Suspense fallback={<p role="status">Opening workspace…</p>}>
      <QuotesPage area="commercial" />
    </Suspense>
  );
}
