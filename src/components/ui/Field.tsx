import {
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useId,
} from "react";

// Label + control + helper/error slot. Gives every form control the same
// rhythm and a proper place for helper text and inline validation.

export const inputClass =
  "min-h-[44px] w-full border border-border-strong bg-surface rounded-lg px-3 py-2 text-sm text-ink placeholder:text-faint transition-colors hover:border-muted/50 disabled:bg-panel disabled:text-muted";

export type FieldControlProps = {
  id?: string;
  required?: true;
  "aria-describedby"?: string;
  "aria-errormessage"?: string;
  "aria-invalid"?: true;
  "aria-required"?: true;
};

function withControlAccessibility(
  child: ReactNode,
  controlProps: FieldControlProps,
): ReactNode {
  if (!isValidElement(child)) return child;
  if (
    typeof child.type === "string" &&
    !["input", "select", "textarea", "button"].includes(child.type)
  ) {
    return child;
  }
  const element = child as ReactElement<Record<string, unknown>>;
  const existingDescription = element.props["aria-describedby"];
  return cloneElement(element, {
    ...controlProps,
    id: element.props.id ?? controlProps.id,
    "aria-describedby":
      [
        typeof existingDescription === "string"
          ? existingDescription
          : undefined,
        controlProps["aria-describedby"],
      ]
        .filter(Boolean)
        .join(" ") || undefined,
  });
}

export function Field({
  label,
  htmlFor,
  helper,
  error,
  required = false,
  className = "",
  searchLabel,
  children,
}: {
  label: ReactNode;
  htmlFor?: string;
  helper?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  className?: string;
  /** Override the searchable quote parameter label; false excludes the field. */
  searchLabel?: string | false;
  children: ReactNode | ((props: FieldControlProps) => ReactNode);
}) {
  const generatedId = `field-${useId().replaceAll(":", "")}`;
  const helperId = helper
    ? htmlFor
      ? `${htmlFor}-helper`
      : `${generatedId}-helper`
    : undefined;
  const errorId = error
    ? htmlFor
      ? `${htmlFor}-error`
      : `${generatedId}-error`
    : undefined;
  const describedBy =
    [helperId, errorId].filter(Boolean).join(" ") || undefined;
  const controlProps: FieldControlProps = {
    id: htmlFor,
    "aria-describedby": describedBy,
    "aria-errormessage": errorId,
    "aria-invalid": error ? true : undefined,
    ...(required
      ? { required: true as const, "aria-required": true as const }
      : {}),
  };
  const control =
    typeof children === "function"
      ? children(controlProps)
      : withControlAccessibility(children, controlProps);
  const parameterLabel =
    searchLabel === false
      ? undefined
      : (searchLabel ?? (typeof label === "string" ? label : undefined));
  const renderedLabel = (
    <>
      {label}
      {required ? (
        <span className="ml-1 text-xs font-normal text-muted">(required)</span>
      ) : null}
    </>
  );
  const messages = (
    <>
      {helper ? (
        <p id={helperId} className="mt-1 text-xs text-muted">
          {helper}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="mt-1 text-xs text-alert">
          {error}
        </p>
      ) : null}
    </>
  );

  if (!htmlFor) {
    return (
      <fieldset
        className={`min-w-0 ${className}`}
        data-quote-parameter-label={parameterLabel}
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
      >
        <legend className="mb-1 block text-sm font-medium text-ink">
          {renderedLabel}
        </legend>
        {control}
        {messages}
      </fieldset>
    );
  }

  return (
    <div
      className={`min-w-0 ${className}`}
      data-quote-parameter-label={parameterLabel}
    >
      <label
        htmlFor={htmlFor}
        className="mb-1 block text-sm font-medium text-ink"
      >
        {renderedLabel}
      </label>
      {control}
      {messages}
    </div>
  );
}
