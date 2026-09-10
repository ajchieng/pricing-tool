import { describe, expect, it } from "vitest";
import { DEFAULT_CUSTOMER_SCORE_MODEL } from "@/lib/pricing/customer-score";
import { DEFAULT_PERSONAL_SCORE_MODEL } from "@/lib/pricing/personal/score-model";
import { DEFAULT_COMMERCIAL_SCORE_MODEL } from "@/lib/pricing/commercial/score-model";
import { previewDemoScoreModel } from "./score-model-preview";

describe("browser score-model preview", () => {
  const models = {
    home: DEFAULT_CUSTOMER_SCORE_MODEL,
    personal: DEFAULT_PERSONAL_SCORE_MODEL,
    commercial: DEFAULT_COMMERCIAL_SCORE_MODEL,
  } as const;

  for (const area of ["home", "personal", "commercial"] as const) {
    it(`compares ${area} drafts with the active engine without changing the active policy`, () => {
      const active = structuredClone(models[area]);
      const draft = structuredClone(active);
      const factor = draft.factors.find(
        (item) => item.enabled && item.weight > 0,
      )!;
      factor.mappings = factor.mappings?.map((mapping) => ({
        ...mapping,
        score: 0,
      }));
      factor.rules = factor.rules?.map((rule) => ({ ...rule, score: 0 }));
      factor.points = factor.points?.map((point) => ({ ...point, score: 0 }));
      factor.missingScore = 0;
      const baseline = previewDemoScoreModel(area, active, active);
      const result = previewDemoScoreModel(area, active, draft);
      expect(baseline.active).toEqual(baseline.draft);
      expect(result.active).toEqual(baseline.active);
      expect(result.draft.score).toBeLessThan(result.active.score);
      expect(active).toEqual(models[area]);
    });
  }

  it("rejects invalid draft weights before calculating a preview", () => {
    const draft = structuredClone(DEFAULT_CUSTOMER_SCORE_MODEL);
    draft.factors[0].weight = -1;
    expect(() =>
      previewDemoScoreModel("home", DEFAULT_CUSTOMER_SCORE_MODEL, draft),
    ).toThrow();
  });
});
