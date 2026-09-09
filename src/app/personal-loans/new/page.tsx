import { Suspense } from "react";
import { EditorPage } from "@/components/demo/EditorPage";
export default function Page() {
  return (
    <Suspense fallback={<p role="status">Opening workspace…</p>}>
      <EditorPage area="personal" />
    </Suspense>
  );
}
