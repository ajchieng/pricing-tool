import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildHomeQuoteRequest } from "@/components/home-loans/pricing-request";
import { buildPersonalQuoteRequest } from "@/components/personal-loans/pricing-request";
import { buildCommercialQuoteRequest } from "@/components/commercial-loans/pricing-request";
import { demoFormValues } from "./form-values";
import { calculateDemo, sampleInput } from "./pricing";
import { saveDemoForm } from "./form-adapter";
import { closeDemoStore, getQuote } from "./store";
import type { DemoArea } from "./types";

function formRequest(area: DemoArea, input: Record<string, unknown>) {
  const common = {
    marketRateId: null,
    costOfFundsSource: "override" as const,
    profitInputUnit: "dollar" as const,
  };
  if (area === "home")
    return buildHomeQuoteRequest({
      ...demoFormValues("home", input),
      ...common,
      revisedFromQuoteId: null,
    });
  if (area === "personal")
    return buildPersonalQuoteRequest({
      form: demoFormValues("personal", input),
      ...common,
    });
  return buildCommercialQuoteRequest({
    form: demoFormValues("commercial", input),
    ...common,
  });
}

beforeEach(() => {
  closeDemoStore();
  vi.stubGlobal("indexedDB", new IDBFactory());
});
afterEach(() => {
  closeDemoStore();
  vi.unstubAllGlobals();
});

describe("full form browser adapters", () => {
  it.each(["home", "personal", "commercial"] as const)(
    "restores %s financial inputs without changing pricing, capital or ECL",
    async (area) => {
      const original = await calculateDemo(area, sampleInput(area));
      const restored = await calculateDemo(
        area,
        formRequest(area, original.input),
      );
      expect(restored.result.finalDisplayRate).toBe(
        original.result.finalDisplayRate,
      );
      expect(restored.result.monthlyRepayment).toBe(
        original.result.monthlyRepayment,
      );
      expect(restored.result.profitability).toEqual(
        original.result.profitability,
      );
    },
  );

  it.each(["home", "personal", "commercial"] as const)(
    "saves canonical %s snapshots and keeps the previous revision frozen",
    async (area) => {
      const input = {
        ...sampleInput(area),
        channel: "online",
        commissions: 1234,
      };
      const first = await saveDemoForm(area, input);
      expect(first.input.commissions).toBe(0);
      const result = first.result as {
        finalDisplayRate: number;
        policySnapshot: unknown;
      };
      expect(result.policySnapshot).toBeTruthy();
      const second = await saveDemoForm(
        area,
        { ...first.input, requestedRate: result.finalDisplayRate + 0.1 },
        first.id,
      );
      expect(second.revision).toBe(2);
      expect((await getQuote(area, first.id))?.result).toEqual(first.result);
      expect(second.summary.rate).not.toBe(first.summary.rate);
    },
  );

  it("maps nested commercial securities and retention choices without losing meaning", () => {
    const commercial = demoFormValues("commercial", {
      securities: [
        {
          type: "cash_deposits",
          value: 150000,
          description: "Sample deposit",
          isPrimary: true,
        },
      ],
      operatingInRegion: false,
      largestCustomerRevenueAboveThreshold: true,
    });
    expect(commercial.securities[0]).toMatchObject({
      type: "cash_deposits",
      value: "150000",
      description: "Sample deposit",
      isPrimary: true,
    });
    expect(commercial.operatingInRegion).toBe("no");
    expect(commercial.largestCustomerRevenueAboveThreshold).toBe("yes");
    const home = demoFormValues("home", {
      customerStream: "retention",
      retentionArrearsHardship18Months: false,
      upfrontFeeOverride: 0,
    });
    expect(home.retentionArrearsHardship18Months).toBe("no");
    expect(home.upfrontFeeOverrideEnabled).toBe(true);
    expect(home.upfrontFeeOverride).toBe("0");
  });

  it("does not persist blank customer references or failed browser saves", async () => {
    await expect(
      saveDemoForm("home", { ...sampleInput("home"), customerReference: "" }),
    ).rejects.toThrow("customer reference");
    vi.stubGlobal("indexedDB", undefined);
    await expect(
      saveDemoForm("personal", sampleInput("personal")),
    ).rejects.toThrow();
  });
});
