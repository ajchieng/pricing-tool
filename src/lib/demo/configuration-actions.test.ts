import { IDBFactory } from "fake-indexeddb";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { createConfigurationActions } from "./configuration-actions";
import { CONFIGURATION_FORM_VERSION_FIELD } from "./configuration-form-version";
import {
  closeDemoConfiguration,
  getDemoConfiguration,
  initializeDemoConfiguration,
  readDemoConfigurationHistory,
  type DemoConfigurationTable,
} from "./configuration";

beforeEach(async () => {
  closeDemoConfiguration();
  vi.stubGlobal("indexedDB", new IDBFactory());
  await initializeDemoConfiguration();
});
afterEach(() => {
  closeDemoConfiguration();
  vi.unstubAllGlobals();
});

function formData(values: Record<string, unknown>) {
  const form = new FormData();
  for (const [key, value] of Object.entries(values)) {
    if (typeof value === "boolean") {
      if (value) form.set(key, "on");
    } else form.set(key, value == null ? "" : String(value));
  }
  return form;
}

const updateCases = [
  ["product", "updateProduct"],
  ["product_rate", "updateRate"],
  ["approval_rule", "updateApprovalRule"],
  ["margin_setting", "updateMarginSetting"],
  ["profitability_default", "updateProfitabilityDefault"],
  ["personal_loan_product", "updatePersonalLoanProduct"],
  ["personal_loan_product_rate", "updatePersonalLoanRate"],
  ["personal_margin_setting", "updatePersonalMarginSetting"],
  ["personal_approval_rule", "updatePersonalApprovalRule"],
  ["personal_profitability_default", "updatePersonalProfitabilityDefault"],
  ["commercial_loan_product", "updateCommercialLoanProduct"],
  ["commercial_loan_product_rate", "updateCommercialLoanRate"],
  ["commercial_margin_setting", "updateCommercialMarginSetting"],
  ["commercial_approval_setting", "updateCommercialApprovalSetting"],
  ["commercial_profitability_default", "updateCommercialProfitabilityDefault"],
  ["quote_fee_setting", "updateQuoteFeeSetting"],
] as const satisfies readonly (readonly [
  DemoConfigurationTable,
  keyof ReturnType<typeof createConfigurationActions>,
])[];

describe("original configuration form actions", () => {
  it.each(updateCases)(
    "persists the %s row form through the browser policy boundary",
    async (table, action) => {
      const before = getDemoConfiguration();
      const row = before.tables[table][0];
      expect(row, `missing fictional seed for ${table}`).toBeTruthy();
      await createConfigurationActions(before.version)[action](formData(row));
      expect(getDemoConfiguration().version).toBe(before.version + 1);
      expect((await readDemoConfigurationHistory())[0].targetType).toBe(table);
    },
  );

  it("creates and updates a discount rule with explicit scopes and booleans", async () => {
    await createConfigurationActions(
      getDemoConfiguration().version,
    ).createAdjustmentRule(
      formData({
        name: "Demo member discount",
        ruleType: "discount",
        adjustmentAmount: 0.1,
        conditionType: "existing_member",
        conditionOperator: "eq",
        conditionValue: "true",
        requiresApproval: false,
        priority: 100,
      }),
    );
    const row = getDemoConfiguration().tables.pricing_adjustment_rule.at(-1)!;
    await createConfigurationActions(
      getDemoConfiguration().version,
    ).updateAdjustmentRule(
      formData({ ...row, adjustmentAmount: 0.15, requiresApproval: true }),
    );
    expect(
      getDemoConfiguration().tables.pricing_adjustment_rule.at(-1),
    ).toMatchObject({ adjustmentAmount: 0.15, requiresApproval: true });
  });

  it("keeps the existing policy after an invalid rate or stale edit", async () => {
    const before = getDemoConfiguration();
    const rate = before.tables.product_rate[0];
    const actions = createConfigurationActions(before.version);
    await expect(
      actions.updateRate(formData({ ...rate, cardedRate: "not a rate" })),
    ).rejects.toThrow("must be a number");
    expect(getDemoConfiguration()).toBe(before);
    await actions.updateRate(formData({ ...rate, cardedRate: 7.15 }));
    await expect(
      actions.updateRate(formData({ ...rate, cardedRate: 7.35 })),
    ).rejects.toThrow();
    expect(getDemoConfiguration().tables.product_rate[0].cardedRate).toBe(7.15);
  });

  it("creates and deletes a rate using numeric fields without changing historical policy rows", async () => {
    const before = getDemoConfiguration();
    await createConfigurationActions(before.version).createRate(
      formData({
        productId: before.tables.product[0].id,
        lvrMin: 91,
        lvrMax: 95,
        cardedRate: 8.4,
        pricingRole: "carded_pricing_anchor",
      }),
    );
    const created = getDemoConfiguration().tables.product_rate.at(-1)!;
    expect(created).toMatchObject({ cardedRate: 8.4, active: true });
    await createConfigurationActions(getDemoConfiguration().version).deleteRate(
      formData({ id: created.id }),
    );
    expect(getDemoConfiguration().tables.product_rate).toEqual(
      before.tables.product_rate,
    );
  });

  it("never stores commission from an online profitability row", async () => {
    const before = getDemoConfiguration();
    const row = before.tables.personal_profitability_default.find(
      (item) => item.channel === "online",
    )!;
    await createConfigurationActions(
      before.version,
    ).updatePersonalProfitabilityDefault(
      formData({ ...row, commissionsPct: 5 }),
    );
    const saved =
      getDemoConfiguration().tables.personal_profitability_default.find(
        (item) => item.id === row.id,
      )!;
    expect(saved.commissionsPct ?? 0).toBe(0);
  });
});

it("rejects a dirty row's captured version even when the component received newer action closures", async () => {
  const before = getDemoConfiguration(),
    row = before.tables.product_rate[0];
  const staleDraft = formData({
    ...row,
    cardedRate: 6.7,
    [CONFIGURATION_FORM_VERSION_FIELD]: before.version,
  });
  await createConfigurationActions(before.version).updateRate(
    formData({ ...row, cardedRate: 7.1 }),
  );
  await expect(
    createConfigurationActions(getDemoConfiguration().version).updateRate(
      staleDraft,
    ),
  ).rejects.toThrow();
  expect(getDemoConfiguration().tables.product_rate[0].cardedRate).toBe(7.1);
  expect(staleDraft.get("cardedRate")).toBe("6.7");
});
