"use client";

import { useSearchParams } from "next/navigation";
import { useDemoConfiguration } from "@/lib/demo/configuration-react";
import {
  DEFAULT_CUSTOMER_SCORE_MODEL,
  ALLOWED_CUSTOMER_SCORE_FIELDS,
} from "@/lib/pricing/customer-score";
import {
  DEFAULT_PERSONAL_SCORE_MODEL,
  PERSONAL_SCORE_FIELDS,
} from "@/lib/pricing/personal/score-model";
import {
  DEFAULT_COMMERCIAL_SCORE_MODEL,
  COMMERCIAL_SCORE_FIELDS,
} from "@/lib/pricing/commercial/score-model";
import {
  adminTableDescription,
  adminTableHeader,
  adminTableShell,
  adminTableTitle,
} from "@/components/adminUi";
import { Badge } from "@/components/ui/Badge";
import { ScoreModelEditor } from "./ScoreModelEditor";
import { ConfigurationModelHistory } from "./ConfigurationModelHistory";
import type { DemoArea } from "@/lib/demo/policy";

const pageModels = {
  home: {
    title: "Customer score model",
    description:
      "Governed score policy for factor weights, thresholds, mappings, score bands and score-based discount entitlement.",
    model: DEFAULT_CUSTOMER_SCORE_MODEL,
    fields: ALLOWED_CUSTOMER_SCORE_FIELDS,
  },
  personal: {
    title: "Personal customer score model",
    description:
      "Governed score policy for stream, broker context, loan details, credit risk, score bands and score-based discount entitlement.",
    model: DEFAULT_PERSONAL_SCORE_MODEL,
    fields: PERSONAL_SCORE_FIELDS,
  },
  commercial: {
    title: "Commercial customer score model",
    description:
      "Governed score policy for business risk, cash-flow cover, security, relationship and discount entitlement from the selected facility base rate.",
    model: DEFAULT_COMMERCIAL_SCORE_MODEL,
    fields: COMMERCIAL_SCORE_FIELDS,
  },
};

export function ScoreModelAdminPage({ vertical }: { vertical: DemoArea }) {
  const configuration = useDemoConfiguration();
  const search = useSearchParams();
  const activeModel = configuration.scoreModels[vertical];
  const page = pageModels[vertical];
  return (
    <div className="space-y-5">
      <section className={adminTableShell}>
        <div className={adminTableHeader}>
          <div>
            <h2 className={adminTableTitle}>{page.title}</h2>
            <p className={adminTableDescription}>{page.description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone="muted" size="sm">
              {Math.max(1, activeModel.version - page.model.version + 1)}{" "}
              versions
            </Badge>
            <Badge tone="info" size="sm">
              Active v{activeModel.version}
            </Badge>
          </div>
        </div>
      </section>
      <ScoreModelEditor
        key={vertical}
        activeModel={activeModel}
        defaultModel={page.model}
        fields={page.fields}
        productArea={vertical}
        configurationVersion={configuration.version}
        initialSelectedKey={search.get("factor") ?? undefined}
        instantApply
      />
      <ConfigurationModelHistory
        vertical={vertical}
        targetType="score_model"
        configurationVersion={configuration.version}
      />
    </div>
  );
}
