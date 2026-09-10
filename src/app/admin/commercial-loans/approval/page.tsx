"use client";

import { useDemoConfiguration } from "@/lib/demo/configuration-react";
import { createConfigurationActions } from "@/lib/demo/configuration-actions";
import type { ConfigurationPageTables } from "@/lib/demo/configuration-page-types";
import { ConfigurationForm } from "@/components/admin/ConfigurationForm";
import { adminConfigTargetId } from "@/lib/admin-config-search-core";

import {
  adminTableDescription,
  adminTableHeader,
  adminTableShell,
  adminTableTitle,
  btn,
  inp,
} from "@/components/adminUi";
import { Badge } from "@/components/ui/Badge";
import { Field } from "@/components/ui/Field";
import {
  COMMERCIAL_APPROVAL,
  COMMERCIAL_CUSTOMER_CONCENTRATION_THRESHOLD_PCT,
  DSCR_BANDS,
} from "@/lib/pricing/commercial/config";

export default function CommercialApprovalAdmin() {
  const configuration = useDemoConfiguration();
  const tables = configuration.tables as unknown as ConfigurationPageTables;
  const { createCommercialApprovalSetting, updateCommercialApprovalSetting } =
    createConfigurationActions(configuration.version);
  const setting =
    tables.commercial_approval_setting.filter((row) => row.active).at(-1) ??
    null;

  const defaults = {
    seniorExposure:
      setting?.seniorExposure ?? COMMERCIAL_APPROVAL.seniorExposure,
    reviewExposure:
      setting?.reviewExposure ?? COMMERCIAL_APPROVAL.reviewExposure,
    requestedBelowIndicativeManager:
      setting?.requestedBelowIndicativeManager ??
      COMMERCIAL_APPROVAL.requestedBelowIndicativeManager,
    requestedBelowIndicativeSenior:
      setting?.requestedBelowIndicativeSenior ??
      COMMERCIAL_APPROVAL.requestedBelowIndicativeSenior,
    dscrStrongMin: setting?.dscrStrongMin ?? DSCR_BANDS.strongMin,
    dscrAcceptableMin: setting?.dscrAcceptableMin ?? DSCR_BANDS.acceptableMin,
    customerConcentrationThresholdPct:
      setting?.customerConcentrationThresholdPct ??
      COMMERCIAL_CUSTOMER_CONCENTRATION_THRESHOLD_PCT,
  };

  return (
    <div className="space-y-5">
      <section className={adminTableShell}>
        <div className={adminTableHeader}>
          <div>
            <h2 className={adminTableTitle}>Commercial policy thresholds</h2>
            <p className={adminTableDescription}>
              Govern the largest-customer question and the numeric thresholds
              used by code-owned approval escalation. Exposure limits are
              dollars; the concentration cutoff, discounts and DSCR bands are
              ratios or percentages.
            </p>
          </div>
          <Badge tone={setting ? "info" : "muted"} size="sm">
            {setting ? "Governed" : "Using code defaults"}
          </Badge>
        </div>
      </section>

      <ConfigurationForm
        action={
          setting
            ? updateCommercialApprovalSetting
            : createCommercialApprovalSetting
        }
        id={
          setting
            ? adminConfigTargetId("commercial-approval", setting.id)
            : undefined
        }
        data-admin-search-target={setting ? true : undefined}
        tabIndex={setting ? -1 : undefined}
        className="grid gap-3 text-sm sm:grid-cols-2"
      >
        {setting && <input type="hidden" name="id" value={setting.id} />}
        <input type="hidden" name="name" value="Commercial policy thresholds" />
        <Field label="Senior exposure ($ above => senior)">
          <input
            name="seniorExposure"
            defaultValue={defaults.seniorExposure}
            required
            aria-label="Senior exposure"
            className={inp}
          />
        </Field>
        <Field label="Review exposure ($ above => review)">
          <input
            name="reviewExposure"
            defaultValue={defaults.reviewExposure}
            required
            aria-label="Review exposure"
            className={inp}
          />
        </Field>
        <Field label="Requested discount => manager (%)">
          <input
            name="requestedBelowIndicativeManager"
            defaultValue={defaults.requestedBelowIndicativeManager}
            required
            aria-label="Requested discount manager"
            className={inp}
          />
        </Field>
        <Field label="Requested discount => senior (%)">
          <input
            name="requestedBelowIndicativeSenior"
            defaultValue={defaults.requestedBelowIndicativeSenior}
            required
            aria-label="Requested discount senior"
            className={inp}
          />
        </Field>
        <Field label="DSCR strong band (>=)">
          <input
            name="dscrStrongMin"
            defaultValue={defaults.dscrStrongMin}
            required
            aria-label="DSCR strong minimum"
            className={inp}
          />
        </Field>
        <Field label="DSCR acceptable band (>=)">
          <input
            name="dscrAcceptableMin"
            defaultValue={defaults.dscrAcceptableMin}
            required
            aria-label="DSCR acceptable minimum"
            className={inp}
          />
        </Field>
        <Field
          label="Largest customer revenue threshold (%)"
          helper="Quote staff answer whether the largest customer contributes more than this share of annual revenue."
        >
          <input
            name="customerConcentrationThresholdPct"
            type="number"
            min="0.01"
            max="99.99"
            step="0.01"
            defaultValue={defaults.customerConcentrationThresholdPct}
            required
            aria-label="Largest customer revenue concentration threshold"
            className={inp}
          />
        </Field>
        {setting && (
          <label className="flex items-center gap-2 text-muted">
            <input
              type="checkbox"
              name="active"
              defaultChecked={setting.active}
            />
            Active
          </label>
        )}
        <div className="sm:col-span-2">
          <button type="submit" className={btn}>
            {setting ? "Save policy thresholds" : "Create policy thresholds"}
          </button>
        </div>
      </ConfigurationForm>
    </div>
  );
}
