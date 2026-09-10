"use client";

import { useDemoConfiguration } from "@/lib/demo/configuration-react";
import { createConfigurationActions } from "@/lib/demo/configuration-actions";
import { ConfigurationForm } from "@/components/admin/ConfigurationForm";
import { useDemoDisplaySettings } from "@/lib/demo/configuration-display";
import {
  adminTableDescription,
  adminTableHeader,
  adminTableShell,
  adminTableTitle,
  btn,
} from "@/components/adminUi";
import { adminConfigTargetId } from "@/lib/admin-config-search-core";
import { Badge } from "@/components/ui/Badge";

export default function AdminDisplayPage() {
  const configuration = useDemoConfiguration();
  const settings = useDemoDisplaySettings();
  const { updateQuoteDetailDisplaySettings } = createConfigurationActions(
    configuration.version,
  );

  return (
    <section
      id={adminConfigTargetId("global-display", 1)}
      data-admin-search-target
      tabIndex={-1}
      className={adminTableShell}
    >
      <div className={adminTableHeader}>
        <div>
          <h2 className={adminTableTitle}>Quote detail display</h2>
          <p className={adminTableDescription}>
            Control presentation-only elements on saved quote pages. These
            settings do not change quote data, pricing calculations or approval
            decisions.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge
            tone={settings.showQuoteHandoffStatus ? "ok" : "muted"}
            size="sm"
          >
            Handoff {settings.showQuoteHandoffStatus ? "on" : "off"}
          </Badge>
          <Badge tone={settings.highContrast ? "ok" : "muted"} size="sm">
            Contrast {settings.highContrast ? "high" : "standard"}
          </Badge>
          <Badge tone={settings.comfortableDensity ? "ok" : "muted"} size="sm">
            Density {settings.comfortableDensity ? "comfortable" : "compact"}
          </Badge>
          <Badge tone={settings.largeNumericDisplay ? "ok" : "muted"} size="sm">
            Numbers {settings.largeNumericDisplay ? "large" : "standard"}
          </Badge>
          <Badge tone={settings.simpleMode ? "ok" : "muted"} size="sm">
            Simple mode {settings.simpleMode ? "on" : "off"}
          </Badge>
        </div>
      </div>

      <ConfigurationForm
        action={updateQuoteDetailDisplaySettings}
        className="px-4 pb-4 text-sm"
      >
        <label className="flex max-w-3xl items-start gap-3 border-t border-border py-3.5">
          <input
            type="checkbox"
            name="showQuoteHandoffStatus"
            defaultChecked={settings.showQuoteHandoffStatus}
            className="mt-1"
          />
          <span>
            <span className="block font-medium text-ink">
              Show quote handoff status
            </span>
            <span className="mt-1 block text-muted">
              Shows handoff queues, status filters, assignment columns and the
              Quote handoff panel. Turning this off only hides the workflow UI;
              saved status data is retained.
            </span>
          </span>
        </label>

        <div className="border-t border-border pt-5">
          <h3 className="text-sm font-semibold text-ink">
            Accessibility display
          </h3>
          <p className="mt-0.5 max-w-3xl text-sm text-muted">
            Global workspace presentation preferences. These improve readability
            only; they do not change saved quotes, pricing logic or approval
            decisions.
          </p>
        </div>

        <label className="flex max-w-3xl items-start gap-3 border-t border-border py-3.5">
          <input
            type="checkbox"
            name="highContrast"
            defaultChecked={settings.highContrast}
            className="mt-1"
          />
          <span>
            <span className="block font-medium text-ink">
              High contrast workspace
            </span>
            <span className="mt-1 block text-muted">
              Darkens secondary text, strengthens dividers and makes status
              boundaries easier to distinguish.
            </span>
          </span>
        </label>

        <label className="flex max-w-3xl items-start gap-3 border-t border-border py-3.5">
          <input
            type="checkbox"
            name="comfortableDensity"
            defaultChecked={settings.comfortableDensity}
            className="mt-1"
          />
          <span>
            <span className="block font-medium text-ink">
              Comfortable density
            </span>
            <span className="mt-1 block text-muted">
              Adds vertical spacing to tables, summary rows and dense detail
              groups for easier scanning.
            </span>
          </span>
        </label>

        <label className="flex max-w-3xl items-start gap-3 border-t border-border py-3.5">
          <input
            type="checkbox"
            name="largeNumericDisplay"
            defaultChecked={settings.largeNumericDisplay}
            className="mt-1"
          />
          <span>
            <span className="block font-medium text-ink">
              Larger numeric display
            </span>
            <span className="mt-1 block text-muted">
              Enlarges key tabular figures in KPI tiles, quote summary cards and
              detail rows.
            </span>
          </span>
        </label>

        <label className="flex max-w-3xl items-start gap-3 border-t border-border py-3.5">
          <input
            type="checkbox"
            name="simpleMode"
            defaultChecked={settings.simpleMode}
            className="mt-1"
          />
          <span>
            <span className="block font-medium text-ink">Simple mode</span>
            <span className="mt-1 block text-muted">
              Reduces optional dashboard and quote-result detail while keeping
              suggested rates, repayments, warnings and approval requirements
              visible.
            </span>
          </span>
        </label>

        <div className="flex justify-end border-t border-border pt-4">
          <button type="submit" className={btn}>
            Save display settings
          </button>
        </div>
      </ConfigurationForm>
    </section>
  );
}
