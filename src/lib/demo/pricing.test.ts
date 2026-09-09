import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { calculateDemo, sampleInput } from "./pricing";
import {
  demoExpectedLossPolicies,
  getDemoPolicy,
  homeConfigFor,
} from "./policy";
import { expectedLossPolicyValidationErrors } from "@/lib/pricing/credit-risk/policy-validation";
import { calculatePricing } from "@/lib/pricing/calculate";
import { calcRequestSchema } from "@/lib/pricing/schema";
import { buildPricingPolicySnapshot } from "@/lib/pricing/policy-snapshot";

const areas = ["home", "personal", "commercial"] as const;
describe("complete fictional browser pricing", () => {
  for (const area of areas) {
    it(`${area}: complete policy and one credit-loss deduction through capital returns`, async () => {
      const { result } = await calculateDemo(area, sampleInput(area));
      expect(
        expectedLossPolicyValidationErrors(demoExpectedLossPolicies[area]),
      ).toEqual([]);
      expect(result.finalDisplayRate).toBeGreaterThan(0);
      const pnl = result.profitability,
        loss = pnl.expectedLoss!,
        capital = pnl.capitalAllocation!;
      expect(loss.status).toBe("calculated");
      expect(loss.basis).toBe("calculated");
      expect(loss.expectedCreditLossAmount).toBeGreaterThan(0);
      expect(pnl.profitBeforeTax).toBeCloseTo(
        loss.operatingProfitBeforeCreditLossAmount! -
          loss.expectedCreditLossAmount!,
        2,
      );
      expect(pnl.profitAfterTax).toBeCloseTo(
        pnl.profitBeforeTax! - pnl.tax!,
        2,
      );
      expect(capital.allocatedCapital).toBeCloseTo(
        (capital.riskWeightedAssets * capital.capitalRatioPct) / 100,
        2,
      );
      expect(capital.returnOnEquity).toBeCloseTo(
        (pnl.profitAfterTax! / capital.allocatedCapital) * 100,
        2,
      );
      expect(capital.classificationConfirmed).toBe(true);
      expect(result.policySnapshot?.componentFallbacks).toEqual({
        product: false,
        scoreModel: false,
        scoreModelGovernance: false,
        margin: false,
        approval: false,
        profitability: false,
        fees: false,
        capital: false,
        expectedLoss: false,
      });
      expect(result.policySnapshot?.scoreModelVersion).toBe(
        getDemoPolicy(area).scoreModel.version,
      );
    });
    it(`${area}: online commissions normalize before calculation and storage`, async () => {
      const { input, result } = await calculateDemo(area, {
        ...sampleInput(area),
        channel: "online",
        commissions: 999,
      });
      expect(input.commissions).toBe(0);
      expect(result.profitability.commissions).toBe(0);
    });
  }
  it("business risk grade and evidence quality affect commercial risk and price", async () => {
    const strong = await calculateDemo("commercial", {
      ...sampleInput("commercial"),
      businessRiskGrade: "grade_1",
      financialsQuality: "audited",
    });
    const weak = await calculateDemo("commercial", {
      ...sampleInput("commercial"),
      businessRiskGrade: "grade_5",
      financialsQuality: "estimated",
    });
    expect(strong.result.customerScore!.score).toBeGreaterThan(
      weak.result.customerScore!.score,
    );
    expect(strong.result.finalDisplayRate).toBeLessThan(
      weak.result.finalDisplayRate,
    );
    expect(
      strong.result.profitability.expectedLoss!.riskOnlyScore,
    ).toBeGreaterThan(weak.result.profitability.expectedLoss!.riskOnlyScore!);
  });
  it("personal income stability changes the configured borrower score", async () => {
    const stable = await calculateDemo("personal", {
      ...sampleInput("personal"),
      employmentIncomeStability: "stable_payg",
    });
    const review = await calculateDemo("personal", {
      ...sampleInput("personal"),
      employmentIncomeStability: "review_required",
    });
    expect(stable.result.customerScore!.score).toBeGreaterThan(
      review.result.customerScore!.score,
    );
    expect(review.result.approvalRequired).toBe(true);
  });
  it("manual override preserves incomplete risk and adds local demo provenance", async () => {
    const { result } = await calculateDemo("home", {
      ...sampleInput("home"),
      creditScores: [],
      creditScore: null,
      expectedCreditLossOverrideEnabled: true,
      expectedCreditLossOverrideAmount: 720,
      expectedCreditLossOverrideReason: "Illustrative review adjustment",
      riskWeightOverridePct: 55,
      capitalOverrideReason: "Illustrative classification adjustment",
    });
    const loss = result.profitability.expectedLoss!;
    expect(loss.status).toBe("incomplete_inputs");
    expect(loss.basis).toBe("manual_override");
    expect(loss.expectedCreditLossAmount).toBeNull();
    expect(loss.effectiveExpectedCreditLossAmount).toBe(720);
    expect(loss.expectedLossOverrideByName).toBe("Demo user");
    expect(loss.expectedLossOverrideByRole).toBe("demo");
    expect(result.profitability.capitalAllocation).toMatchObject({
      classificationBasis: "override",
      overrideReason: "Illustrative classification adjustment",
      overrideByName: "Demo user",
      overrideByRole: "demo",
    });
  });
  it("rejects unreasoned overrides in every domain", async () => {
    for (const area of areas) {
      await expect(
        calculateDemo(area, {
          ...sampleInput(area),
          expectedCreditLossOverrideEnabled: true,
          expectedCreditLossOverrideAmount: 100,
          expectedCreditLossOverrideReason: "",
        }),
      ).rejects.toThrow();
      await expect(
        calculateDemo(area, {
          ...sampleInput(area),
          riskWeightOverridePct: 55,
          capitalOverrideReason: "",
        }),
      ).rejects.toThrow();
    }
  });
  it("supports the alternative Home NSI input with its matching loss-policy hash", async () => {
    const { result } = await calculateDemo("home", {
      ...sampleInput("home"),
      serviceabilityIncomeMeasure: "serviceability_nsi",
      serviceabilityNsi: 2600,
      grossAnnualIncome: null,
    });
    expect(result.profitability.expectedLoss?.status).toBe("calculated");
    expect(result.policySnapshot?.componentFallbacks.expectedLoss).toBe(false);
  });
  it("does not replace missing credit information with a model-calculated zero", async () => {
    const { result } = await calculateDemo("home", {
      ...sampleInput("home"),
      creditScores: [],
      creditScore: null,
    });
    expect(result.profitability.expectedLoss?.status).toBe("incomplete_inputs");
    expect(result.profitability.expectedLoss?.basis).toBe("provisional");
    expect(
      result.profitability.expectedLoss?.expectedCreditLossAmount,
    ).toBeNull();
  });
  it("tracks provisional capital classification independently of a valid rate", async () => {
    const { result } = await calculateDemo("home", {
      ...sampleInput("home"),
      capitalStandardStatus: "unconfirmed",
    });
    expect(result.finalDisplayRate).toBeGreaterThan(0);
    expect(
      result.profitability.capitalAllocation?.classificationConfirmed,
    ).toBe(false);
  });
  it("overdraft EAD uses the fictional undrawn conversion rate and requires drawn balance", async () => {
    const payload = {
      ...sampleInput("commercial"),
      facilityType: "overdraft",
      repaymentType: "revolving",
      loanTermYears: null,
      currentDrawnBalance: 200000,
    };
    const { result } = await calculateDemo("commercial", payload);
    expect(result.profitability.expectedLoss?.ead?.method).toBe(
      "drawn_plus_ccf_undrawn",
    );
    expect(result.profitability.expectedLoss?.exposureAtDefaultAmount).toBe(
      365000,
    );
    const missing = await calculateDemo("commercial", {
      ...payload,
      currentDrawnBalance: null,
    });
    expect(missing.result.profitability.expectedLoss?.status).toBe(
      "incomplete_inputs",
    );
  });
  it("equipment purchase financing derives the funded amount from equity", async () => {
    const { input, result } = await calculateDemo("commercial", {
      ...sampleInput("commercial"),
      facilityType: "equipment_finance",
      purchasePrice: 180000,
      customerEquityContribution: 45000,
      loanAmount: 999999,
      loanTermYears: 5,
      securityType: "business_assets",
      securityValue: 180000,
      securities: [{ type: "business_assets", value: 180000, isPrimary: true }],
    });
    expect(input.loanAmount).toBe(135000);
    expect(result.finalDisplayRate).toBeGreaterThan(0);
  });
  it("rate anchors permit discounts while an explicit minimum-rate row creates a floor", () => {
    const input = calcRequestSchema.parse(sampleInput("home"));
    const config = homeConfigFor(input);
    const anchor = calculatePricing(input, config);
    const floor = calculatePricing(input, {
      ...config,
      productRates: config.productRates.map((row) => ({
        ...row,
        pricingRole: "minimum_customer_rate",
      })),
    });
    expect(anchor.finalDisplayRate).toBeLessThan(anchor.cardedRate!);
    expect(floor.finalDisplayRate).toBe(floor.cardedRate);
  });
  it("browser policy hash is compatible with canonical SHA-256 and key ordering", () => {
    const base = {
      vertical: "home" as const,
      productId: 101,
      selectedRateId: 1101,
      selectedRateRole: "carded_pricing_anchor" as const,
      scoreModelId: 1001,
      scoreModelVersion: 1001,
      adjustmentRuleIds: [],
      marginSettingIds: [],
      approvalSettingIds: [],
      profitabilityDefaultIds: [],
      quoteFeeConfigured: true,
      capitalSettingId: 1,
      expectedLossPolicyId: 1501,
      expectedLossPolicyVersion: 1001,
      componentFallbacks: {
        product: false,
        scoreModel: false,
        scoreModelGovernance: false,
        margin: false,
        approval: false,
        profitability: false,
        fees: false,
        capital: false,
        expectedLoss: false,
      },
    };
    const a = buildPricingPolicySnapshot(
      { ...base, componentValues: { z: 2, a: 1 } },
      new Date("2026-01-01"),
    );
    const b = buildPricingPolicySnapshot(
      { ...base, componentValues: { a: 1, z: 2 } },
      new Date("2026-01-02"),
    );
    expect(a.componentValueHash).toBe(
      createHash("sha256").update('{"a":1,"z":2}').digest("hex"),
    );
    expect(a.bundleToken).toBe(b.bundleToken);
  });
});
