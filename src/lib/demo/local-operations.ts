/** Feedback and supporting files stay in IndexedDB on this browser. */
import {
  parseFeedbackSubmission,
  parseFeedbackTriageUpdate,
} from "@/lib/feedback";
import type { FeedbackDetail } from "@/lib/feedback-review";
import {
  FEEDBACK_ATTACHMENT_MAX_BYTES,
  FEEDBACK_ATTACHMENT_MAX_FILES,
  FEEDBACK_ATTACHMENT_TYPES,
  feedbackAttachmentMatchesContentType,
} from "@/lib/feedback-attachments";

export const DEMO_OPERATIONS_DATABASE_NAME =
  "pricing-portfolio-local-operations";
export interface DemoFeedbackHistory {
  id: string;
  targetId: number;
  action: "feedback_created" | "feedback_triaged";
  createdAt: string;
  actorName: string;
  reason: string;
  before: unknown;
  after: unknown;
}
type LocalFeedbackRecord = FeedbackDetail & { history?: DemoFeedbackHistory[] };
let database: Promise<IDBDatabase> | undefined;
const listeners = new Set<() => void>();
let channel: BroadcastChannel | undefined;

function announce(broadcast = true) {
  connect();
  for (const listener of listeners) {
    try {
      listener();
    } catch {
      /* Saved operations remain committed. */
    }
  }
  if (broadcast) {
    try {
      channel?.postMessage("changed");
    } catch {
      /* A notification cannot undo a saved record. */
    }
  }
}
function connect() {
  if (
    !channel &&
    typeof window !== "undefined" &&
    typeof BroadcastChannel !== "undefined"
  ) {
    channel = new BroadcastChannel(DEMO_OPERATIONS_DATABASE_NAME);
    channel.onmessage = () => announce(false);
  }
}
export function subscribeDemoLocalOperations(listener: () => void) {
  listeners.add(listener);
  connect();
  return () => {
    listeners.delete(listener);
  };
}
function openDatabase(): Promise<IDBDatabase> {
  if (!database)
    database = new Promise((resolve, reject) => {
      if (typeof indexedDB === "undefined") {
        reject(new Error("Browser storage is unavailable."));
        return;
      }
      const request = indexedDB.open(DEMO_OPERATIONS_DATABASE_NAME, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore("feedback", {
          keyPath: "id",
          autoIncrement: true,
        });
      };
      request.onsuccess = () => {
        request.result.onversionchange = () => {
          request.result.close();
          database = undefined;
        };
        resolve(request.result);
      };
      request.onerror = () => {
        database = undefined;
        reject(new Error("Browser storage could not be opened."));
      };
      request.onblocked = () => {
        database = undefined;
        reject(
          new Error("Close other demo tabs and retry opening browser storage."),
        );
      };
    });
  return database;
}
function request<T>(operation: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    operation.onsuccess = () => resolve(operation.result);
    operation.onerror = () =>
      reject(operation.error ?? new Error("Browser storage failed."));
  });
}
function complete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = transaction.onerror = () =>
      reject(
        transaction.error ??
          new Error("Feedback could not be saved in this browser."),
      );
  });
}
export async function listDemoFeedback(): Promise<FeedbackDetail[]> {
  const db = await openDatabase();
  const transaction = db.transaction("feedback", "readonly");
  const done = complete(transaction);
  void done.catch(() => {});
  const rows = (await request(
    transaction.objectStore("feedback").getAll(),
  )) as FeedbackDetail[];
  await done;
  return rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}
export async function saveDemoFeedback(formData: FormData): Promise<number> {
  const data = parseFeedbackSubmission(Object.fromEntries(formData.entries()));
  const files = formData
    .getAll("attachments")
    .filter(
      (entry): entry is File => typeof entry !== "string" && entry.size > 0,
    );
  if (files.length > FEEDBACK_ATTACHMENT_MAX_FILES)
    throw new Error("Attach up to 3 files.");
  const now = new Date();
  const attachments = [];
  for (const [index, file] of files.entries()) {
    if (
      file.size > FEEDBACK_ATTACHMENT_MAX_BYTES ||
      !FEEDBACK_ATTACHMENT_TYPES.has(file.type)
    )
      throw new Error(
        "Use PNG, JPEG, WebP, plain text or CSV files no larger than 2 MB each.",
      );
    if (
      !feedbackAttachmentMatchesContentType(
        file.type,
        new Uint8Array(await file.arrayBuffer()),
      )
    )
      throw new Error(
        `The contents of ${file.name} do not match the selected file type.`,
      );
    attachments.push({
      id: index + 1,
      filename: file.name.slice(0, 200),
      contentType: file.type,
      sizeBytes: file.size,
      createdAt: now,
      downloadAllowed: true,
      blockedReason: null,
      blob: file.slice(),
    });
  }
  const record = {
    ...data,
    status: "open",
    createdAt: now,
    updatedAt: now,
    submitter: { id: 1, name: "Demo user", email: "" },
    adminNotes: null,
    reviewedAt: null,
    reviewer: null,
    attachments,
    attachmentCount: attachments.length,
  };
  const db = await openDatabase();
  const transaction = db.transaction("feedback", "readwrite");
  const done = complete(transaction);
  void done.catch(() => {});
  const id = await request(transaction.objectStore("feedback").add(record));
  await request(
    transaction.objectStore("feedback").put({
      ...record,
      id,
      history: [
        {
          id: `${id}-created`,
          targetId: Number(id),
          action: "feedback_created",
          createdAt: now.toISOString(),
          actorName: "Demo user",
          reason: "Created local feedback",
          before: null,
          after: {
            category: record.category,
            severity: record.severity,
            status: "open",
          },
        },
      ],
    }),
  );
  await done;
  announce();
  return Number(id);
}
export async function updateDemoFeedbackTriage(
  formData: FormData,
): Promise<FeedbackDetail> {
  const data = parseFeedbackTriageUpdate(
    Object.fromEntries(formData.entries()),
  );
  const db = await openDatabase();
  const transaction = db.transaction("feedback", "readwrite");
  const done = complete(transaction);
  void done.catch(() => {});
  const row = (await request(
    transaction.objectStore("feedback").get(data.id),
  )) as LocalFeedbackRecord | undefined;
  if (!row || row.updatedAt.getTime() !== data.expectedUpdatedAt.getTime()) {
    transaction.abort();
    await done.catch(() => undefined);
    throw new Error(
      "This feedback changed in another tab. Refresh it before saving your triage.",
    );
  }
  const now = new Date(Math.max(Date.now(), row.updatedAt.getTime() + 1));
  const updated: LocalFeedbackRecord = {
    ...row,
    status: data.status,
    adminNotes: data.adminNotes,
    updatedAt: now,
    reviewedAt: now,
    reviewer: { id: 1, name: "Demo user", email: "" },
    history: [
      ...(row.history ?? []),
      {
        id: `${row.id}-${now.getTime()}`,
        targetId: row.id,
        action: "feedback_triaged",
        createdAt: now.toISOString(),
        actorName: "Demo user",
        reason: "Saved feedback triage",
        before: { status: row.status, adminNotes: row.adminNotes },
        after: { status: data.status, adminNotes: data.adminNotes },
      },
    ],
  };
  await request(transaction.objectStore("feedback").put(updated));
  await done;
  announce();
  return updated;
}
export async function resetDemoLocalOperations(): Promise<void> {
  const db = await openDatabase();
  const transaction = db.transaction("feedback", "readwrite");
  const done = complete(transaction);
  void done.catch(() => {});
  await request(transaction.objectStore("feedback").clear());
  await done;
  announce();
}

export async function readDemoFeedbackHistory(): Promise<
  DemoFeedbackHistory[]
> {
  const rows = (await listDemoFeedback()) as LocalFeedbackRecord[];
  return rows
    .flatMap((row) => row.history ?? [])
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
