"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { HomeLoanQuoteForm } from "@/components/home-loans/HomeLoanQuoteForm";
import { PersonalLoanQuoteForm } from "@/components/personal-loans/PersonalLoanQuoteForm";
import { CommercialLoanQuoteForm } from "@/components/commercial-loans/CommercialLoanQuoteForm";
import { Button } from "@/components/ui/Button";
import { getDemoFormConfig, sampleInput } from "@/lib/demo/pricing";
import { demoMarketHandoff } from "@/lib/demo/market";
import { demoFormValues } from "@/lib/demo/form-values";
import { getQuote } from "@/lib/demo/store";
import type { DemoArea } from "@/lib/demo/types";
import {
  marketQuoteEvidenceFromJson,
  type MarketQuoteEvidence,
} from "@/lib/market/quote-evidence-values";

export function DemoQuoteEditor({
  area,
  revisionId,
  marketId,
}: {
  area: DemoArea;
  revisionId?: number;
  marketId?: string;
}) {
  const requestKey = `${area}:${revisionId ?? "new"}:${marketId ?? ""}`;
  const [loaded, setLoaded] = useState<{
    key: string;
    input?: Record<string, unknown>;
    evidence: MarketQuoteEvidence | null;
    warning: string | null;
    version: number;
  } | null>(null);
  const [error, setError] = useState<{ key: string; message: string } | null>(
    null,
  );
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        if (revisionId != null) {
          const quote = await getQuote(area, revisionId);
          if (!quote)
            throw new Error(
              "This quote is not in this browser. Saved quotes belong to the browser where they were created.",
            );
          if (active) {
            const evidence = marketQuoteEvidenceFromJson(
              quote.input.marketEvidence,
            );
            const matching =
              evidence?.version !== 2 || evidence.vertical === area;
            setError(null);
            setLoaded({
              key: requestKey,
              input: quote.input,
              evidence: matching ? evidence : null,
              warning: matching
                ? null
                : "The stored market evidence belongs to another product area and was not attached to this revision.",
              version: 0,
            });
          }
        } else if (active) {
          const handoff = demoMarketHandoff(area, marketId);
          setError(null);
          setLoaded({
            key: requestKey,
            input: handoff.evidence
              ? { ...sampleInput(area), ...handoff.values }
              : undefined,
            evidence: handoff.evidence,
            warning: handoff.warning,
            version: 0,
          });
        }
      } catch (cause) {
        if (active)
          setError({
            key: requestKey,
            message:
              cause instanceof Error
                ? cause.message
                : "Could not load browser storage. Reset the demo and retry.",
          });
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [area, revisionId, marketId, requestKey]);

  if (error?.key === requestKey)
    return (
      <div role="alert" className="rounded-xl bg-panel p-6">
        <p>{error.message}</p>
        <Link
          className="mt-3 inline-flex min-h-11 items-center font-semibold text-brand underline"
          href={`/${area}-loans/new/`}
        >
          Start a new quote
        </Link>
      </div>
    );
  if (!loaded || loaded.key !== requestKey)
    return (
      <p role="status" className="py-8 text-muted">
        Loading the quote workspace…
      </p>
    );
  const title = `${revisionId ? "Revise" : "New"} ${area} ${area === "commercial" ? "quote" : "loan quote"}`;
  const caption = revisionId
    ? "Start a new revision from the saved inputs. The original calculation stays frozen."
    : "Explore the full calculator or load a fictional sample scenario.";
  const common = {
    revisedFromQuoteId: revisionId,
    canOverrideCapital: true,
    canOverrideExpectedLoss: true,
    applyProfitabilityDefaults: loaded.input == null,
    marketEvidence: loaded.evidence,
    marketEvidenceError: loaded.warning,
    header: { title, caption },
    saveLabel: revisionId ? "Save revision" : "Save quote",
  };
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3 print:hidden">
        <Link
          href={`/${area}-loans/`}
          className="inline-flex min-h-11 items-center text-sm font-semibold text-brand"
        >
          Back to saved quotes
        </Link>
        {revisionId == null ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              const handoff = demoMarketHandoff(area, marketId);
              setLoaded({
                ...loaded,
                input: { ...sampleInput(area), ...handoff.values },
                evidence: handoff.evidence,
                warning: handoff.warning,
                version: loaded.version + 1,
              });
            }}
          >
            Load sample scenario
          </Button>
        ) : (
          <span className="text-sm text-muted">
            Revising quote #{revisionId}
          </span>
        )}
      </div>
      {area === "home" ? (
        <HomeLoanQuoteForm
          key={`${requestKey}:${loaded.version}`}
          {...getDemoFormConfig("home")}
          {...common}
          initialValues={
            loaded.input ? demoFormValues("home", loaded.input) : undefined
          }
        />
      ) : area === "personal" ? (
        <PersonalLoanQuoteForm
          key={`${requestKey}:${loaded.version}`}
          {...getDemoFormConfig("personal")}
          {...common}
          initialValues={
            loaded.input ? demoFormValues("personal", loaded.input) : undefined
          }
        />
      ) : (
        <CommercialLoanQuoteForm
          key={`${requestKey}:${loaded.version}`}
          {...getDemoFormConfig("commercial")}
          {...common}
          initialValues={
            loaded.input
              ? demoFormValues("commercial", loaded.input)
              : undefined
          }
        />
      )}
    </>
  );
}
