"use client";

import { useDemoConfiguration } from "@/lib/demo/configuration-react";
import { createConfigurationActions } from "@/lib/demo/configuration-actions";
import { ConfigurationForm } from "@/components/admin/ConfigurationForm";
import { btnRowSave, inp } from "@/components/adminUi";
import { Card } from "@/components/ui/Card";
import { StatusText } from "@/components/ui/StatusText";
import { adminConfigTargetId } from "@/lib/admin-config-search-core";
import type { QuoteFeeVertical } from "@/lib/pricing/quote-fees";

type QuoteFeeSettingRecord = {
  id: number;
  standardUpfrontFee: number;
  monthlyFee: number;
};

const VERTICAL_LABELS: Record<QuoteFeeVertical, string> = {
  home: "Home loan",
  personal: "Personal loan",
  commercial: "Commercial loan",
};

export function QuoteFeeSettingEditor({
  vertical,
  setting,
}: {
  vertical: QuoteFeeVertical;
  setting: QuoteFeeSettingRecord | null;
}) {
  const label = VERTICAL_LABELS[vertical];
  const configuration = useDemoConfiguration();
  const { updateQuoteFeeSetting } = createConfigurationActions(
    configuration.version,
  );

  return (
    <div
      id={
        setting
          ? adminConfigTargetId(`${vertical}-quote-fee`, setting.id)
          : undefined
      }
      data-admin-search-target={setting ? true : undefined}
      tabIndex={setting ? -1 : undefined}
    >
      <Card title="Quote fee defaults" titleAs="h2">
        <p className="max-w-[72ch] text-sm text-muted">
          The governed upfront and monthly fees are recognised as first-year fee
          income for {label.toLowerCase()} quotes. Quote creators may override
          either amount, including with an explicit zero waiver.
        </p>
        {setting ? (
          <ConfigurationForm
            action={updateQuoteFeeSetting}
            className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(9rem,1fr)_minmax(9rem,1fr)_minmax(14rem,1.25fr)_minmax(14rem,1.25fr)_auto] xl:items-end"
          >
            <input type="hidden" name="id" value={setting.id} />
            <input type="hidden" name="vertical" value={vertical} />
            <label className="text-sm font-medium text-ink">
              Standard upfront fee
              <input
                className={`${inp} mt-1`}
                type="number"
                name="standardUpfrontFee"
                min="0"
                step="0.01"
                defaultValue={setting.standardUpfrontFee}
                required
              />
            </label>
            <label className="text-sm font-medium text-ink">
              Monthly fee
              <input
                className={`${inp} mt-1`}
                type="number"
                name="monthlyFee"
                min="0"
                step="0.01"
                defaultValue={setting.monthlyFee}
                required
              />
            </label>
            <label className="text-sm font-medium text-ink">
              Change reason
              <input
                className={`${inp} mt-1`}
                name="changeReason"
                placeholder="Why are these fees changing?"
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
            <button className={btnRowSave} type="submit">
              Save fees
            </button>
          </ConfigurationForm>
        ) : (
          <p className="mt-4 text-sm text-muted">
            <StatusText tone="alert">Setting missing</StatusText> New quotes use
            $0 fees and show a policy warning until a governed
            {` ${label.toLowerCase()}`} fee setting is restored.
          </p>
        )}
      </Card>
    </div>
  );
}
