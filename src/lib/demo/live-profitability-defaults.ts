/** Resolve only untouched defaults at render/calculation time; saved revisions and explicit edits retain their values. */
type ProfitLines = {
  commissions: string;
  otherIncome: string;
  expenses: string;
};
export function liveDemoProfitabilityLines(
  form: ProfitLines & { channel: string },
  flags: Record<keyof ProfitLines, boolean>,
  defaults: ProfitLines,
  unit: "percent" | "dollar",
  exposure: number,
): ProfitLines {
  const value = (key: keyof ProfitLines) => {
    if (key === "commissions" && form.channel === "online") return "0";
    if (!flags[key]) return form[key];
    const percent = defaults[key];
    if (!percent || unit === "percent") return percent;
    const rate = Number(percent);
    return Number.isFinite(rate) && exposure > 0
      ? String(Math.round(exposure * rate) / 100)
      : "";
  };
  return {
    commissions: value("commissions"),
    otherIncome: value("otherIncome"),
    expenses: value("expenses"),
  };
}
