import { describe, expect, it } from "vitest";
import { liveDemoProfitabilityLines } from "./live-profitability-defaults";
describe("live form defaults", () => {
  const form = {
    channel: "direct",
    commissions: "0",
    otherIncome: "0.08",
    expenses: "1.2",
  };
  const defaults = { commissions: "0.4", otherIncome: "0.15", expenses: "0.8" };
  it("tracks new defaults only for untouched inputs and preserves overrides", () => {
    expect(
      liveDemoProfitabilityLines(
        form,
        { commissions: true, otherIncome: true, expenses: false },
        defaults,
        "percent",
        10000,
      ),
    ).toEqual({ commissions: "0.4", otherIncome: "0.15", expenses: "1.2" });
  });
  it("converts current defaults against facility exposure in dollar mode", () => {
    expect(
      liveDemoProfitabilityLines(
        form,
        { commissions: true, otherIncome: true, expenses: true },
        defaults,
        "dollar",
        50000,
      ),
    ).toEqual({ commissions: "200", otherIncome: "75", expenses: "400" });
  });
  it("retains explicit saved revision dollars and keeps online commissions zero", () => {
    const revision = {
      channel: "online",
      commissions: "250",
      otherIncome: "125",
      expenses: "450",
    };
    expect(
      liveDemoProfitabilityLines(
        revision,
        { commissions: false, otherIncome: false, expenses: false },
        defaults,
        "dollar",
        200000,
      ),
    ).toEqual({ commissions: "0", otherIncome: "125", expenses: "450" });
  });
});
