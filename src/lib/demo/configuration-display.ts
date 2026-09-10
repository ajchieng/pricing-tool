"use client";

import { useDemoConfiguration } from "./configuration-react";

export function useDemoDisplaySettings() {
  const configuration = useDemoConfiguration();
  const settings = configuration.tables.workspace_display_setting[0];
  return {
    showQuoteHandoffStatus: settings?.showQuoteHandoffStatus !== false,
    highContrast: settings?.highContrast === true,
    comfortableDensity: settings?.comfortableDensity === true,
    largeNumericDisplay: settings?.largeNumericDisplay === true,
    simpleMode: settings?.simpleMode === true,
  };
}
