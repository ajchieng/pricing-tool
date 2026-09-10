"use client";

import { useState } from "react";
import { useDemoConfiguration } from "@/lib/demo/configuration-react";
import { getDemoRiskDefinition } from "@/lib/demo/configuration";
import { ConfigurationModelHistory } from "./ConfigurationModelHistory";
import { Card } from "@/components/ui/Card";
import { ExpectedLossPolicyDraftEditor } from "./ExpectedLossPolicyDraftEditor";
import {
  expectedLossPolicyValidationErrors,
  requiredExpectedLossScopes,
} from "@/lib/pricing/credit-risk/policy-validation";
import { adminConfigTargetId } from "@/lib/admin-config-search-core";

type Vertical = "home" | "personal" | "commercial";

export function ExpectedLossPolicyAdmin({
  vertical,
}: {
  vertical: Vertical;
  embedded?: boolean;
}) {
  const [draftGeneration, setDraftGeneration] = useState(0);
  const configuration = useDemoConfiguration();
  const active = configuration.expectedLossPolicies[vertical];
  const model = configuration.scoreModels[vertical];
  const policies = [active];
  const activeErrors = expectedLossPolicyValidationErrors(active);
  const scopes = requiredExpectedLossScopes(vertical);
  const activeRiskHash = getDemoRiskDefinition(
    vertical,
    model,
  ).riskDefinitionHash;
  const compatible = active.compatibleRiskDefinitionHash === activeRiskHash;

  return (
    <div className="space-y-5">
      <div
        id={
          active?.id != null
            ? adminConfigTargetId(`${vertical}-expected-loss`, active.id)
            : undefined
        }
        data-admin-search-target={active ? true : undefined}
        tabIndex={active ? -1 : undefined}
      >
        <Card>
          <h2 className="text-base font-semibold text-ink">
            Active expected-loss policy
          </h2>
          {!active ? (
            <p className="mt-2 text-sm text-muted">Not configured.</p>
          ) : (
            <>
              <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <p>
                  <span className="text-muted">Policy:</span> {active.name} v
                  {active.version}
                </p>
                <p>
                  <span className="text-muted">Score model:</span>{" "}
                  {active.sourceScoreModelArea} v
                  {active.sourceScoreModelVersion}
                </p>
                <p>
                  <span className="text-muted">Compatibility:</span>{" "}
                  {compatible ? "Compatible" : "Incompatible"}
                </p>
                <p>
                  <span className="text-muted">Effective:</span>{" "}
                  {active.effectiveFrom.toLocaleDateString("en-AU")}
                </p>
              </div>
              <code className="mt-3 block break-all rounded bg-panel p-2 text-xs">
                {active.compatibleRiskDefinitionHash}
              </code>
              {activeErrors.length > 0 && (
                <ul className="mt-3 list-disc pl-5 text-sm text-alert">
                  {activeErrors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              )}
              <div className="mt-4 grid gap-4 xl:grid-cols-3">
                <PolicyTable
                  title="PD bands"
                  headings={["Grade", "Min score", "PD"]}
                  rows={active.pdBands.map((band) => [
                    band.riskGrade,
                    band.minRiskScore.toString(),
                    `${band.annualPdPct}%`,
                  ])}
                />
                <PolicyTable
                  title="LGD scopes"
                  headings={["Scope", "LGD"]}
                  rows={active.lgdBands.map((band) => [
                    band.lossScope,
                    `${band.lgdPct}%`,
                  ])}
                />
                <PolicyTable
                  title="EAD settings"
                  headings={["Scope", "Method", "CCF"]}
                  rows={active.eadSettings.map((setting) => [
                    setting.exposureScope,
                    setting.method,
                    setting.undrawnCcfPct == null
                      ? "—"
                      : `${setting.undrawnCcfPct}%`,
                  ])}
                />
              </div>
            </>
          )}
        </Card>
      </div>

      <Card>
        <h2 className="text-base font-semibold text-ink">
          Propose a new policy version
        </h2>
        <p className="mt-1 text-sm text-muted">
          Fictional PD, LGD and EAD assumptions are supplied here through
          governance. Published versions apply to calculations in this browser.
        </p>
        <div className="mt-5">
          {model && activeRiskHash ? (
            <ExpectedLossPolicyDraftEditor
              key={`${vertical}-${draftGeneration}`}
              vertical={vertical}
              configurationVersion={configuration.version}
              onReload={() =>
                setDraftGeneration((generation) => generation + 1)
              }
              nextVersion={
                Math.max(0, ...policies.map((item) => item.version)) + 1
              }
              riskDefinitionHash={activeRiskHash}
              sourceScoreModelVersion={model.version}
              lgdScopes={scopes.lgd}
              eadScopes={scopes.ead}
              effectiveFrom={new Date().toISOString().slice(0, 10)}
            />
          ) : (
            <p className="text-sm text-muted">
              Publish a governed active score model before proposing expected
              loss.
            </p>
          )}
        </div>
      </Card>

      <ConfigurationModelHistory
        vertical={vertical}
        targetType="expected_loss_policy"
        configurationVersion={configuration.version}
      />
    </div>
  );
}

function PolicyTable({
  title,
  headings,
  rows,
}: {
  title: string;
  headings: string[];
  rows: string[][];
}) {
  return (
    <div className="overflow-x-auto">
      <h3 className="mb-2 text-sm font-semibold text-ink">{title}</h3>
      <table className="w-full text-left text-xs">
        <thead className="border-b border-border text-muted">
          <tr>
            {headings.map((heading) => (
              <th className="px-2 py-2" key={heading}>
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row, rowIndex) => (
            <tr key={`${row[0]}-${rowIndex}`}>
              {row.map((cell, cellIndex) => (
                <td className="px-2 py-2" key={`${cell}-${cellIndex}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
