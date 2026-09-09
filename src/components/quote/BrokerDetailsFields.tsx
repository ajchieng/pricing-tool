import { Field } from "@/components/ui/Field";
import { NumberInput } from "@/components/ui/inputs";
import { Select } from "@/components/quote-form-ui";
import { BrokerIdentityFields } from "@/components/quote/BrokerIdentityFields";
import type { BrokerVolumeBand } from "@/lib/pricing/types";

const YES_NO_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

const BROKER_VOLUME_OPTIONS: Array<{
  value: BrokerVolumeBand;
  label: string;
}> = [
  { value: "1_3", label: "1–3" },
  { value: "4_6", label: "4–6" },
  { value: "7_9", label: "7–9" },
  { value: "10_plus", label: "10+" },
];

export function BrokerDetailsFields({
  brokerName,
  onBrokerNameChange,
  brokerCompany,
  onBrokerCompanyChange,
  brokerInRegion,
  onBrokerInRegionChange,
  brokerVolumeBand,
  onBrokerVolumeBandChange,
  brokerDiscretionPct,
  onBrokerDiscretionPctChange,
}: {
  brokerName: string;
  onBrokerNameChange: (value: string) => void;
  brokerCompany: string;
  onBrokerCompanyChange: (value: string) => void;
  brokerInRegion: string;
  onBrokerInRegionChange: (value: string) => void;
  brokerVolumeBand: string;
  onBrokerVolumeBandChange: (value: string) => void;
  brokerDiscretionPct: string;
  onBrokerDiscretionPctChange: (value: string) => void;
}) {
  return (
    <fieldset className="@md:col-span-2 grid gap-4 rounded-lg border border-border bg-panel p-4 @md:grid-cols-2">
      <legend className="px-1 text-sm font-semibold text-ink">
        Broker details
      </legend>
      <BrokerIdentityFields
        idPrefix="broker"
        brokerName={brokerName}
        onBrokerNameChange={onBrokerNameChange}
        brokerCompany={brokerCompany}
        onBrokerCompanyChange={onBrokerCompanyChange}
      />
      <Select
        label="Is the broker in our region?"
        value={brokerInRegion}
        onChange={onBrokerInRegionChange}
        options={YES_NO_OPTIONS}
        placeholder="Select…"
      />
      <Select
        label="Volume of loans written by broker to Lender in past 12 months"
        value={brokerVolumeBand}
        onChange={onBrokerVolumeBandChange}
        options={BROKER_VOLUME_OPTIONS}
        placeholder="Select…"
      />
      <Field
        label="Percentage of loans with a discretion"
        htmlFor="broker-discretion-pct"
        helper="Enter a percentage from 0 to 100."
        className="@md:col-span-2"
      >
        <NumberInput
          id="broker-discretion-pct"
          value={brokerDiscretionPct}
          onChange={onBrokerDiscretionPctChange}
          suffix="%"
        />
      </Field>
    </fieldset>
  );
}
