import { Select } from "@/components/quote-form-ui";
import { BrokerDetailsFields } from "@/components/quote/BrokerDetailsFields";
import type {
  LoanCustomerStream,
  ProfitabilityChannel,
} from "@/lib/pricing/types";

const STREAM_OPTIONS: Array<{
  value: LoanCustomerStream;
  label: string;
}> = [
  { value: "new_to_bank", label: "New to Bank" },
  { value: "existing_member", label: "Existing Member" },
  { value: "retention", label: "Retention" },
];

const CHANNEL_OPTIONS: Array<{ value: ProfitabilityChannel; label: string }> = [
  { value: "broker", label: "Broker Stream" },
  { value: "direct", label: "Direct" },
  { value: "online", label: "Online" },
];

export function OpeningContextCard({
  customerStream,
  onCustomerStreamChange,
  channel,
  onChannelChange,
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
  customerStream: LoanCustomerStream;
  onCustomerStreamChange: (value: LoanCustomerStream) => void;
  channel: ProfitabilityChannel;
  onChannelChange: (value: ProfitabilityChannel) => void;
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
    <div
      data-quote-parameter-group="Quote context"
      className="border-t border-border py-5"
    >
      <div className="grid gap-4 @md:grid-cols-2">
        <Select
          label="Stream"
          value={customerStream}
          onChange={(value) =>
            onCustomerStreamChange(value as LoanCustomerStream)
          }
          options={STREAM_OPTIONS}
          helper="Selects the customer relationship and assessment path: New to Bank, Existing Member or Retention."
        />
        <Select
          label="Channel"
          value={channel}
          onChange={(value) => onChannelChange(value as ProfitabilityChannel)}
          options={CHANNEL_OPTIONS}
          helper="Select how this opportunity reached Lender."
        />
        {channel === "broker" && (
          <BrokerDetailsFields
            brokerName={brokerName}
            onBrokerNameChange={onBrokerNameChange}
            brokerCompany={brokerCompany}
            onBrokerCompanyChange={onBrokerCompanyChange}
            brokerInRegion={brokerInRegion}
            onBrokerInRegionChange={onBrokerInRegionChange}
            brokerVolumeBand={brokerVolumeBand}
            onBrokerVolumeBandChange={onBrokerVolumeBandChange}
            brokerDiscretionPct={brokerDiscretionPct}
            onBrokerDiscretionPctChange={onBrokerDiscretionPctChange}
          />
        )}
      </div>
    </div>
  );
}
