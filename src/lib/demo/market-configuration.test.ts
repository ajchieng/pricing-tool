import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { getDemoConfiguration, resetDemoConfiguration } from "./configuration";
import { parseSearchParams } from "@/lib/market/search/params";
import { searchDemoMarket } from "./market-search";
import { getMarketEvidence } from "./market";
import {
  disableDemoHomeMarketRates,
  restoreDemoMarketCatalogue,
  saveDemoMarketSelections,
  setDemoMarketProductActive,
} from "./market-configuration";

describe("fictional market configuration", () => {
  beforeEach(async () => {
    await resetDemoConfiguration();
  });

  it("applies lender selections by domain while preserving the other domains", async () => {
    const configuration = getDemoConfiguration();
    const selections = Object.fromEntries(
      configuration.tables.market_source_setting.map((row) => [
        row.id,
        {
          home: true,
          personal: row.name !== "Riverbank Demo",
          commercial: true,
        },
      ]),
    );
    await saveDemoMarketSelections(
      configuration.version,
      selections,
      "Example Personal selection",
    );
    expect(searchDemoMarket(parseSearchParams({}, "home")).total).toBe(3);
    expect(searchDemoMarket(parseSearchParams({}, "personal")).total).toBe(2);
    expect(searchDemoMarket(parseSearchParams({}, "commercial")).total).toBe(3);
  });

  it("removes suppressed products from results, comparison and new handoffs without changing captured evidence", async () => {
    const captured = getMarketEvidence("home-river");
    const before = structuredClone(captured);
    await setDemoMarketProductActive(
      getDemoConfiguration().version,
      "home-river",
      false,
    );
    const response = searchDemoMarket(
      parseSearchParams(
        { productId: "home-river", compare: "home-river,home-horizon" },
        "home",
      ),
    );
    expect(response.total).toBe(2);
    expect(response.selected).toBeNull();
    expect(
      response.comparison.some((item) => item.product.id === "home-river"),
    ).toBe(false);
    expect(getMarketEvidence("home-river")).toBeNull();
    expect(captured).toEqual(before);
  });

  it("can disable Home rates and restore the complete fictional catalogue", async () => {
    await disableDemoHomeMarketRates(getDemoConfiguration().version);
    expect(searchDemoMarket(parseSearchParams({}, "home")).total).toBe(0);
    expect(searchDemoMarket(parseSearchParams({}, "personal")).total).toBe(3);
    await restoreDemoMarketCatalogue(getDemoConfiguration().version);
    expect(searchDemoMarket(parseSearchParams({}, "home")).total).toBe(3);
    expect(getMarketEvidence("home-river")).not.toBeNull();
  });
});
