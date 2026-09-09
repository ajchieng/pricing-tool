import { Field, inputClass } from "@/components/ui/Field";
import { NumberInput } from "@/components/ui/inputs";
import { Select } from "@/components/quote-form-ui";
import { YES_NO_UNKNOWN_OPTIONS } from "@/lib/format";
import { LenderProductMultiSelect } from "./LenderProductMultiSelect";
import type { LenderProduct } from "@/lib/pricing/lender-products";

// Section body: Lender relationship context — membership and product depth.

export function RelationshipContextCard({
  yearsAsMember,
  onYearsAsMemberChange,
  existingLenderLoan,
  onExistingLenderLoanChange,
  lenderProducts,
  onLenderProductsChange,
  relationshipNotes,
  onRelationshipNotesChange,
}: {
  yearsAsMember: string;
  onYearsAsMemberChange: (value: string) => void;
  existingLenderLoan: string;
  onExistingLenderLoanChange: (value: string) => void;
  lenderProducts: LenderProduct[];
  onLenderProductsChange: (value: LenderProduct[]) => void;
  relationshipNotes: string;
  onRelationshipNotesChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-4 @md:grid-cols-2">
      <Field label="Years as member" htmlFor="years-as-member">
        <NumberInput
          id="years-as-member"
          suffix="years"
          value={yearsAsMember}
          onChange={onYearsAsMemberChange}
        />
      </Field>
      <Select
        label="Existing loan with Lender"
        value={existingLenderLoan}
        onChange={onExistingLenderLoanChange}
        options={YES_NO_UNKNOWN_OPTIONS}
      />
      <LenderProductMultiSelect
        value={lenderProducts}
        onChange={onLenderProductsChange}
      />
      <Field
        label="Relationship notes"
        htmlFor="relationship-notes"
        className="@md:col-span-2"
      >
        <textarea
          id="relationship-notes"
          className={inputClass}
          rows={2}
          value={relationshipNotes}
          onChange={(e) => onRelationshipNotesChange(e.target.value)}
        />
      </Field>
    </div>
  );
}
