// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { z } from "zod";
import { BulkQuoteImportWorkspace } from "./BulkQuoteImportWorkspace";
import { saveDemoForm } from "@/lib/demo/form-adapter";

vi.mock("@/lib/demo/form-adapter", () => ({ saveDemoForm: vi.fn() }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it("creates valid rows independently and retries only the failed local save", async () => {
  vi.mocked(saveDemoForm)
    .mockRejectedValueOnce(new Error("Example row needs correction"))
    .mockResolvedValueOnce({ id: 22 } as Awaited<
      ReturnType<typeof saveDemoForm>
    >)
    .mockResolvedValueOnce({ id: 23 } as Awaited<
      ReturnType<typeof saveDemoForm>
    >);
  render(
    <BulkQuoteImportWorkspace
      vertical="home"
      verticalLabel="Home Loan"
      quoteBasePath="/home-loans"
      failedFilename="unresolved.json"
      schema={z.object({
        customerReference: z.string(),
        loanAmount: z.number().positive(),
      })}
      foreignMarkers={[]}
      summarize={(row) => ({
        label: String(row.customerReference),
        amount: Number(row.loanAmount),
        scenario: "Example",
      })}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Paste JSON" }));
  fireEvent.change(screen.getByLabelText("Paste JSON array"), {
    target: {
      value: JSON.stringify([
        { customerReference: "Example A", loanAmount: 50000 },
        { customerReference: "Example B", loanAmount: 60000 },
      ]),
    },
  });
  fireEvent.click(screen.getByRole("button", { name: "Review pasted JSON" }));
  fireEvent.click(
    screen.getByRole("button", { name: "Create 2 Draft quotes" }),
  );
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Retry 1 row" })).toBeDefined(),
  );
  fireEvent.click(screen.getByRole("button", { name: "Retry 1 row" }));
  await waitFor(() =>
    expect(screen.getAllByRole("link", { name: "View quote" })).toHaveLength(2),
  );
  expect(
    vi
      .mocked(saveDemoForm)
      .mock.calls.map(([, input]) => input.customerReference),
  ).toEqual(["Example A", "Example B", "Example A"]);
  const link = new URL(
    screen
      .getAllByRole("link", { name: "View quote" })[0]
      .getAttribute("href")!,
    "https://example.test",
  );
  expect(link.pathname.replace(/\/$/, "")).toBe("/home-loans/quote");
  expect(link.searchParams.get("id")).toBe("23");
});
