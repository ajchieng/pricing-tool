import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { GuidePage, ProfitabilityGuidePage } from "./GuidePages";
import { calculateHome, getDemoPolicy, sampleInput } from "@/lib/demo/pricing";
import { calcRequestSchema } from "@/lib/pricing/schema";
import { fmtMoney, fmtPct } from "@/lib/format";
import {
  getHomeGuidePolicy,
  getPersonalGuidePolicy,
  getCommercialGuidePolicy,
} from "@/components/score-guide/demo-guide-policy";

vi.mock("./DemoProvider", () => ({ useDemo: () => ({ ready: true }) }));

vi.mock("next/navigation", () => ({ usePathname: () => "/home-loans/guide/" }));

describe("restored pricing guides", () => {
  it.each(["home", "personal", "commercial"] as const)(
    "preserves the original %s guide hierarchy and actual fictional calibration",
    (area) => {
      const policy = getDemoPolicy(area);
      const rendered = renderToStaticMarkup(<GuidePage area={area} />);
      expect(rendered).toContain("Fictional demonstration assumptions");
      expect(rendered).toContain('aria-label="Guide sections"');
      expect(rendered).toContain(`href="/${area}-loans/guide/profitability"`);
      expect(rendered).toContain("Weights, bands and score-based discount");
      expect(rendered).toContain('aria-label="Category weight donut chart"');
      expect(rendered).toContain("Every factor in the model");
      expect(rendered).toContain("Active factor scoring rules");
      expect(rendered).toContain("Current quote rules");
      expect(rendered).toContain("Score bands");
      expect(rendered).toContain("Export PDF");
      for (const factor of policy.scoreModel.factors.filter(
        (item) => item.enabled,
      ))
        expect(rendered).toContain(factor.label);
      for (const band of policy.expectedLossPolicy.pdBands)
        expect(rendered).toContain(`${band.annualPdPct.toFixed(2)}%`);
      for (const rate of policy.rateSettings)
        expect(rendered).toContain(`${rate.rate.toFixed(2)}%`);
      expect(rendered).not.toMatch(
        /\/api\/|resolved by the server|auto-publishing/,
      );
      if (area === "home") expect(rendered).toContain("Alternative input:");
      if (area === "personal") expect(rendered).toContain("Affordability");
      if (area === "commercial") {
        expect(rendered).toContain("Cash-flow cover (DSCR)");
        expect(rendered).toContain("Customer Equity Contribution");
        expect(rendered).toContain("One quote represents one facility");
      }
    },
  );

  it.each(["home", "personal", "commercial"] as const)(
    "restores the separate %s profitability view with full financial detail",
    (area) => {
      const policy = getDemoPolicy(area);
      const rendered = renderToStaticMarkup(
        <ProfitabilityGuidePage area={area} />,
      );
      expect(rendered).toContain(
        `${area.charAt(0).toUpperCase() + area.slice(1)} loan profitability calculation guide`,
      );
      expect(rendered).toMatch(
        new RegExp(
          `aria-current="page"[^>]*href="/${area}-loans/guide/profitability"`,
        ),
      );
      expect(rendered).toContain(`${policy.capitalRatioPct.toFixed(2)}%`);
      expect(rendered).toContain(`${policy.taxRatePct.toFixed(2)}%`);
      expect(rendered).toMatch(/profit after tax/i);
      expect(rendered).toContain("provisional");
      expect(rendered).toContain("reasoned override");
      expect(rendered).not.toMatch(/auto-publishing|\/api\//);
      if (area === "home") {
        expect(rendered).toContain("17. Return on equity");
        expect(rendered).toContain("$420,000");
        expect(rendered).toContain("P&amp;L waterfall");
      }
      if (area === "commercial")
        expect(rendered).toContain("Two exposure views");
    },
  );

  it("uses the calculator result for the Home worked example, including expected loss and capital", () => {
    const input = calcRequestSchema.parse(sampleInput("home"));
    const initial = calculateHome(input);
    const requestedRate =
      Math.round((initial.suggestedRate! - 0.1) * 100) / 100;
    const { profitability } = calculateHome({ ...input, requestedRate });
    const rendered = renderToStaticMarkup(
      <ProfitabilityGuidePage area="home" />,
    );
    expect(rendered).toContain(fmtMoney(profitability.profitAfterTax!, 2));
    expect(rendered).toContain(
      fmtMoney(profitability.capitalAllocation!.allocatedCapital, 2),
    );
    expect(rendered).toContain(
      fmtPct(profitability.capitalAllocation!.returnOnEquity!),
    );
    expect(rendered).toContain(
      fmtPct(profitability.expectedLoss!.probabilityOfDefaultPct!),
    );
    expect(rendered).toContain(
      fmtPct(profitability.expectedLoss!.lossGivenDefaultPct!),
    );
  });

  it("derives presentation policies from the actual fictional domain configurations", () => {
    const home = getHomeGuidePolicy();
    expect(home.rateBands.map((rate) => rate.rate)).toEqual(
      getDemoPolicy("home").rateSettings.map((rate) => rate.rate),
    );
    const personal = getPersonalGuidePolicy();
    expect(personal.products.map((product) => product.cardedRate)).toEqual(
      getDemoPolicy("personal").rateSettings.map((rate) => rate.rate),
    );
    const commercial = getCommercialGuidePolicy();
    expect(
      commercial.facilities.flatMap((facility) =>
        facility.rates.map((rate) => rate.rate),
      ),
    ).toEqual(
      getDemoPolicy("commercial").rateSettings.map((rate) => rate.rate),
    );
  });
});
