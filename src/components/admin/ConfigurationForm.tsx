"use client";

import { useState, useRef, type ComponentPropsWithoutRef } from "react";
import { CONFIGURATION_FORM_VERSION_FIELD } from "@/lib/demo/configuration-form-version";
import { DemoConfigurationError } from "@/lib/demo/configuration";
import {
  useDemoConfiguration,
  reportConfigurationResult,
} from "@/lib/demo/configuration-react";

type ConfigurationFormProps = Omit<
  ComponentPropsWithoutRef<"form">,
  "action" | "onSubmit"
> & {
  action: (data: FormData) => Promise<void>;
};

/** Preserve the original linked row forms and all entered values when a save fails. */
export function ConfigurationForm({
  action,
  children,
  ...props
}: ConfigurationFormProps) {
  const [pending, setPending] = useState(false);
  const configuration = useDemoConfiguration();
  // Original row controls are uncontrolled, including selects linked by form=.
  // A new policy snapshot does not replace the values those controls display.
  const displayedVersion = useRef(configuration.version);
  return (
    <form
      {...props}
      aria-busy={pending || undefined}
      onSubmit={async (event) => {
        event.preventDefault();
        if (pending) return;
        const data = new FormData(event.currentTarget);
        const submittedVersion = displayedVersion.current;
        data.set(CONFIGURATION_FORM_VERSION_FIELD, String(submittedVersion));
        setPending(true);
        try {
          await action(data);
          // Every successful form action makes one atomic configuration commit.
          // Do not adopt a newer snapshot that another tab may have published
          // while this action was finishing.
          displayedVersion.current = submittedVersion + 1;
        } catch (error) {
          reportConfigurationResult(
            error instanceof DemoConfigurationError &&
              error.code === "stale_configuration"
              ? "Configuration changed since these values were loaded. Your entered values are preserved. Reload this page to load current settings before saving."
              : error instanceof Error
                ? error.message
                : "The change could not be saved. Try again.",
            "error",
          );
        } finally {
          setPending(false);
        }
      }}
    >
      {children}
    </form>
  );
}
