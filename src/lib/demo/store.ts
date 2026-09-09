import {
  DEMO_ACTOR,
  DEMO_AREAS,
  DEMO_WORKFLOW_STATUSES,
  type DemoArea,
  type DemoCore,
  type DemoHistoryEvent,
  type DemoQuote,
  type DemoQuoteDraft,
  type DemoReviewDecision,
  type DemoSeedDraft,
  type DemoWorkflowStatus,
} from "./types";
import {
  assertDemoResultShape,
  canAcceptDemoFinancials,
} from "./snapshot-validation";

export const DEMO_DATABASE_NAME = "pricing-portfolio-demo";
const DATABASE_VERSION = 1;
const STORES = [...DEMO_AREAS, "cores", "meta"];
type StoreName = DemoArea | "cores" | "meta";
type ErrorCode =
  | "unavailable"
  | "blocked"
  | "unsupported_version"
  | "corrupt_data"
  | "storage_full"
  | "storage_failure"
  | "invalid_input"
  | "not_found"
  | "stale_revision"
  | "review_incomplete"
  | "review_already_decided";

export class DemoStoreError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "DemoStoreError";
  }
}

interface Metadata {
  id: "state";
  schemaVersion: number;
  nextQuoteId: number;
  nextCoreId: number;
  seeded: boolean;
}

let databasePromise: Promise<IDBDatabase> | undefined;
let currentDatabase: IDBDatabase | undefined;
let resetSeeds: DemoSeedDraft[] | undefined;
const listeners = new Set<() => void>();
let channel: BroadcastChannel | undefined;

function announceChange(broadcast = true): void {
  // A view failing to refresh must not turn an already committed save into a failure.
  for (const listener of listeners) {
    try {
      listener();
    } catch {
      /* Other subscribed views still refresh. */
    }
  }
  if (broadcast) channel?.postMessage("changed");
}

export function subscribeDemoChanges(listener: () => void): () => void {
  listeners.add(listener);
  if (
    typeof window !== "undefined" &&
    typeof BroadcastChannel !== "undefined" &&
    !channel
  ) {
    channel = new BroadcastChannel(DEMO_DATABASE_NAME);
    channel.onmessage = () => announceChange(false);
  }
  return () => {
    listeners.delete(listener);
  };
}

function storageError(error: unknown): DemoStoreError {
  if (error instanceof DemoStoreError) return error;
  const name = error instanceof Error ? error.name : "";
  if (name === "QuotaExceededError")
    return new DemoStoreError(
      "storage_full",
      "Browser storage is full. Remove other site data or reset this demo before trying again.",
    );
  if (name === "VersionError")
    return new DemoStoreError(
      "unsupported_version",
      "This browser contains data from a newer demo version. Update this page before continuing.",
    );
  if (name === "SecurityError" || name === "InvalidStateError")
    return new DemoStoreError(
      "unavailable",
      "Browser storage is unavailable. Allow site storage or try another browser.",
    );
  return new DemoStoreError(
    "storage_failure",
    "The browser could not save or read demo data. Your previous saved quotes have not been intentionally replaced.",
  );
}

function fail(code: ErrorCode, message: string): never {
  throw new DemoStoreError(code, message);
}
function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function id(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}
function area(value: unknown): value is DemoArea {
  return DEMO_AREAS.includes(value as DemoArea);
}
function validDate(value: unknown): boolean {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}
function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
function validText(
  value: unknown,
  max: number,
  empty = false,
): value is string {
  return (
    typeof value === "string" &&
    value.length <= max &&
    (empty || value.trim().length > 0)
  );
}
function requireId(value: number): void {
  if (!id(value)) fail("invalid_input", "Choose a valid saved quote.");
}
function requireArea(value: DemoArea): void {
  if (!area(value))
    fail("invalid_input", "Choose Home, Personal or Commercial lending.");
}

function snapshot<T>(value: T): T {
  const seen = new Set<object>();
  function inspect(item: unknown): void {
    if (
      item === null ||
      item === undefined ||
      typeof item === "string" ||
      typeof item === "boolean"
    )
      return;
    if (typeof item === "number" && Number.isFinite(item)) return;
    if (typeof item !== "object" || seen.has(item))
      fail(
        "invalid_input",
        "The saved calculation must contain plain, finite data.",
      );
    const prototype = Object.getPrototypeOf(item);
    if (
      !Array.isArray(item) &&
      prototype !== Object.prototype &&
      prototype !== null
    )
      fail("invalid_input", "The saved calculation must contain plain data.");
    seen.add(item);
    for (const child of Object.values(item)) inspect(child);
    seen.delete(item);
  }
  inspect(value);
  return structuredClone(value);
}

function freeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) freeze(child);
  }
  return value;
}

function checkDraft(value: unknown): asserts value is DemoQuoteDraft {
  if (
    !record(value) ||
    !area(value.area) ||
    !validText(value.customerName, 120) ||
    !record(value.input) ||
    !record(value.result) ||
    !record(value.summary)
  )
    fail(
      "invalid_input",
      "Enter a customer name and calculate a valid quote before saving.",
    );
  const summary = value.summary;
  if (
    !validText(summary.productName, 180) ||
    !finite(summary.amount) ||
    summary.amount <= 0 ||
    !(summary.rate === null || finite(summary.rate)) ||
    !(summary.repayment === null || finite(summary.repayment)) ||
    !validText(summary.approval, 100)
  )
    fail("invalid_input", "The quote summary contains invalid pricing values.");
  try {
    assertDemoResultShape(value.area, value.result);
  } catch {
    fail(
      "invalid_input",
      "The saved pricing result is incomplete or unreadable. Calculate the quote again before saving.",
    );
  }
  if (
    summary.amount !== value.input.loanAmount ||
    summary.rate !== value.result.finalDisplayRate ||
    summary.repayment !== value.result.monthlyRepayment ||
    summary.approval !== value.result.approvalLevel
  )
    fail(
      "invalid_input",
      "The quote summary does not match its saved inputs and calculation.",
    );
  snapshot(value);
}

function readQuote(value: unknown): DemoQuote {
  try {
    checkDraft(value);
    const quote = value as DemoQuote;
    if (
      !id(quote.id) ||
      !id(quote.coreId) ||
      !id(quote.revision) ||
      !validDate(quote.createdAt)
    )
      throw new Error();
    return quote;
  } catch {
    return fail(
      "corrupt_data",
      "Saved quote data is unreadable. Reset the demo to restore its sample quotes.",
    );
  }
}

function readAreaQuote(value: unknown, lendingArea: DemoArea): DemoQuote {
  const quote = readQuote(value);
  if (quote.area !== lendingArea)
    fail(
      "corrupt_data",
      "The saved quote is in the wrong lending area. Reset the demo to restore its samples.",
    );
  return quote;
}

function readCore(value: unknown): DemoCore {
  if (
    !record(value) ||
    !id(value.id) ||
    !area(value.area) ||
    !id(value.currentQuoteId) ||
    typeof value.starred !== "boolean" ||
    !validText(value.assignee, 120, true) ||
    !DEMO_WORKFLOW_STATUSES.includes(value.status as DemoWorkflowStatus) ||
    !Array.isArray(value.comments) ||
    !Array.isArray(value.history) ||
    !(value.review === null || record(value.review))
  )
    fail(
      "corrupt_data",
      "Saved workflow data is unreadable. Reset the demo to restore its samples.",
    );
  for (const comment of value.comments) {
    if (
      !record(comment) ||
      !id(comment.id) ||
      !validText(comment.text, 2_000) ||
      !validText(comment.actor, 120) ||
      !validDate(comment.createdAt)
    )
      fail(
        "corrupt_data",
        "Saved comment data is unreadable. Reset the demo to restore its samples.",
      );
  }
  for (const event of value.history) {
    if (
      !record(event) ||
      !id(event.id) ||
      !id(event.quoteId) ||
      !validText(event.action, 40) ||
      !validText(event.detail, 2_400, true) ||
      !validText(event.actor, 120) ||
      !validDate(event.createdAt)
    )
      fail(
        "corrupt_data",
        "Saved history is unreadable. Reset the demo to restore its samples.",
      );
  }
  if (
    value.review &&
    (!id(value.review.quoteId) ||
      !["accepted", "declined", "changes_requested"].includes(
        value.review.decision as string,
      ) ||
      !validText(value.review.reason, 2_000, true) ||
      !validText(value.review.actor, 120) ||
      !validDate(value.review.createdAt))
  )
    fail(
      "corrupt_data",
      "Saved review data is unreadable. Reset the demo to restore its samples.",
    );
  return value as unknown as DemoCore;
}

function request<T>(value: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    value.onsuccess = () => resolve(value.result);
    value.onerror = () => reject(value.error);
  });
}

function openDatabase(): Promise<IDBDatabase> {
  if (databasePromise) return databasePromise;
  databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(
        new DemoStoreError(
          "unavailable",
          "This demo needs browser storage. Enable IndexedDB or try another browser.",
        ),
      );
      return;
    }
    const opening = indexedDB.open(DEMO_DATABASE_NAME, DATABASE_VERSION);
    let blocked = false;
    opening.onblocked = () => {
      blocked = true;
      reject(
        new DemoStoreError(
          "blocked",
          "Close other demo tabs, then reload to update browser storage.",
        ),
      );
    };
    opening.onerror = () => reject(storageError(opening.error));
    opening.onupgradeneeded = (event) => {
      if (event.oldVersion !== 0) {
        opening.transaction?.abort();
        return;
      }
      for (const name of STORES) {
        const store = opening.result.createObjectStore(name, { keyPath: "id" });
        if (area(name)) store.createIndex("coreId", "coreId");
      }
    };
    opening.onsuccess = () => {
      const db = opening.result;
      if (blocked) {
        db.close();
        return;
      }
      if (STORES.some((name) => !db.objectStoreNames.contains(name))) {
        db.close();
        reject(
          new DemoStoreError(
            "corrupt_data",
            "Demo storage is incomplete. Reset site data to restore the demo.",
          ),
        );
        return;
      }
      db.onversionchange = () => {
        db.close();
        currentDatabase = undefined;
        databasePromise = undefined;
      };
      currentDatabase = db;
      resolve(db);
    };
  }).catch((error: unknown) => {
    databasePromise = undefined;
    throw storageError(error);
  });
  return databasePromise;
}

/** Work can await IDB requests only; results are exposed after commit, never on request success. */
async function transaction<T>(
  names: StoreName[],
  mode: IDBTransactionMode,
  work: (tx: IDBTransaction) => Promise<T>,
): Promise<T> {
  const db = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    let tx: IDBTransaction;
    try {
      tx = db.transaction(names, mode);
    } catch (error) {
      reject(storageError(error));
      return;
    }
    let result: T;
    let failure: unknown;
    tx.oncomplete = () => {
      resolve(result);
    };
    tx.onabort = () => {
      reject(storageError(failure ?? tx.error));
    };
    tx.onerror = () => {
      /* The abort event owns the final error. */
    };
    work(tx)
      .then((value) => {
        result = value;
      })
      .catch((error: unknown) => {
        failure = error;
        try {
          tx.abort();
        } catch {
          reject(storageError(error));
        }
      });
  });
}

function freshMeta(): Metadata {
  return {
    id: "state",
    schemaVersion: 1,
    nextQuoteId: 1,
    nextCoreId: 1,
    seeded: false,
  };
}
async function getMeta(tx: IDBTransaction): Promise<Metadata> {
  const value: unknown = await request(tx.objectStore("meta").get("state"));
  if (value === undefined) {
    for (const name of [...DEMO_AREAS, "cores"]) {
      if ((await request(tx.objectStore(name).count())) > 0)
        fail(
          "corrupt_data",
          "Demo storage metadata is missing. Reset the demo to restore its samples.",
        );
    }
    return freshMeta();
  }
  if (
    !record(value) ||
    value.schemaVersion !== 1 ||
    !id(value.nextQuoteId) ||
    !id(value.nextCoreId) ||
    typeof value.seeded !== "boolean"
  )
    fail(
      "corrupt_data",
      "The saved demo format is unreadable. Reset the demo to restore its samples.",
    );
  return value as unknown as Metadata;
}

function history(
  core: DemoCore,
  action: DemoHistoryEvent["action"],
  detail: string,
): void {
  core.history.push({
    id: core.history.length + 1,
    action,
    quoteId: core.currentQuoteId,
    detail,
    actor: DEMO_ACTOR,
    createdAt: new Date().toISOString(),
  });
}

async function insertQuote(
  tx: IDBTransaction,
  meta: Metadata,
  draft: DemoQuoteDraft,
  previous?: DemoQuote,
): Promise<DemoQuote> {
  const core = previous
    ? readCore(await request(tx.objectStore("cores").get(previous.coreId)))
    : null;
  if (
    core &&
    (core.area !== draft.area || core.currentQuoteId !== previous?.id)
  )
    fail(
      "stale_revision",
      "A newer revision already exists. Open the latest quote before revising it.",
    );
  if (!id(meta.nextQuoteId + 1) || !id(meta.nextCoreId + 1))
    fail(
      "storage_full",
      "The demo has reached its saved quote limit. Reset it to continue.",
    );
  const quote: DemoQuote = {
    ...draft,
    id: meta.nextQuoteId++,
    coreId: core?.id ?? meta.nextCoreId++,
    revision: previous ? previous.revision + 1 : 1,
    createdAt: new Date().toISOString(),
  };
  const envelope: DemoCore = core ?? {
    id: quote.coreId,
    area: draft.area,
    currentQuoteId: quote.id,
    starred: false,
    assignee: DEMO_ACTOR,
    status: "draft",
    review: null,
    comments: [],
    history: [],
  };
  envelope.currentQuoteId = quote.id;
  envelope.status = "draft";
  envelope.review = null;
  history(
    envelope,
    previous ? "revised" : "created",
    previous
      ? `Saved revision ${quote.revision} from quote ${previous.id}.`
      : "Saved the calculated quote.",
  );
  await request(tx.objectStore(draft.area).add(quote));
  await request(tx.objectStore("cores").put(envelope));
  return quote;
}

async function seedQuotes(
  tx: IDBTransaction,
  meta: Metadata,
  seeds: DemoSeedDraft[],
): Promise<void> {
  const saved: DemoQuote[] = [];
  for (const [index, seed] of seeds.entries()) {
    const { seedRevisionOfIndex, seedStatus, seedComment, ...draft } = seed;
    if (
      seedRevisionOfIndex !== undefined &&
      (!Number.isInteger(seedRevisionOfIndex) ||
        seedRevisionOfIndex < 0 ||
        seedRevisionOfIndex >= index)
    )
      fail(
        "invalid_input",
        "A demo fixture revision must refer to an earlier seed quote.",
      );
    if (
      seedStatus !== undefined &&
      (!DEMO_WORKFLOW_STATUSES.includes(seedStatus) ||
        seedStatus === "reviewed")
    )
      fail(
        "invalid_input",
        "A demo fixture needs a valid undecided workflow status.",
      );
    if (seedComment !== undefined && !validText(seedComment, 2_000))
      fail(
        "invalid_input",
        "A demo fixture comment must contain 1–2,000 characters.",
      );
    const previous =
      seedRevisionOfIndex === undefined
        ? undefined
        : saved[seedRevisionOfIndex];
    if (previous && previous.area !== draft.area)
      fail(
        "invalid_input",
        "A demo fixture revision must remain in its lending area.",
      );
    const quote = await insertQuote(tx, meta, draft, previous);
    saved.push(quote);
    if (seedStatus || seedComment) {
      const core = readCore(
        await request(tx.objectStore("cores").get(quote.coreId)),
      );
      if (seedStatus) {
        core.status = seedStatus;
        history(
          core,
          "workflow",
          `Workflow changed to ${seedStatus.replaceAll("_", " ")}.`,
        );
      }
      if (seedComment) {
        core.comments.push({
          id: core.comments.length + 1,
          text: seedComment.trim(),
          actor: DEMO_ACTOR,
          createdAt: new Date().toISOString(),
        });
        history(core, "commented", "Added a comment.");
      }
      await request(tx.objectStore("cores").put(core));
    }
  }
}

export async function initializeDemo(
  seedDrafts?: DemoSeedDraft[],
): Promise<void> {
  const seeds = seedDrafts?.map((draft) => {
    checkDraft(draft);
    return snapshot(draft);
  });
  if (seeds) resetSeeds = seeds;
  const changed = await transaction(
    STORES as StoreName[],
    "readwrite",
    async (tx) => {
      const meta = await getMeta(tx);
      const shouldSeed = !meta.seeded && seeds !== undefined;
      if (shouldSeed) {
        await seedQuotes(tx, meta, seeds);
        meta.seeded = true;
      }
      await request(tx.objectStore("meta").put(meta));
      return shouldSeed;
    },
  );
  if (changed) announceChange();
}

export async function listQuotes(lendingArea: DemoArea): Promise<DemoQuote[]> {
  requireArea(lendingArea);
  return transaction([lendingArea], "readonly", async (tx) =>
    freeze(
      (await request(tx.objectStore(lendingArea).getAll()))
        .map((value) => readAreaQuote(value, lendingArea))
        .sort((a, b) => b.id - a.id),
    ),
  );
}

export function getQuote(quoteId: number): Promise<DemoQuote | undefined>;
export function getQuote(
  lendingArea: DemoArea,
  quoteId: number,
): Promise<DemoQuote | undefined>;
export async function getQuote(
  areaOrId: DemoArea | number,
  quoteId?: number,
): Promise<DemoQuote | undefined> {
  const quoteKey = typeof areaOrId === "number" ? areaOrId : quoteId!;
  requireId(quoteKey);
  const names: DemoArea[] =
    typeof areaOrId === "number" ? [...DEMO_AREAS] : [areaOrId];
  for (const name of names) requireArea(name);
  return transaction(names, "readonly", async (tx) => {
    for (const name of names) {
      const value: unknown = await request(tx.objectStore(name).get(quoteKey));
      if (value !== undefined) {
        return freeze(readAreaQuote(value, name));
      }
    }
    return undefined;
  });
}

export async function getCore(coreId: number): Promise<DemoCore | undefined> {
  requireId(coreId);
  return transaction(["cores"], "readonly", async (tx) => {
    const value: unknown = await request(tx.objectStore("cores").get(coreId));
    return value === undefined ? undefined : freeze(readCore(value));
  });
}

export async function getHistory(
  lendingArea: DemoArea,
  coreId: number,
): Promise<DemoQuote[]> {
  requireArea(lendingArea);
  requireId(coreId);
  return transaction([lendingArea], "readonly", async (tx) =>
    freeze(
      (
        await request(
          tx.objectStore(lendingArea).index("coreId").getAll(coreId),
        )
      )
        .map((value) => readAreaQuote(value, lendingArea))
        .sort((a, b) => b.revision - a.revision),
    ),
  );
}

export async function saveQuote(
  draft: DemoQuoteDraft,
  revisedFromQuoteId?: number,
): Promise<DemoQuote> {
  checkDraft(draft);
  if (revisedFromQuoteId !== undefined) requireId(revisedFromQuoteId);
  const copy = snapshot(draft);
  const quote = await transaction(
    STORES as StoreName[],
    "readwrite",
    async (tx) => {
      const meta = await getMeta(tx);
      let previous: DemoQuote | undefined;
      if (revisedFromQuoteId !== undefined) {
        const value: unknown = await request(
          tx.objectStore(copy.area).get(revisedFromQuoteId),
        );
        if (value === undefined)
          fail(
            "not_found",
            "The quote to revise was not found in this lending area.",
          );
        previous = readAreaQuote(value, copy.area);
      }
      const created = await insertQuote(tx, meta, copy, previous);
      await request(tx.objectStore("meta").put(meta));
      return freeze(created);
    },
  );
  announceChange();
  return quote;
}

async function mutateCore(
  coreId: number,
  mutate: (core: DemoCore, tx: IDBTransaction) => Promise<void> | void,
): Promise<DemoCore> {
  requireId(coreId);
  const core = await transaction(
    [...DEMO_AREAS, "cores"],
    "readwrite",
    async (tx) => {
      const value: unknown = await request(tx.objectStore("cores").get(coreId));
      if (value === undefined)
        fail("not_found", "This saved quote was not found.");
      const envelope = readCore(value);
      await mutate(envelope, tx);
      await request(tx.objectStore("cores").put(envelope));
      return freeze(envelope);
    },
  );
  announceChange();
  return core;
}

export async function setStarred(
  coreId: number,
  starred: boolean,
): Promise<DemoCore> {
  if (typeof starred !== "boolean")
    fail("invalid_input", "Choose whether to star this quote.");
  return mutateCore(coreId, (core) => {
    core.starred = starred;
    history(
      core,
      "starred",
      starred ? "Starred the quote." : "Removed the star.",
    );
  });
}

export async function assignQuote(
  coreId: number,
  assignee: string,
): Promise<DemoCore> {
  if (!validText(assignee, 120, true))
    fail("invalid_input", "Keep the assignee to 120 characters or fewer.");
  return mutateCore(coreId, (core) => {
    core.assignee = assignee.trim();
    history(
      core,
      "assigned",
      core.assignee
        ? `Assigned to ${core.assignee}.`
        : "Removed the assignment.",
    );
  });
}

export async function updateWorkflow(
  coreId: number,
  status: DemoWorkflowStatus,
  expectedQuoteId?: number,
): Promise<DemoCore> {
  if (!DEMO_WORKFLOW_STATUSES.includes(status))
    fail("invalid_input", "Choose a valid workflow status.");
  if (expectedQuoteId !== undefined) requireId(expectedQuoteId);
  return mutateCore(coreId, (core) => {
    if (
      expectedQuoteId !== undefined &&
      core.currentQuoteId !== expectedQuoteId
    )
      fail(
        "stale_revision",
        "A newer revision exists. Open the latest quote before changing its workflow.",
      );
    if (
      status === "reviewed" &&
      (!core.review ||
        core.review.quoteId !== core.currentQuoteId ||
        core.review.decision === "changes_requested")
    )
      fail(
        "review_incomplete",
        "Record an acceptance or decline for the current revision before marking the quote as reviewed.",
      );
    core.status = status;
    history(
      core,
      "workflow",
      `Workflow changed to ${status.replaceAll("_", " ")}.`,
    );
  });
}

function requireCompleteReview(quote: DemoQuote): void {
  if (!canAcceptDemoFinancials(quote.result))
    fail(
      "review_incomplete",
      "Complete the saved pricing, profit and capital results before accepting this quote.",
    );
  const result = record(quote.result) ? quote.result : {};
  const profitability = record(result.profitability)
    ? result.profitability
    : {};
  const capital = record(profitability.capitalAllocation)
    ? profitability.capitalAllocation
    : {};
  if (!(
    capital.classificationConfirmed === true ||
    (capital.classificationBasis === "override" &&
      validText(capital.overrideReason, 2_000))
  ))
    fail(
      "review_incomplete",
      "Confirm the capital classification before accepting this quote.",
    );
  const loss = record(profitability.expectedLoss)
    ? profitability.expectedLoss
    : {};
  const amount = loss.effectiveExpectedCreditLossAmount;
  const calculated =
    loss.basis === "calculated" &&
    loss.status === "calculated" &&
    finite(amount) &&
    amount >= 0;
  const override =
    loss.basis === "manual_override" &&
    finite(amount) &&
    amount >= 0 &&
    validText(loss.expectedCreditLossOverrideReason, 2_000) &&
    loss.expectedLossOverrideByName === DEMO_ACTOR &&
    loss.expectedLossOverrideByRole === "demo";
  if (!calculated && !override)
    fail(
      "review_incomplete",
      "Complete expected loss or save a reasoned demo override before accepting this quote.",
    );
}

export async function reviewQuote(
  coreId: number,
  decision: DemoReviewDecision,
  reason = "",
  expectedQuoteId?: number,
): Promise<DemoCore> {
  if (
    !["accepted", "declined", "changes_requested"].includes(decision) ||
    !validText(reason, 2_000, decision === "accepted")
  )
    fail(
      "invalid_input",
      "Choose a review outcome and add a reason for a decline or requested change (up to 2,000 characters).",
    );
  if (expectedQuoteId !== undefined) requireId(expectedQuoteId);
  return mutateCore(coreId, async (core, tx) => {
    if (
      expectedQuoteId !== undefined &&
      core.currentQuoteId !== expectedQuoteId
    )
      fail(
        "stale_revision",
        "A newer revision exists. Open the latest quote before reviewing it.",
      );
    if (core.review)
      fail(
        "review_already_decided",
        "This revision already has a review decision. Create a revision to request another review.",
      );
    const value: unknown = await request(
      tx.objectStore(core.area).get(core.currentQuoteId),
    );
    if (value === undefined)
      fail(
        "corrupt_data",
        "The current saved quote is missing. Reset the demo to restore its samples.",
      );
    if (decision === "accepted")
      requireCompleteReview(readAreaQuote(value, core.area));
    core.review = {
      quoteId: core.currentQuoteId,
      decision,
      reason: reason.trim(),
      actor: DEMO_ACTOR,
      createdAt: new Date().toISOString(),
    };
    core.status = decision === "changes_requested" ? "draft" : "reviewed";
    history(
      core,
      "reviewed",
      `Review ${decision.replaceAll("_", " ")}.${reason.trim() ? ` ${reason.trim()}` : ""}`,
    );
  });
}

export async function addComment(
  coreId: number,
  text: string,
): Promise<DemoCore> {
  if (!validText(text, 2_000))
    fail("invalid_input", "Write a comment of 1–2,000 characters.");
  return mutateCore(coreId, (core) => {
    core.comments.push({
      id: core.comments.length + 1,
      text: text.trim(),
      actor: DEMO_ACTOR,
      createdAt: new Date().toISOString(),
    });
    history(core, "commented", "Added a comment.");
  });
}

export async function resetDemo(): Promise<void> {
  await transaction(STORES as StoreName[], "readwrite", async (tx) => {
    for (const name of STORES) await request(tx.objectStore(name).clear());
    const meta = freshMeta();
    if (resetSeeds !== undefined)
      await seedQuotes(tx, meta, snapshot(resetSeeds));
    meta.seeded = resetSeeds !== undefined;
    await request(tx.objectStore("meta").put(meta));
  });
  announceChange();
}

/** Releases this tab's handle when a test or application teardown needs it. */
export function closeDemoStore(): void {
  currentDatabase?.close();
  currentDatabase = undefined;
  databasePromise = undefined;
  channel?.close();
  channel = undefined;
  resetSeeds = undefined;
}
