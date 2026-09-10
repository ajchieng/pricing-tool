import {
  applyDemoConfigurationMutation,
  commitDemoConfiguration,
  type DemoConfiguration,
  type DemoConfigurationHistoryInput,
} from "./configuration";
import { SAMPLE_MARKET } from "./market";

type Selections = Record<
  number,
  { home: boolean; personal: boolean; commercial: boolean }
>;
export function saveDemoMarketSelections(
  expectedVersion: number,
  selected: Selections,
  reason: string,
) {
  return commitDemoConfiguration(expectedVersion, (draft) =>
    draft.tables.market_source_setting.map((row) => {
      const values = selected[row.id];
      if (!values)
        throw new Error("Choose selections for every fictional lender.");
      return applyDemoConfigurationMutation(draft, {
        targetType: "market_source_setting",
        action: "update",
        targetId: row.id,
        data: {
          name: row.name,
          enabledHome: values.home,
          enabledPersonal: values.personal,
          enabledCommercial: values.commercial,
        },
        reason: reason.trim() || "Updated fictional lender selections",
      });
    }),
  );
}
function updateProduct(
  draft: DemoConfiguration,
  productKey: string,
  active: boolean,
  reason: string,
): DemoConfigurationHistoryInput {
  if (!SAMPLE_MARKET.some((item) => item.id === productKey))
    throw new Error("Choose a product from the fictional catalogue.");
  const row = draft.tables.market_product_setting.find(
    (row) => row.productKey === productKey,
  );
  return applyDemoConfigurationMutation(draft, {
    targetType: "market_product_setting",
    action: row ? "update" : "create",
    targetId: row?.id,
    data: { productKey, active },
    reason,
  });
}
export function setDemoMarketProductActive(
  expectedVersion: number,
  productKey: string,
  active: boolean,
) {
  return commitDemoConfiguration(expectedVersion, (draft) => [
    updateProduct(
      draft,
      productKey,
      active,
      `${active ? "Included" : "Disabled"} fictional market product`,
    ),
  ]);
}
export function disableDemoHomeMarketRates(expectedVersion: number) {
  return commitDemoConfiguration(expectedVersion, (draft) =>
    SAMPLE_MARKET.filter((item) => item.area === "home").map((item) =>
      updateProduct(draft, item.id, false, "Disabled Home compatibility rates"),
    ),
  );
}
export function restoreDemoMarketCatalogue(expectedVersion: number) {
  return commitDemoConfiguration(expectedVersion, (draft) => {
    const events = draft.tables.market_source_setting.map((row) =>
      applyDemoConfigurationMutation(draft, {
        targetType: "market_source_setting",
        action: "update",
        targetId: row.id,
        data: {
          name: row.name,
          enabledHome: true,
          enabledPersonal: true,
          enabledCommercial: true,
        },
        reason: "Restored fictional catalogue selections",
      }),
    );
    for (const product of SAMPLE_MARKET)
      events.push(
        updateProduct(
          draft,
          product.id,
          true,
          "Restored fictional catalogue product",
        ),
      );
    events.push({
      targetType: "market_catalogue",
      action: "restored",
      targetId: null,
      reason: "Restored the bundled fictional catalogue and lender selections",
      before: null,
      after: {
        products: SAMPLE_MARKET.length,
        rates: SAMPLE_MARKET.length,
        sources: draft.tables.market_source_setting.length,
      },
    });
    return events;
  });
}
