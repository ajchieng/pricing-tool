import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AboutPage, GuidePage } from "./ReferencePages";
import { getDemoPolicy } from "@/lib/demo/pricing";

describe("fictional policy reference", () => {
  it.each(["home", "personal", "commercial"] as const)(
    "renders the actual %s policy rather than a duplicate calibration",
    (area) => {
      const policy = getDemoPolicy(area);
      const rendered = renderToStaticMarkup(<GuidePage area={area} />);
      expect(rendered).toContain("Fictional demonstration assumptions");
      expect(rendered).toContain("Pricing review thresholds");
      expect(rendered).toContain("Margin policy");
      expect(rendered).toContain("Probability of default bands");
      for (const factor of policy.scoreModel.factors.filter(
        (item) => item.enabled,
      ))
        expect(rendered).toContain(factor.label);
      for (const band of policy.expectedLossPolicy.pdBands)
        expect(rendered).toContain(`${band.annualPdPct.toFixed(2)}%`);
      if (area === "commercial") {
        for (const rate of policy.rateSettings)
          expect(rendered).toContain(`${rate.rate.toFixed(2)}%`);
      }
      if (area === "home") expect(rendered).toContain("Alternative input:");
    },
  );

  it("explains browser isolation and snapshots without unsupported claims", () => {
    const rendered = renderToStaticMarkup(<AboutPage />);
    expect(rendered).toContain("https://github.com/ajchieng/pricing-tool");
    expect(rendered).toContain("Historical pricing stays frozen");
    expect(rendered).toContain("Changes stay in this browser");
    expect(rendered).toContain("fictional products");
  });
});
