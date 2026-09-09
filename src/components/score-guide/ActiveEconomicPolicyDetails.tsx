import type { ExpectedLossPolicyConfig } from "@/lib/pricing/credit-risk/policy-validation";
import { fmtPct } from "@/lib/format";

export function ActiveEconomicPolicyDetails({
  expectedLossPolicy,
}: {
  expectedLossPolicy: ExpectedLossPolicyConfig | null;
}) {
  return (
    <section className="border-y border-border py-5">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Active economic policy</h2>
        <p className="text-sm text-muted">
          This is the active expected-loss setting used by new calculations.
        </p>
      </div>
      <div>
        <div className="border-t border-border pt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Expected credit loss
          </p>
          {expectedLossPolicy ? (
            <>
              <p className="mt-2 font-semibold text-ink">
                {expectedLossPolicy.name} v{expectedLossPolicy.version}
              </p>
              <p className="mt-2 text-xs leading-5 text-muted">
                Bound to {expectedLossPolicy.sourceScoreModelArea} score model v
                {expectedLossPolicy.sourceScoreModelVersion} ·{" "}
                {
                  expectedLossPolicy.pdBands.filter((band) => band.active)
                    .length
                }{" "}
                PD grades ·{" "}
                {
                  expectedLossPolicy.lgdBands.filter((band) => band.active)
                    .length
                }{" "}
                LGD scopes ·{" "}
                {
                  expectedLossPolicy.eadSettings.filter(
                    (setting) => setting.active,
                  ).length
                }{" "}
                EAD methods.
              </p>
              <p className="mt-2 font-mono text-xs text-muted">
                expected loss = PD × LGD × EAD
              </p>
              <p className="mt-2 text-xs leading-5 text-muted">
                Pricing and credit risk use separate assessments. Missing
                required risk facts stay incomplete. An explicit provisional
                loss amount (default zero) may complete provisional P&amp;L;
                only a saved, reasoned override satisfies review acceptance.
              </p>
              <div className="mt-5 grid gap-6 lg:grid-cols-2">
                <PolicyTable
                  title="Probability of default bands"
                  columns={["Risk grade", "Minimum risk score", "Annual PD"]}
                  rows={expectedLossPolicy.pdBands
                    .filter((band) => band.active)
                    .map((band) => [
                      band.riskGrade,
                      String(band.minRiskScore),
                      fmtPct(band.annualPdPct),
                    ])}
                />
                <PolicyTable
                  title="Loss given default by security scope"
                  columns={["Loss scope", "LGD"]}
                  rows={expectedLossPolicy.lgdBands
                    .filter((band) => band.active)
                    .map((band) => [
                      band.lossScope.replaceAll("_", " "),
                      fmtPct(band.lgdPct),
                    ])}
                />
              </div>
              <div className="mt-5">
                <PolicyTable
                  title="Exposure methods"
                  columns={["Exposure", "Method", "Undrawn conversion factor"]}
                  rows={expectedLossPolicy.eadSettings
                    .filter((setting) => setting.active)
                    .map((setting) => [
                      setting.exposureScope.replaceAll("_", " "),
                      setting.method.replaceAll("_", " "),
                      setting.undrawnCcfPct == null
                        ? "Not applicable"
                        : fmtPct(setting.undrawnCcfPct),
                    ])}
                />
              </div>
            </>
          ) : (
            <>
              <p className="mt-2 font-semibold text-ink">Not configured</p>
              <p className="mt-2 text-xs text-muted">
                Customer pricing remains available. Model expected loss is
                unavailable; an explicit provisional amount does not complete
                the risk assessment.
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function PolicyTable({
  title,
  columns,
  rows,
}: {
  title: string;
  columns: string[];
  rows: string[][];
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      <div
        className="mt-3 overflow-x-auto"
        role="region"
        aria-label={title}
        tabIndex={0}
      >
        <table className="w-full text-left text-xs">
          <thead className="border-y border-border bg-panel/50 text-muted">
            <tr>
              {columns.map((column) => (
                <th key={column} scope="col" className="px-3 py-2 font-medium">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row[0]} className="border-b border-border">
                {row.map((value, index) => (
                  <td
                    key={columns[index]}
                    className={`px-3 py-2 ${index ? "tnum" : ""}`}
                  >
                    {value}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
