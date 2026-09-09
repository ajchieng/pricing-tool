import { describe, expect, it } from "vitest";
import { searchDemoMarket } from "./market-search";
import { parseSearchParams, searchParamsFor } from "@/lib/market/search/params";
import { summariseFees } from "@/lib/market/compare/calculations";

describe("browser market presentation", () => {
  it.each(["home", "personal", "commercial"] as const)(
    "keeps %s selections and evidence in their lending area",
    (area) => {
      const filters = parseSearchParams(
        {
          compare: [`${area}-river`, "other-area-product"],
          product: `${area}-river`,
        },
        area,
      );
      const response = searchDemoMarket(filters);
      expect(response.results).toHaveLength(3);
      expect(response.comparison.map(({ product }) => product.id)).toEqual([
        `${area}-river`,
      ]);
      expect(response.selected?.id).toBe(`${area}-river`);
      expect(response.selected?.lendingRates[0].id).toBe(`${area}-river`);
      const query = searchParamsFor(filters);
      expect(query.getAll("compare")).toEqual([
        `${area}-river`,
        "other-area-product",
      ]);
      if (area !== "home") expect(query.get("area")).toBe(area);
    },
  );

  it("filters actual product features while preserving selected products for comparison", () => {
    const response = searchDemoMarket(
      parseSearchParams({
        q: "variable loan with an offset account",
        compare: ["home-river", "home-summit"],
      }),
    );
    expect(response.results.map(({ product }) => product.id)).toEqual([
      "home-river",
    ]);
    expect(
      response.comparison.map(({ matchesFilters }) => matchesFilters),
    ).toEqual([true, false]);
    const withoutFee = searchDemoMarket(
      parseSearchParams({ noOngoingFee: "1" }),
    );
    expect(withoutFee.results.map(({ product }) => product.id)).toEqual([
      "home-horizon",
    ]);
  });

  it("preserves commercial revolving evidence and annual fee presentation", () => {
    const response = searchDemoMarket(
      parseSearchParams({ facilityCategory: "overdraft" }, "commercial"),
    );
    expect(response.results).toHaveLength(1);
    expect(response.results[0].product.productCategory).toBe("OVERDRAFTS");
    expect(response.results[0].rate.repaymentType).toBe("REVOLVING");
    expect(summariseFees(response.results[0].product.fees).annualPeriodic).toBe(
      480,
    );
  });
});
