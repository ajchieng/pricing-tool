import { describe, expect, it } from "vitest";
import { calculateDemo, sampleInput } from "./pricing";
import {
  SAMPLE_MARKET,
  demoMarketHandoff,
  getMarketEvidence,
  marketPrefill,
} from "./market";
import { demoFormValues } from "./form-values";
import { buildHomeQuoteRequest } from "@/components/home-loans/pricing-request";
import { buildPersonalQuoteRequest } from "@/components/personal-loans/pricing-request";
import { buildCommercialQuoteRequest } from "@/components/commercial-loans/pricing-request";

describe("fictional market handoff", () => {
  it.each(SAMPLE_MARKET.map((product) => [product.id, product.area] as const))(
    "prices the supported scenario for %s without using market prices as policy",
    async (id, area) => {
      const handoff = demoMarketHandoff(area, id);
      expect(handoff.warning).toBeNull();
      expect(handoff.evidence?.vertical).toBe(area);
      const { input, result } = await calculateDemo(area, {
        ...sampleInput(area),
        ...handoff.values,
      });
      expect(result.finalDisplayRate).toBeGreaterThan(0);
      expect(result.profitability.expectedLoss?.status).toBe("calculated");
      expect(
        result.profitability.capitalAllocation?.classificationConfirmed,
      ).toBe(true);
      expect(
        result.warnings.filter((warning) => warning.severity === "critical"),
      ).toEqual([]);
      expect(input.requestedRate).toBeNull();
      const withoutEvidence = await calculateDemo(area, {
        ...input,
        marketRateId: null,
        competitorLender: null,
        competitorRate: null,
        competitorNotes: null,
      });
      expect(result.finalDisplayRate).toBe(
        withoutEvidence.result.finalDisplayRate,
      );
      expect(result.policySnapshot?.bundleToken).toEqual(
        withoutEvidence.result.policySnapshot?.bundleToken,
      );
      const common = {
        marketRateId: id,
        costOfFundsSource: "override" as const,
        profitInputUnit: "dollar" as const,
      };
      const formRequest =
        area === "home"
          ? buildHomeQuoteRequest({
              ...demoFormValues("home", input),
              ...common,
              revisedFromQuoteId: null,
            })
          : area === "personal"
            ? buildPersonalQuoteRequest({
                form: demoFormValues("personal", input),
                ...common,
              })
            : buildCommercialQuoteRequest({
                form: demoFormValues("commercial", input),
                ...common,
              });
      const restored = await calculateDemo(area, formRequest);
      expect(restored.result.finalDisplayRate).toBe(result.finalDisplayRate);
      expect(restored.result.profitability).toEqual(result.profitability);
    },
  );

  it("matches fixed terms, security and revolving facilities", () => {
    expect(marketPrefill("home-summit")).toMatchObject({
      rateType: "fixed",
      fixedPeriodMonths: 24,
      productId: 102,
    });
    expect(marketPrefill("personal-river")).toMatchObject({
      securityType: "unsecured",
      productId: 202,
    });
    expect(marketPrefill("commercial-horizon")).toMatchObject({
      facilityType: "equipment_finance",
      purchasePrice: 600000,
      customerEquityContribution: 100000,
    });
    expect(marketPrefill("commercial-summit")).toMatchObject({
      facilityType: "overdraft",
      repaymentType: "revolving",
      currentDrawnBalance: 300000,
    });
    expect(
      getMarketEvidence("commercial-summit")?.rateCriteria.repaymentType,
    ).toBe("REVOLVING");
  });

  it("rejects unknown and wrong-domain evidence without copying scenario inputs", () => {
    expect(demoMarketHandoff("home", "missing")).toMatchObject({
      evidence: null,
      values: {},
      warning: expect.stringContaining("could not be found"),
    });
    expect(demoMarketHandoff("home", "personal-river")).toMatchObject({
      evidence: null,
      values: {},
      warning: expect.stringContaining("belongs to personal"),
    });
    expect(demoMarketHandoff("personal")).toEqual({
      evidence: null,
      values: {},
      warning: null,
    });
  });
});
