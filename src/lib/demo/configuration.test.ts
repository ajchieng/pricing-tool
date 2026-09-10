import { IDBFactory } from "fake-indexeddb";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import {
  closeDemoConfiguration,
  getDemoConfiguration,
  initializeDemoConfiguration,
  mutateDemoConfiguration,
  readDemoConfigurationHistory,
  resetDemoConfiguration,
  resetDemoDomainConfiguration,
  getDemoRiskDefinition,
  DEMO_CONFIGURATION_DATABASE_NAME,
  subscribeDemoConfiguration,
} from "./configuration";
import {
  calculateDemo,
  getDemoFormConfig,
  getDemoPolicy,
  sampleInput,
} from "./pricing";
import { closeDemoStore, initializeDemo, saveQuote, getQuote } from "./store";
import { saveDemoForm } from "./form-adapter";
import { draftFromCalculation } from "./presentation";
import type { DemoArea } from "./types";
import {
  PERSONAL_PROFITABILITY_CHANNEL_ASSUMPTIONS,
  PERSONAL_PROFITABILITY_SECURITY_ASSUMPTIONS,
} from "@/lib/pricing/personal/config";

beforeEach(async () => {
  closeDemoConfiguration();
  closeDemoStore();
  vi.stubGlobal("indexedDB", new IDBFactory());
  await initializeDemoConfiguration();
});
afterEach(() => {
  closeDemoConfiguration();
  closeDemoStore();
  vi.unstubAllGlobals();
});
function update(
  targetType:
    | "product_rate"
    | "personal_loan_product_rate"
    | "commercial_loan_product_rate"
    | "quote_fee_setting"
    | "capital_allocation_setting",
  data: Record<string, unknown>,
  index = 0,
) {
  const state = getDemoConfiguration();
  const { id, ...row } = state.tables[targetType][index];
  return mutateDemoConfiguration({
    expectedVersion: state.version,
    targetType,
    targetId: id,
    action: "update",
    data: { ...row, ...data },
    reason: "Test fictional policy sensitivity",
  });
}

describe("browser policy runtime", () => {
  it.each(["home", "personal", "commercial"] as const)(
    "uses %s rate edits immediately and freezes prior quote policy snapshots",
    async (area) => {
      const original = await calculateDemo(area, sampleInput(area));
      await initializeDemo([]);
      const saved = await saveQuote(
        draftFromCalculation(area, original.input, original.result),
      );
      const table =
        area === "home"
          ? "product_rate"
          : area === "personal"
            ? "personal_loan_product_rate"
            : "commercial_loan_product_rate";
      const field = area === "commercial" ? "baseRate" : "cardedRate";
      const rate = getDemoConfiguration().tables[table][0][field] as number;
      await update(table, { [field]: rate + 0.5 });
      const revised = await calculateDemo(area, sampleInput(area));
      expect(revised.result.finalDisplayRate).toBeCloseTo(
        original.result.finalDisplayRate! + 0.5,
      );
      expect((await getQuote(saved.id))?.result).toEqual(saved.result);
      expect(getDemoPolicy(area).rateSettings[0].rate).toBeCloseTo(rate + 0.5);
      expect((await readDemoConfigurationHistory())[0]).toMatchObject({
        action: "update",
        targetType: table,
        version: 2,
        before: { [field]: rate },
        after: { [field]: rate + 0.5 },
      });
    },
  );
  it("rejects saving a preview calculated under an earlier configuration version", async () => {
    const version = getDemoConfiguration().version;
    await update("capital_allocation_setting", { capitalRatioPct: 14 });
    await expect(
      saveDemoForm("home", sampleInput("home"), undefined, null, version),
    ).rejects.toThrow("Configuration changed");
    expect(await getQuote(1)).toBeUndefined();
  });

  it("preserves product linkage and effective dates when a row form updates only editable rate columns", async () => {
    const state = getDemoConfiguration();
    const before = state.tables.product_rate[0];
    await mutateDemoConfiguration({
      expectedVersion: state.version,
      targetType: "product_rate",
      targetId: before.id,
      action: "update",
      reason: "Original row form update",
      data: {
        lvrMin: 0,
        lvrMax: 70,
        cardedRate: 6.95,
        pricingRole: "carded_pricing_anchor",
        active: true,
      },
    });
    expect(getDemoConfiguration().tables.product_rate[0]).toMatchObject({
      productId: before.productId,
      effectiveFrom: before.effectiveFrom,
      comparisonRate: before.comparisonRate,
      cardedRate: 6.95,
    });
    const calculation = await calculateDemo("home", sampleInput("home"));
    expect(calculation.result.cardedRate).toBe(6.95);
  });

  it("commits one of two concurrent edits under the workspace version guard", async () => {
    const state = getDemoConfiguration();
    const input = {
      expectedVersion: state.version,
      targetType: "capital_allocation_setting" as const,
      targetId: 1,
      action: "update" as const,
      reason: "Capital sensitivity",
      data: { capitalRatioPct: 12 },
    };
    const attempts = await Promise.allSettled([
      mutateDemoConfiguration(input),
      mutateDemoConfiguration({ ...input, data: { capitalRatioPct: 13 } }),
    ]);
    expect(attempts.filter((row) => row.status === "fulfilled")).toHaveLength(
      1,
    );
    expect(attempts.find((row) => row.status === "rejected")).toMatchObject({
      reason: { code: "stale_configuration" },
    });
    expect(await readDemoConfigurationHistory()).toHaveLength(1);
  });
  it("rolls back invalid rows and audit together", async () => {
    await expect(update("product_rate", { cardedRate: -2 })).rejects.toThrow(
      "Carded rate must be at least 0.",
    );
    expect(getDemoConfiguration().version).toBe(1);
    expect(await readDemoConfigurationHistory()).toHaveLength(0);
  });
  it("persists updated configuration across reopening and resets both policy and history", async () => {
    await update("quote_fee_setting", { standardUpfrontFee: 725 });
    closeDemoConfiguration();
    await initializeDemoConfiguration();
    expect(getDemoFormConfig("home").quoteFeeSetting.standardUpfrontFee).toBe(
      725,
    );
    expect(await readDemoConfigurationHistory()).toHaveLength(1);
    await resetDemoConfiguration();
    expect(getDemoFormConfig("home").quoteFeeSetting.standardUpfrontFee).toBe(
      280,
    );
    expect(await readDemoConfigurationHistory()).toHaveLength(0);
  });
  it.each(["home", "personal", "commercial"] as const)(
    "audits complete %s score and expected-loss snapshots when restoring policy",
    async (area) => {
      const model = getDemoConfiguration().scoreModels[area];
      await mutateDemoConfiguration({
        expectedVersion: getDemoConfiguration().version,
        targetType: "score_model",
        action: "create",
        reason: "Custom fictional model before restoring defaults",
        data: {
          productArea: area,
          name: `Custom ${area} model`,
          description: "Preserve this model in reset history",
          modelJson: {
            factors: model.factors,
            bands: model.bands,
            rateCurve: model.rateCurve,
          },
        },
      });
      const calculation = await calculateDemo(area, sampleInput(area));
      await initializeDemo([]);
      const saved = await saveQuote(
        draftFromCalculation(area, calculation.input, calculation.result),
      );
      const before = getDemoConfiguration();
      await resetDemoDomainConfiguration(area, "policy", before.version);
      const after = getDemoConfiguration();
      const events = (await readDemoConfigurationHistory()).filter(
        (event) => event.version === after.version,
      );
      expect(events).toHaveLength(3);
      expect(
        events.find((event) => event.targetType === "score_model"),
      ).toMatchObject({
        action: "restore_defaults",
        before: before.scoreModels[area],
        after: after.scoreModels[area],
        targetId: after.scoreModels[area].id,
      });
      expect(
        events.find((event) => event.targetType === "expected_loss_policy"),
      ).toMatchObject({
        action: "restore_defaults",
        before: before.expectedLossPolicies[area],
        after: after.expectedLossPolicies[area],
        targetId: after.expectedLossPolicies[area].id,
      });
      expect(after.scoreModels[area].version).toBe(
        before.scoreModels[area].version + 1,
      );
      expect(after.expectedLossPolicies[area].version).toBe(
        before.expectedLossPolicies[area].version + 1,
      );
      expect(after.expectedLossPolicies[area].sourceScoreModelVersion).toBe(
        after.scoreModels[area].version,
      );
      closeDemoConfiguration();
      await initializeDemoConfiguration();
      expect(
        (await readDemoConfigurationHistory()).filter(
          (event) => event.version === after.version,
        ),
      ).toEqual(events);
      expect((await getQuote(saved.id))?.result).toEqual(saved.result);
    },
  );
  it.each(["inactive", "deleted", "blank"] as const)(
    "discloses incomplete Personal profitability for one %s scope while preserving engine assumptions",
    async (condition) => {
      const state = getDemoConfiguration();
      const row = state.tables.personal_profitability_default.find(
        (row) => row.channel === "direct" && row.securityType === "secured",
      )!;
      await mutateDemoConfiguration({
        expectedVersion: state.version,
        targetType: "personal_profitability_default",
        targetId: row.id,
        action: condition === "deleted" ? "delete" : "update",
        data:
          condition === "inactive" ? { active: false } : { expensesPct: null },
        reason: "Test one incomplete governed profitability scope",
      });
      const input = {
        ...sampleInput("personal"),
        commissions: null,
        otherIncome: null,
        expenses: null,
      };
      const { result } = await calculateDemo("personal", input);
      expect(result.policySnapshot?.componentFallbacks.profitability).toBe(
        true,
      );
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          code: "personal_profitability_fallback",
          message: expect.stringContaining("scopes are incomplete"),
        }),
      );
      expect(result.profitability.expenses).toBeCloseTo(
        (Number(input.loanAmount) *
          PERSONAL_PROFITABILITY_SECURITY_ASSUMPTIONS.secured.expensesPct) /
          100,
      );
      if (condition !== "blank")
        expect(result.profitability.otherIncome).toBeCloseTo(
          (Number(input.loanAmount) *
            PERSONAL_PROFITABILITY_CHANNEL_ASSUMPTIONS.direct.otherIncomePct) /
            100,
        );
      const explicit = await calculateDemo("personal", {
        ...input,
        commissions: 75,
        otherIncome: 125,
        expenses: 250,
      });
      expect(explicit.result.profitability).toMatchObject({
        commissions: 75,
        otherIncome: 125,
        expenses: 250,
      });
    },
  );
  it("treats blank online commissions as complete Personal policy", async () => {
    const { result } = await calculateDemo("personal", {
      ...sampleInput("personal"),
      channel: "online",
      commissions: 999,
    });
    expect(result.policySnapshot?.componentFallbacks.profitability).toBe(false);
    expect(result.profitability.commissions).toBe(0);
    expect(
      result.warnings.some(
        (warning) => warning.code === "personal_profitability_fallback",
      ),
    ).toBe(false);
  });
  it("uses published score versions without relabelling old expected-loss calibration", async () => {
    const state = getDemoConfiguration();
    const model = state.scoreModels.home;
    await mutateDemoConfiguration({
      expectedVersion: state.version,
      targetType: "score_model",
      action: "create",
      reason: "Fictional discount adjustment",
      data: {
        productArea: "home",
        name: "Edited fictional Home model",
        description: "Example",
        modelJson: {
          factors: model.factors,
          bands: model.bands,
          rateCurve: {
            ...model.rateCurve,
            maxDiscount: 1.5,
            discountSlope: 1.5 / (100 - model.rateCurve.neutralScore),
          },
        },
      },
    });
    expect(getDemoPolicy("home").scoreModel.version).toBe(model.version + 1);
    expect(getDemoPolicy("home").scoreModel.name).toBe(
      "Edited fictional Home model",
    );
    expect(
      getDemoConfiguration().expectedLossPolicies.home.sourceScoreModelVersion,
    ).toBe(model.version);
    const current = getDemoConfiguration();
    const loss = current.expectedLossPolicies.home;
    const { riskDefinitionHash, sourceScoreModelVersion } =
      getDemoRiskDefinition("home");
    const withoutIds = (rows: { id: number | null }[]) =>
      rows.map(({ id, ...row }) => {
        void id;
        return row;
      });
    await mutateDemoConfiguration({
      expectedVersion: current.version,
      targetType: "expected_loss_policy",
      action: "create",
      reason: "Republish compatible fictional expected loss",
      data: {
        vertical: "home",
        version: loss.version + 1,
        name: loss.name,
        description: loss.description,
        compatibleRiskDefinitionHash: riskDefinitionHash,
        sourceScoreModelArea: "home",
        sourceScoreModelVersion,
        effectiveFrom: loss.effectiveFrom.toISOString(),
        effectiveTo: null,
        active: true,
        pdBands: withoutIds(loss.pdBands),
        lgdBands: withoutIds(loss.lgdBands),
        eadSettings: withoutIds(loss.eadSettings),
      },
    });
    expect(
      getDemoPolicy("home").expectedLossPolicy.sourceScoreModelVersion,
    ).toBe(model.version + 1);
  });
  it.each(["personal", "commercial"] as DemoArea[])(
    "does not price from bootstrap when an active %s rate is removed",
    async (area) => {
      const state = getDemoConfiguration();
      const table =
        area === "personal"
          ? "personal_loan_product_rate"
          : "commercial_loan_product_rate";
      const { id, ...row } = state.tables[table][0];
      await mutateDemoConfiguration({
        expectedVersion: state.version,
        targetType: table,
        targetId: id,
        action: "update",
        data: { ...row, active: false },
        reason: "Remove rate example",
      });
      await expect(calculateDemo(area, sampleInput(area))).rejects.toThrow(
        "Configure an active",
      );
    },
  );
  it("refreshes cached policy when another tab broadcasts a committed change", async () => {
    const channels: Array<{ onmessage: (() => void) | null }> = [];
    class Channel {
      onmessage: (() => void) | null = null;
      constructor() {
        channels.push(this);
      }
      postMessage() {}
      close() {}
    }
    vi.stubGlobal("window", {
      addEventListener() {},
      localStorage: { setItem() {} },
    });
    vi.stubGlobal("BroadcastChannel", Channel);
    const refreshed = new Promise<void>((resolve) => {
      const unsubscribe = subscribeDemoConfiguration(() => {
        if (getDemoConfiguration().version === 2) {
          unsubscribe();
          resolve();
        }
      });
    });
    const db = await new Promise<IDBDatabase>((resolve) => {
      const request = indexedDB.open(DEMO_CONFIGURATION_DATABASE_NAME, 1);
      request.onsuccess = () => resolve(request.result);
    });
    const external = structuredClone(getDemoConfiguration());
    external.version = 2;
    external.tables.capital_allocation_setting[0].capitalRatioPct = 14;
    await new Promise<void>((resolve) => {
      const tx = db.transaction("configuration", "readwrite");
      tx.objectStore("configuration").put(external, "state");
      tx.oncomplete = () => resolve();
    });
    db.close();
    channels[0].onmessage?.();
    await refreshed;
    expect(getDemoPolicy("home").capitalRatioPct).toBe(14);
  });
  it("rejects a form opened before a reset even when its original version was the seed", async () => {
    const before = getDemoConfiguration().version;
    await resetDemoConfiguration();
    await expect(
      mutateDemoConfiguration({
        expectedVersion: before,
        targetType: "capital_allocation_setting",
        action: "update",
        targetId: 1,
        data: { capitalRatioPct: 16 },
        reason: "Stale pre-reset form",
      }),
    ).rejects.toMatchObject({ code: "stale_configuration" });
  });

  it("rejects an unsupported persisted configuration schema without overwriting it", async () => {
    closeDemoConfiguration();
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DEMO_CONFIGURATION_DATABASE_NAME, 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("configuration", "readwrite");
      tx.objectStore("configuration").put({ schemaVersion: 999 }, "state");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
    await expect(initializeDemoConfiguration()).rejects.toMatchObject({
      code: "unsupported_version",
    });
  });
});
