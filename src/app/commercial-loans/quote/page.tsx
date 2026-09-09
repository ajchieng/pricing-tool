import { Suspense } from "react";
import { QuoteDetailPage } from "@/components/demo/QuotePages";
export default function Page() {
  return (
    <Suspense fallback={<p role="status">Opening workspace…</p>}>
      <QuoteDetailPage area="commercial" />
    </Suspense>
  );
}
