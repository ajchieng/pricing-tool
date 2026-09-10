import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createConfigurationActions } from "./configuration-actions";
import {
  closeDemoConfiguration,
  getDemoConfiguration,
  initializeDemoConfiguration,
  readDemoConfigurationHistory,
} from "./configuration";
import { publishDueDemoConfigurationChanges } from "./configuration-governance";

beforeEach(async () => {
  closeDemoConfiguration();
  vi.stubGlobal("indexedDB", new IDBFactory());
  await initializeDemoConfiguration();
});
afterEach(() => {
  closeDemoConfiguration();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
function form(values: Record<string, string>) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(values)) fd.set(key, value);
  return fd;
}

describe("global original configuration forms", () => {
  it("applies a capital ratio immediately when no date is supplied", async () => {
    await createConfigurationActions(
      getDemoConfiguration().version,
    ).updateCapitalAllocationSetting(
      form({
        capitalRatioPct: "13.2",
        changeReason: "Demo capital sensitivity.",
      }),
    );
    expect(
      getDemoConfiguration().tables.capital_allocation_setting[0]
        .capitalRatioPct,
    ).toBe(13.2);
  });
  it("validates and records a scheduled capital change atomically without applying it early", async () => {
    const before = getDemoConfiguration();
    const future = new Date(Date.now() + 60_000).toISOString();
    await createConfigurationActions(
      before.version,
    ).updateCapitalAllocationSetting(
      form({
        capitalRatioPct: "13.7",
        changeReason: "Future demo capital sensitivity.",
        effectiveAt: future,
      }),
    );
    const scheduled = getDemoConfiguration();
    expect(scheduled.tables.capital_allocation_setting).toEqual(
      before.tables.capital_allocation_setting,
    );
    expect(scheduled.proposals.at(-1)).toMatchObject({
      status: "scheduled",
      effectiveAt: future,
      mutation: { data: { capitalRatioPct: 13.7 } },
    });
    expect((await readDemoConfigurationHistory())[0].action).toBe(
      "config.scheduled",
    );
    await expect(
      publishDueDemoConfigurationChanges(scheduled.version),
    ).rejects.toThrow("No scheduled changes");
    vi.spyOn(Date, "now").mockReturnValue(Date.parse(future) + 1000);
    await publishDueDemoConfigurationChanges(scheduled.version);
    expect(
      getDemoConfiguration().tables.capital_allocation_setting[0]
        .capitalRatioPct,
    ).toBe(13.7);
    expect(getDemoConfiguration().proposals.at(-1)?.status).toBe("approved");
  });
  it("rejects invalid capital and dates without changing settings or proposals", async () => {
    const before = getDemoConfiguration(),
      actions = createConfigurationActions(before.version);
    await expect(
      actions.updateCapitalAllocationSetting(
        form({ capitalRatioPct: "0", changeReason: "Invalid example." }),
      ),
    ).rejects.toThrow("Capital ratio");
    await expect(
      actions.updateCapitalAllocationSetting(
        form({
          capitalRatioPct: "13",
          changeReason: "Invalid date example.",
          effectiveAt: "not-a-date",
        }),
      ),
    ).rejects.toThrow("valid effective date");
    expect(getDemoConfiguration()).toBe(before);
  });
  it("persists all display checkboxes and treats absent boxes as off", async () => {
    const before = getDemoConfiguration();
    await createConfigurationActions(
      before.version,
    ).updateQuoteDetailDisplaySettings(
      form({ highContrast: "on", largeNumericDisplay: "on" }),
    );
    expect(
      getDemoConfiguration().tables.workspace_display_setting[0],
    ).toMatchObject({
      showQuoteHandoffStatus: false,
      highContrast: true,
      comfortableDensity: false,
      largeNumericDisplay: true,
      simpleMode: false,
    });
    expect(getDemoConfiguration().tables.capital_allocation_setting).toEqual(
      before.tables.capital_allocation_setting,
    );
  });
});
