import { expect, it } from "vitest";
import { calculateDemo, sampleInput } from "./pricing";
import {
  assertDemoResultShape,
  canAcceptDemoFinancials,
} from "./snapshot-validation";

it.each(["home", "personal", "commercial"] as const)(
  "preserves %s normalized inputs on repeat parsing and validates the complete saved shape",
  async (area) => {
    const once = await calculateDemo(area, sampleInput(area));
    const twice = await calculateDemo(area, once.input);
    expect(twice.input).toEqual(once.input);
    expect(twice.result.profitability).toEqual(once.result.profitability);
    expect(() => assertDemoResultShape(area, once.result)).not.toThrow();
    expect(canAcceptDemoFinancials(once.result)).toBe(true);
    expect(() => assertDemoResultShape(area, {})).toThrow();
    expect(() =>
      assertDemoResultShape(area, { ...once.result, customerScore: {} }),
    ).toThrow();
  },
);

it("permits a structurally complete unpriced draft but does not accept it via a credit-loss override", async () => {
  const { result } = await calculateDemo("home", {
    ...sampleInput("home"),
    propertyValue: 300000,
    expectedCreditLossOverrideEnabled: true,
    expectedCreditLossOverrideAmount: 100,
    expectedCreditLossOverrideReason: "Illustrative assessment",
  });
  expect(result.finalDisplayRate).toBeNull();
  expect(result.profitability.expectedLoss?.basis).toBe("manual_override");
  expect(() => assertDemoResultShape("home", result)).not.toThrow();
  expect(canAcceptDemoFinancials(result)).toBe(false);
});
