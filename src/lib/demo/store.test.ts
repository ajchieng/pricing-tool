import { IDBFactory, IDBObjectStore } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEMO_DATABASE_NAME,
  addComment,
  assignQuote,
  closeDemoStore,
  getCore,
  getHistory,
  getQuote,
  initializeDemo,
  listQuotes,
  resetDemo,
  reviewQuote,
  saveQuote,
  setStarred,
  subscribeDemoChanges,
  updateWorkflow,
} from "./store";
import type { DemoArea, DemoQuoteDraft } from "./types";
import {
  calculateCommercial,
  calculateHome,
  calculatePersonal,
  sampleInput,
} from "./pricing";
import type { CalcRequestInput } from "../pricing/schema";
import type { PersonalCalcRequestInput } from "../pricing/personal/schema";
import type { CommercialCalcRequestInput } from "../pricing/commercial/schema";

function draft(area: DemoArea = "home"): DemoQuoteDraft {
  const input = {
    ...sampleInput(area),
    ...(area === "home" ? { loanAmount: 320_000 } : {}),
    nested: { term: 30 },
  } as Record<string, unknown>;
  const result =
    area === "home"
      ? calculateHome(input as CalcRequestInput)
      : area === "personal"
        ? calculatePersonal(input as PersonalCalcRequestInput)
        : calculateCommercial(input as CommercialCalcRequestInput);
  return {
    area,
    customerName: "Morgan Example",
    input,
    result,
    summary: {
      productName: "Example variable",
      amount: input.loanAmount as number,
      rate: result.finalDisplayRate,
      repayment: result.monthlyRepayment,
      approval: result.approvalLevel,
    },
  };
}

async function rawWrite(store: string, value: unknown): Promise<void> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const open = indexedDB.open(DEMO_DATABASE_NAME);
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error);
  });
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(store, "readwrite");
      tx.objectStore(store).put(value);
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

beforeEach(() => {
  closeDemoStore();
  vi.stubGlobal("indexedDB", new IDBFactory());
});
afterEach(() => {
  closeDemoStore();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("the browser demo store", () => {
  it("seeds once, separates domains and resolves every quote by its global numeric ID", async () => {
    await initializeDemo([
      draft("home"),
      draft("personal"),
      draft("commercial"),
    ]);
    await initializeDemo([draft("home")]);
    for (const [index, area] of (
      ["home", "personal", "commercial"] as const
    ).entries()) {
      const quotes = await listQuotes(area);
      expect(quotes).toHaveLength(1);
      expect(quotes[0].id).toBe(index + 1);
      expect((await getQuote(quotes[0].id))?.area).toBe(area);
      expect((await getCore(quotes[0].coreId))?.area).toBe(area);
    }
    expect(await getQuote("personal", 1)).toBeUndefined();
  });

  it("copies and deeply freezes saved input and calculation snapshots", async () => {
    const original = draft();
    const expectedSuggestedRate = (original.result as { suggestedRate: number })
      .suggestedRate;
    const saved = await saveQuote(original);
    original.input.loanAmount = 99;
    (original.result as { suggestedRate: number }).suggestedRate = 1;
    const loaded = await getQuote(saved.id);
    expect(loaded?.input.loanAmount).toBe(320_000);
    expect((loaded?.result as { suggestedRate: number }).suggestedRate).toBe(
      expectedSuggestedRate,
    );
    expect(Object.isFrozen(saved.input)).toBe(true);
    expect(
      Object.isFrozen(
        (saved.result as { profitability: object }).profitability,
      ),
    ).toBe(true);
    expect(() => {
      loaded!.input.loanAmount = 1;
    }).toThrow();
  });

  it("seeds revisions, workflow and comments in one consistent resettable session", async () => {
    await initializeDemo([
      draft(),
      {
        ...draft(),
        seedRevisionOfIndex: 0,
        seedStatus: "ready_for_review",
        seedComment: "Sample review handoff.",
      },
      draft("personal"),
    ]);
    const home = await listQuotes("home");
    expect(home.map((quote) => quote.revision)).toEqual([2, 1]);
    expect(home[0].coreId).toBe(home[1].coreId);
    expect(home[0]).not.toHaveProperty("seedRevisionOfIndex");
    const core = await getCore(home[0].coreId);
    expect(core?.status).toBe("ready_for_review");
    expect(core?.comments[0].text).toBe("Sample review handoff.");
    expect(core?.history.map((event) => event.action)).toEqual([
      "created",
      "revised",
      "workflow",
      "commented",
    ]);
    await resetDemo();
    expect((await listQuotes("home")).map((quote) => quote.revision)).toEqual([
      2, 1,
    ]);
  });

  it("claims the latest revision in the write transaction and preserves prior snapshots", async () => {
    const first = await saveQuote(draft());
    const revised = draft();
    revised.input.loanAmount = 400_000;
    revised.summary.amount = 400_000;
    const attempts = await Promise.allSettled([
      saveQuote(revised, first.id),
      saveQuote(revised, first.id),
    ]);
    expect(attempts.filter((item) => item.status === "fulfilled")).toHaveLength(
      1,
    );
    expect(attempts.find((item) => item.status === "rejected")).toMatchObject({
      reason: { code: "stale_revision" },
    });
    const revisions = await getHistory("home", first.coreId);
    expect(revisions.map((item) => item.revision)).toEqual([2, 1]);
    expect(revisions[1].input.loanAmount).toBe(320_000);
    expect((await getCore(first.coreId))?.currentQuoteId).toBe(revisions[0].id);
    expect(
      (await getCore(first.coreId))?.history.map((item) => item.action),
    ).toEqual(["created", "revised"]);
  });

  it("rejects a revision of a quote in another domain without allocating an ID", async () => {
    const first = await saveQuote(draft());
    await expect(saveQuote(draft("personal"), first.id)).rejects.toMatchObject({
      code: "not_found",
    });
    expect((await saveQuote(draft("personal"))).id).toBe(first.id + 1);
    expect(await getHistory("personal", first.coreId)).toEqual([]);
  });

  it("commits assignments, comments, stars and review decisions with history", async () => {
    const quote = await saveQuote(draft());
    await Promise.all([
      setStarred(quote.coreId, true),
      assignQuote(quote.coreId, "Taylor Demo"),
    ]);
    await addComment(quote.coreId, "Check the proposed term.");
    await updateWorkflow(quote.coreId, "ready_for_review");
    await reviewQuote(quote.coreId, "accepted", "Complete example.");
    const core = await getCore(quote.coreId);
    expect(core).toMatchObject({
      starred: true,
      assignee: "Taylor Demo",
      status: "reviewed",
      review: { quoteId: quote.id, decision: "accepted", actor: "Demo user" },
    });
    expect(core?.comments[0].text).toBe("Check the proposed term.");
    expect(core?.history).toHaveLength(6);
    await expect(
      reviewQuote(quote.coreId, "declined", "Another outcome"),
    ).rejects.toMatchObject({ code: "review_already_decided" });
    await saveQuote(draft(), quote.id);
    const revisedCore = await getCore(quote.coreId);
    expect(revisedCore).toMatchObject({
      status: "draft",
      review: null,
      starred: true,
      assignee: "Taylor Demo",
    });
    expect(revisedCore?.comments).toHaveLength(1);
    expect(
      revisedCore?.history.some((event) => event.action === "reviewed"),
    ).toBe(true);
  });

  it("requires canonical complete capital and expected loss for acceptance", async () => {
    const incomplete = draft();
    const result = incomplete.result as {
      profitability: {
        capitalAllocation: { classificationConfirmed: boolean };
        expectedLoss: {
          status: string;
          basis: string;
          effectiveExpectedCreditLossAmount: number;
        };
      };
    };
    result.profitability.capitalAllocation.classificationConfirmed = false;
    const capitalQuote = await saveQuote(incomplete);
    await expect(
      reviewQuote(capitalQuote.coreId, "accepted"),
    ).rejects.toMatchObject({ code: "review_incomplete" });
    expect((await getCore(capitalQuote.coreId))?.review).toBeNull();
    result.profitability.capitalAllocation.classificationConfirmed = true;
    result.profitability.expectedLoss = {
      ...result.profitability.expectedLoss,
      status: "not_configured",
      basis: "provisional",
      effectiveExpectedCreditLossAmount: 0,
    };
    const eclQuote = await saveQuote(incomplete);
    await expect(
      reviewQuote(eclQuote.coreId, "accepted"),
    ).rejects.toMatchObject({ code: "review_incomplete" });
    await expect(
      updateWorkflow(eclQuote.coreId, "reviewed"),
    ).rejects.toMatchObject({ code: "review_incomplete" });
    await reviewQuote(
      eclQuote.coreId,
      "changes_requested",
      "Complete the expected loss inputs.",
    );
    expect((await getCore(eclQuote.coreId))?.status).toBe("draft");
    await expect(
      updateWorkflow(eclQuote.coreId, "reviewed"),
    ).rejects.toMatchObject({ code: "review_incomplete" });
  });

  it("rejects workflow and review actions from a stale page inside the transaction", async () => {
    const first = await saveQuote(draft());
    const revised = await saveQuote(draft(), first.id);
    await expect(
      updateWorkflow(first.coreId, "ready_for_review", first.id),
    ).rejects.toMatchObject({ code: "stale_revision" });
    await expect(
      reviewQuote(first.coreId, "accepted", "", first.id),
    ).rejects.toMatchObject({ code: "stale_revision" });
    expect((await getCore(first.coreId))?.status).toBe("draft");
    await updateWorkflow(first.coreId, "ready_for_review", revised.id);
    await reviewQuote(first.coreId, "accepted", "", revised.id);
    expect((await getCore(first.coreId))?.review?.quoteId).toBe(revised.id);
  });

  it("requires a persisted reason and authorizer on expected-loss overrides", async () => {
    const input = draft();
    const result = input.result as {
      profitability: { expectedLoss: Record<string, unknown> };
    };
    result.profitability.expectedLoss = {
      ...result.profitability.expectedLoss,
      basis: "manual_override",
      status: "not_configured",
      effectiveExpectedCreditLossAmount: 0,
      expectedCreditLossOverrideReason: "Documented demo override",
    };
    const missing = await saveQuote(input);
    await expect(reviewQuote(missing.coreId, "accepted")).rejects.toMatchObject(
      { code: "review_incomplete" },
    );
    result.profitability.expectedLoss.expectedLossOverrideByName = "Demo user";
    result.profitability.expectedLoss.expectedLossOverrideByRole = "demo";
    const complete = await saveQuote(input);
    expect(
      (await reviewQuote(complete.coreId, "accepted")).review?.decision,
    ).toBe("accepted");
  });

  it("validates inputs and surfaces corrupt saved data without silently replacing it", async () => {
    await expect(
      saveQuote({ ...draft(), customerName: "" }),
    ).rejects.toMatchObject({ code: "invalid_input" });
    await expect(saveQuote({ ...draft(), result: {} })).rejects.toMatchObject({
      code: "invalid_input",
    });
    const mismatch = draft();
    mismatch.summary.rate = 1;
    await expect(saveQuote(mismatch)).rejects.toMatchObject({
      code: "invalid_input",
    });
    const quote = await saveQuote(draft());
    await expect(addComment(quote.coreId, " ")).rejects.toMatchObject({
      code: "invalid_input",
    });
    await expect(
      reviewQuote(quote.coreId, "declined", ""),
    ).rejects.toMatchObject({ code: "invalid_input" });
    await rawWrite("home", { id: quote.id, broken: true });
    await expect(listQuotes("home")).rejects.toMatchObject({
      code: "corrupt_data",
    });
  });

  it("restores samples atomically on reset and retains the seed marker across reloads", async () => {
    await initializeDemo([draft("personal")]);
    const custom = await saveQuote(draft());
    await addComment(custom.coreId, "Temporary browser data");
    await resetDemo();
    expect(await listQuotes("home")).toEqual([]);
    expect(await listQuotes("personal")).toHaveLength(1);
    closeDemoStore();
    await initializeDemo([draft("personal"), draft("commercial")]);
    expect(await listQuotes("commercial")).toHaveLength(0);
  });

  it("rolls back quota failures and emits changes only after committed writes", async () => {
    await initializeDemo([]);
    const onChange = vi.fn();
    const unsubscribe = subscribeDemoChanges(onChange);
    const add = vi
      .spyOn(IDBObjectStore.prototype, "add")
      .mockImplementationOnce(() => {
        throw new DOMException("full", "QuotaExceededError");
      });
    await expect(saveQuote(draft())).rejects.toMatchObject({
      code: "storage_full",
    });
    expect(onChange).not.toHaveBeenCalled();
    expect(await listQuotes("home")).toEqual([]);
    add.mockRestore();
    const saved = await saveQuote(draft());
    expect(saved.id).toBe(1);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect((await getQuote(saved.id))?.id).toBe(saved.id);
    unsubscribe();
  });

  it("reports disabled browser storage clearly", async () => {
    vi.stubGlobal("indexedDB", undefined);
    await expect(initializeDemo([])).rejects.toMatchObject({
      code: "unavailable",
    });
  });

  it("allows a reset to repair corrupt metadata without dropping other site storage", async () => {
    await initializeDemo([draft()]);
    await rawWrite("meta", {
      id: "state",
      schemaVersion: 1,
      nextQuoteId: "broken",
    });
    await expect(saveQuote(draft())).rejects.toMatchObject({
      code: "corrupt_data",
    });
    await resetDemo();
    expect(await listQuotes("home")).toHaveLength(1);
    expect((await saveQuote(draft())).id).toBe(2);
  });

  it("does not mark an uninitialized workspace seeded after recovering from failed initialization", async () => {
    await expect(
      initializeDemo([{ ...draft(), customerName: "" }]),
    ).rejects.toMatchObject({ code: "invalid_input" });
    await resetDemo();
    closeDemoStore();
    await initializeDemo([draft()]);
    expect(await listQuotes("home")).toHaveLength(1);
  });
});
