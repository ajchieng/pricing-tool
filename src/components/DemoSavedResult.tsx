"use client";

import { ResultPanel, type QuoteContext } from "@/components/ResultPanel";
import { PersonalResultPanel } from "@/components/personal-loans/PersonalResultPanel";
import { CommercialResultPanel } from "@/components/commercial-loans/CommercialResultPanel";
import { demoFormValues } from "@/lib/demo/form-values";
import type { DemoArea } from "@/lib/demo/types";
import type { PricingResult } from "@/lib/pricing/types";
import type { PersonalPricingResult } from "@/lib/pricing/personal/types";
import type { CommercialPricingResult } from "@/lib/pricing/commercial/types";

export function DemoSavedResult({
  area,
  result,
  input,
}: {
  area: DemoArea;
  result: unknown;
  input: Record<string, unknown>;
}) {
  if (area === "personal")
    return (
      <PersonalResultPanel
        result={result as PersonalPricingResult}
        layout="detail"
      />
    );
  if (area === "commercial")
    return (
      <CommercialResultPanel
        result={result as CommercialPricingResult}
        layout="detail"
      />
    );
  const form = demoFormValues("home", input);
  const context: QuoteContext = {
    ...input,
    customerStream: form.customerStream,
    channel: form.channel,
    existingMember: form.customerStream !== "new_to_bank",
    retentionScenario: form.customerStream === "retention",
    newToBankGrowthOpportunity: form.customerStream === "new_to_bank",
    vipCustomer: form.vipCustomer,
    livesInServiceRegion: form.livesInServiceRegion,
    lenderProducts: form.lenderProducts,
  };
  return (
    <ResultPanel
      result={result as PricingResult}
      context={context}
      layout="detail"
    />
  );
}
