import { Field, inputClass } from "@/components/ui/Field";

export function BrokerIdentityFields({
  idPrefix,
  brokerName,
  onBrokerNameChange,
  brokerCompany,
  onBrokerCompanyChange,
}: {
  idPrefix: string;
  brokerName: string;
  onBrokerNameChange: (value: string) => void;
  brokerCompany: string;
  onBrokerCompanyChange: (value: string) => void;
}) {
  return (
    <>
      <Field label="Broker name" htmlFor={`${idPrefix}-name`}>
        <input
          id={`${idPrefix}-name`}
          className={inputClass}
          value={brokerName}
          onChange={(event) => onBrokerNameChange(event.target.value)}
        />
      </Field>
      <Field label="Broker company" htmlFor={`${idPrefix}-company`}>
        <input
          id={`${idPrefix}-company`}
          className={inputClass}
          value={brokerCompany}
          onChange={(event) => onBrokerCompanyChange(event.target.value)}
        />
      </Field>
    </>
  );
}
