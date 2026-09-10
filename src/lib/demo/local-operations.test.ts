import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import {
  listDemoFeedback,
  resetDemoLocalOperations,
  readDemoFeedbackHistory,
  saveDemoFeedback,
  updateDemoFeedbackTriage,
} from "./local-operations";

function submission(message = "Example issue with the draft workflow") {
  const form = new FormData();
  form.set("category", "usability");
  form.set("severity", "medium");
  form.set("message", message);
  form.set("submitterName", "Example reviewer");
  return form;
}
describe("local feedback operations", () => {
  beforeEach(async () => {
    await resetDemoLocalOperations();
  });

  it("stores feedback and supporting files entirely in browser records", async () => {
    const form = submission();
    form.append(
      "attachments",
      new File(["Fictional review note"], "note.txt", { type: "text/plain" }),
    );
    const id = await saveDemoFeedback(form);
    const [row] = await listDemoFeedback();
    expect(row).toMatchObject({
      id,
      status: "open",
      submitterName: "Example reviewer",
      attachmentCount: 1,
    });
    expect(await row.attachments[0].blob?.text()).toBe("Fictional review note");
    await resetDemoLocalOperations();
    expect(await listDemoFeedback()).toEqual([]);
  });

  it("records triage and rejects stale updates without overwriting the accepted change", async () => {
    const id = await saveDemoFeedback(submission());
    const [row] = await listDemoFeedback();
    const form = new FormData();
    form.set("id", String(id));
    form.set("expectedUpdatedAt", row.updatedAt.toISOString());
    form.set("status", "reviewed");
    form.set("adminNotes", "Example issue reviewed");
    const updated = await updateDemoFeedbackTriage(form);
    expect(updated.status).toBe("reviewed");
    expect(updated.reviewer?.name).toBe("Demo user");
    await expect(updateDemoFeedbackTriage(form)).rejects.toThrow(
      "changed in another tab",
    );
    expect((await listDemoFeedback())[0].adminNotes).toBe(
      "Example issue reviewed",
    );
    const history = await readDemoFeedbackHistory();
    expect(history.map((event) => event.action)).toEqual([
      "feedback_triaged",
      "feedback_created",
    ]);
    expect(history.every((event) => event.actorName === "Demo user")).toBe(
      true,
    );
  });

  it("rejects invalid attachments without persisting a partial submission", async () => {
    const form = submission();
    form.append(
      "attachments",
      new File(["not a PNG"], "image.png", { type: "image/png" }),
    );
    await expect(saveDemoFeedback(form)).rejects.toThrow("do not match");
    expect(await listDemoFeedback()).toEqual([]);
  });
});
