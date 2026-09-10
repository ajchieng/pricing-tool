"use client";

import { useDemoConfiguration } from "@/lib/demo/configuration-react";
import { createConfigurationActions } from "@/lib/demo/configuration-actions";
import { ConfigurationForm } from "@/components/admin/ConfigurationForm";
import Link from "next/link";
import { adminConfigTargetId } from "@/lib/admin-config-search-core";
import { btn, inp } from "@/components/adminUi";
import { Card } from "@/components/ui/Card";

export default function GlobalAssumptionsAdminPage() {
  const configuration = useDemoConfiguration();
  const setting = configuration.tables.capital_allocation_setting[0];
  const ratio =
    typeof setting?.capitalRatioPct === "number" ? setting.capitalRatioPct : 12;
  const { updateCapitalAllocationSetting } = createConfigurationActions(
    configuration.version,
  );

  return (
    <div className="space-y-5">
      <div
        id={adminConfigTargetId("global-capital", setting?.id ?? 1)}
        data-admin-search-target
        tabIndex={-1}
      >
        <Card>
          <h2 className="text-base font-semibold text-ink">
            Capital allocation
          </h2>
          <p className="mt-1 max-w-[72ch] text-sm text-muted">
            The fictional indicative capital ratio applies after the APS 112
            risk weight across home, personal and commercial lending. Changes
            are governed and snapshotted on new quotes; they do not rewrite
            historical ROE.
          </p>
          <ConfigurationForm
            action={updateCapitalAllocationSetting}
            className="mt-5 grid gap-4 md:grid-cols-2"
          >
            <label className="text-sm font-medium text-ink">
              Capital ratio (%)
              <input
                className={`${inp} mt-1`}
                type="number"
                name="capitalRatioPct"
                min="0.01"
                max="100"
                step="0.01"
                defaultValue={ratio}
                required
              />
            </label>
            <label className="text-sm font-medium text-ink">
              Change reason
              <input
                className={`${inp} mt-1`}
                name="changeReason"
                placeholder="Why is this assumption changing?"
                required
              />
            </label>
            <label className="text-sm font-medium text-ink">
              Effective from (optional, local time)
              <input
                className={`${inp} mt-1`}
                type="datetime-local"
                name="effectiveAt"
              />
            </label>
            <div className="flex items-end">
              <button className={btn} type="submit">
                Propose capital ratio
              </button>
            </div>
          </ConfigurationForm>
        </Card>
      </div>
      <Link
        href="/admin/governance"
        className="text-sm text-brand hover:underline"
      >
        View pending configuration changes
      </Link>
    </div>
  );
}
