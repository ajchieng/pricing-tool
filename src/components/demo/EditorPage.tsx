"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { DemoQuoteEditor } from "@/components/DemoQuoteEditor";
import type { DemoArea } from "@/lib/demo/types";
import { AREA_INFO } from "@/lib/demo/presentation";
import { buttonClass } from "@/components/ui/Button";
import { ProductTabs } from "./WorkspacePages";
import { useDemo, WorkspaceLoading } from "./DemoProvider";

export function EditorPage({
  area,
  revise = false,
}: {
  area: DemoArea;
  revise?: boolean;
}) {
  const { ready } = useDemo();
  const params = useSearchParams();
  const rawId = params.get("id");
  const revisionId =
    revise &&
    rawId &&
    /^\d+$/.test(rawId) &&
    Number.isSafeInteger(Number(rawId)) &&
    Number(rawId) > 0
      ? Number(rawId)
      : undefined;
  if (!ready) return <WorkspaceLoading />;
  if (revise && revisionId === undefined)
    return (
      <section data-product={area}>
        <ProductTabs area={area} />
        <h1 className="font-serif text-3xl">Choose a quote to revise</h1>
        <p className="mt-3 text-sm text-muted">
          Open a saved quote in this browser and choose Revise quote.
        </p>
        <Link
          className={buttonClass("primary", "md", "mt-5")}
          href={`${AREA_INFO[area].path}/`}
        >
          View saved quotes
        </Link>
      </section>
    );
  return (
    <section data-product={area}>
      <ProductTabs area={area} />
      <DemoQuoteEditor
        area={area}
        revisionId={revisionId}
        marketId={params.get("marketId") ?? undefined}
      />
    </section>
  );
}
