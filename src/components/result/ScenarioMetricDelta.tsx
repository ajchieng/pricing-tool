import { fmtMoney } from "@/lib/format";

export type ScenarioDeltaKind = "money" | "percentage-point";

export function formatScenarioDelta(
  current: number | null | undefined,
  baseline: number | null | undefined,
  kind: ScenarioDeltaKind,
): string | null {
  if (
    current == null ||
    baseline == null ||
    !Number.isFinite(current) ||
    !Number.isFinite(baseline)
  ) {
    return null;
  }
  const delta = current - baseline;
  const sign = delta > 0 ? "+" : delta < 0 ? "−" : "±";
  const magnitude = Math.abs(delta);
  return kind === "money"
    ? `${sign}${fmtMoney(magnitude, 0)} vs current`
    : `${sign}${magnitude.toFixed(2)} pp vs current`;
}

export function ScenarioMetricDelta({
  current,
  baseline,
  kind,
}: {
  current: number | null | undefined;
  baseline: number | null | undefined;
  kind: ScenarioDeltaKind;
}) {
  const text = formatScenarioDelta(current, baseline, kind);
  if (!text) return null;
  const delta = current! - baseline!;
  return (
    <span
      className={`block text-[11px] font-medium leading-4 ${
        delta > 0 ? "text-ok" : delta < 0 ? "text-warn" : "text-muted"
      }`}
    >
      {text}
    </span>
  );
}

export function ScenarioMetricValue({
  children,
  current,
  baseline,
  kind,
}: {
  children: React.ReactNode;
  current: number | null | undefined;
  baseline: number | null | undefined;
  kind: ScenarioDeltaKind;
}) {
  return (
    <span className="inline-flex flex-col items-end">
      <span>{children}</span>
      <ScenarioMetricDelta current={current} baseline={baseline} kind={kind} />
    </span>
  );
}
