import { Suspense } from "react";
import { MarketPage } from "@/components/demo/ReferencePages";
export default function Page() {
  return (
    <Suspense fallback={<p role="status">Opening workspace…</p>}>
      <MarketPage />
    </Suspense>
  );
}
