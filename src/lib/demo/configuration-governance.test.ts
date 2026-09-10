import { IDBFactory } from "fake-indexeddb";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import {
  closeDemoConfiguration,
  initializeDemoConfiguration,
  getDemoConfiguration,
  mutateDemoConfiguration,
  readDemoConfigurationHistory,
} from "./configuration";
import {
  proposeDemoConfigurationChange,
  decideDemoConfigurationChange,
  publishDueDemoConfigurationChanges,
  scheduleDemoConfigurationChange,
} from "./configuration-governance";
import { searchDemoConfiguration } from "./configuration-search";

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
const mutation = {
  targetType: "capital_allocation_setting" as const,
  action: "update" as const,
  targetId: 1,
  data: { capitalRatioPct: 13 },
  reason: "Fictional sensitivity review",
};
it("approves a proposal and writes decision and applied policy atomically", async () => {
  await proposeDemoConfigurationChange({
    expectedVersion: getDemoConfiguration().version,
    mutation,
    summary: "Review capital",
  });
  const proposal = getDemoConfiguration().proposals.at(-1)!;
  expect(
    getDemoConfiguration().tables.capital_allocation_setting[0].capitalRatioPct,
  ).toBe(11.5);
  await decideDemoConfigurationChange({
    expectedVersion: getDemoConfiguration().version,
    id: proposal.id,
    decision: "approve",
    notes: "Reviewed example",
  });
  expect(
    getDemoConfiguration().tables.capital_allocation_setting[0].capitalRatioPct,
  ).toBe(13);
  expect(getDemoConfiguration().proposals.at(-1)).toMatchObject({
    status: "approved",
    decidedByName: "Demo user",
  });
  const history = await readDemoConfigurationHistory();
  expect(history.map((event) => event.action).sort()).toEqual(
    ["config.proposed", "update", "config.approved"].sort(),
  );
  expect(
    history
      .filter((event) => event.action !== "config.proposed")
      .map((event) => event.version),
  ).toEqual([3, 3]);
});
it("rejects a changed target without publishing or losing the pending proposal", async () => {
  await proposeDemoConfigurationChange({
    expectedVersion: 1,
    mutation,
    summary: "Review capital",
  });
  const id = getDemoConfiguration().proposals.at(-1)!.id;
  await mutateDemoConfiguration({
    ...mutation,
    expectedVersion: getDemoConfiguration().version,
    data: { capitalRatioPct: 14 },
  });
  const before = getDemoConfiguration();
  await expect(
    decideDemoConfigurationChange({
      expectedVersion: before.version,
      id,
      decision: "approve",
    }),
  ).rejects.toThrow("target setting changed");
  expect(getDemoConfiguration()).toEqual(before);
  await decideDemoConfigurationChange({
    expectedVersion: before.version,
    id,
    decision: "reject",
  });
  expect(getDemoConfiguration().proposals.at(-1)?.status).toBe("rejected");
  expect(
    getDemoConfiguration().tables.capital_allocation_setting[0].capitalRatioPct,
  ).toBe(14);
});
it("keeps scheduled policy inactive until due publication", async () => {
  const now = Date.now();
  vi.spyOn(Date, "now").mockReturnValue(now);
  await scheduleDemoConfigurationChange({
    expectedVersion: 1,
    mutation,
    summary: "Scheduled review",
    effectiveAt: new Date(now + 60000).toISOString(),
  });
  expect(
    getDemoConfiguration().tables.capital_allocation_setting[0].capitalRatioPct,
  ).toBe(11.5);
  await expect(
    publishDueDemoConfigurationChanges(getDemoConfiguration().version),
  ).rejects.toThrow("No scheduled changes");
  vi.spyOn(Date, "now").mockReturnValue(now + 60001);
  await publishDueDemoConfigurationChanges(getDemoConfiguration().version);
  expect(
    getDemoConfiguration().tables.capital_allocation_setting[0].capitalRatioPct,
  ).toBe(13);
  expect(getDemoConfiguration().proposals.at(-1)?.status).toBe("approved");
});
it("cancels a stale scheduled change so unrelated due changes can publish", async () => {
  const now = Date.now();
  vi.spyOn(Date, "now").mockReturnValue(now);
  const effectiveAt = new Date(now + 60000).toISOString();
  await scheduleDemoConfigurationChange({
    expectedVersion: getDemoConfiguration().version,
    mutation,
    summary: "Scheduled capital review",
    effectiveAt,
  });
  const capitalProposalId = getDemoConfiguration().proposals.at(-1)!.id;
  const fee = getDemoConfiguration().tables.quote_fee_setting[0];
  const { id: feeId, ...feeData } = fee;
  await scheduleDemoConfigurationChange({
    expectedVersion: getDemoConfiguration().version,
    mutation: {
      targetType: "quote_fee_setting",
      action: "update",
      targetId: feeId,
      data: { ...feeData, standardUpfrontFee: 120 },
      reason: "Fictional fee review",
    },
    summary: "Scheduled fee review",
    effectiveAt,
  });
  const feeProposalId = getDemoConfiguration().proposals.at(-1)!.id;
  await mutateDemoConfiguration({
    ...mutation,
    expectedVersion: getDemoConfiguration().version,
    data: { capitalRatioPct: 14 },
  });
  const before = getDemoConfiguration();
  const historyBefore = await readDemoConfigurationHistory();
  vi.spyOn(Date, "now").mockReturnValue(now + 60001);
  await expect(
    publishDueDemoConfigurationChanges(before.version),
  ).rejects.toThrow("target setting changed");
  expect(getDemoConfiguration()).toEqual(before);
  expect(await readDemoConfigurationHistory()).toEqual(historyBefore);

  const cancellation = {
    expectedVersion: before.version,
    id: capitalProposalId,
    decision: "reject" as const,
    notes: "Capital was updated after scheduling; retain the current value.",
  };
  await expect(
    decideDemoConfigurationChange({ ...cancellation, notes: " " }),
  ).rejects.toThrow("reason for cancelling");
  await expect(
    decideDemoConfigurationChange({
      ...cancellation,
      expectedVersion: before.version - 1,
    }),
  ).rejects.toThrow("Configuration changed");
  expect(getDemoConfiguration()).toEqual(before);
  expect(await readDemoConfigurationHistory()).toEqual(historyBefore);

  await decideDemoConfigurationChange(cancellation);
  const cancelled = getDemoConfiguration();
  expect(
    cancelled.proposals.find((item) => item.id === capitalProposalId),
  ).toMatchObject({
    status: "rejected",
    decisionNotes: cancellation.notes,
    decidedByName: "Demo user",
  });
  const cancellationEvents = (await readDemoConfigurationHistory()).filter(
    (event) => event.version === cancelled.version,
  );
  expect(cancellationEvents).toHaveLength(1);
  expect(cancellationEvents[0]).toMatchObject({
    action: "config.rejected",
    before: { status: "scheduled" },
    after: { status: "rejected", decisionNotes: cancellation.notes },
  });
  await expect(
    decideDemoConfigurationChange({
      ...cancellation,
      expectedVersion: cancelled.version,
    }),
  ).rejects.toThrow("already been decided");
  await publishDueDemoConfigurationChanges(cancelled.version);
  const published = getDemoConfiguration();
  expect(published.tables.capital_allocation_setting[0].capitalRatioPct).toBe(
    14,
  );
  expect(
    published.tables.quote_fee_setting.find((row) => row.id === feeId)
      ?.standardUpfrontFee,
  ).toBe(120);
  expect(
    published.proposals.find((item) => item.id === feeProposalId)?.status,
  ).toBe("approved");
});
it("indexes edited settings and factors with exact row links, excluding pending payloads", async () => {
  const configuration = getDemoConfiguration();
  const factor = configuration.scoreModels.home.factors[0];
  const found = searchDemoConfiguration(configuration, {
    q: factor.label,
    area: "home",
    kind: "setting",
    page: 1,
  });
  expect(
    found.results.some((row) => row.href.includes(`factor=${factor.key}`)),
  ).toBe(true);
  const rates = searchDemoConfiguration(configuration, {
    q: "carded",
    area: "personal",
    kind: "setting",
    page: 1,
  });
  expect(
    rates.results.some((row) =>
      row.href.includes("/personal-loans/rates/#config-personal-rate-"),
    ),
  ).toBe(true);
  const pending = searchDemoConfiguration(configuration, {
    q: "sensitivity",
    area: "all",
    kind: "all",
    page: 1,
  });
  expect(pending.results.some((row) => row.href.includes("governance"))).toBe(
    false,
  );
});
