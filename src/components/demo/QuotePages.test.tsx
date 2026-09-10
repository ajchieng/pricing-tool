// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { DemoCore, DemoQuote } from "@/lib/demo/types";

const mocks = vi.hoisted(() => ({
  query: "",
  listeners: new Set<() => void>(),
  listQuotes: vi.fn(),
  getCore: vi.fn(),
  getQuote: vi.fn(),
  getHistory: vi.fn(),
  showHandoff: true,
  displayListeners: new Set<() => void>(),
}));
vi.mock("next/navigation", async () => {
  const { useSyncExternalStore } = await import("react");
  return {
    usePathname: () => "/home-loans/",
    useSearchParams: () =>
      new URLSearchParams(
        useSyncExternalStore(
          (listener) => {
            mocks.listeners.add(listener);
            return () => {
              mocks.listeners.delete(listener);
            };
          },
          () => mocks.query,
        ),
      ),
  };
});
vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.ComponentProps<"a">) => (
    <a {...props}>{children}</a>
  ),
}));
vi.mock("./DemoProvider", () => ({
  useDemo: () => ({ ready: true, version: 0 }),
  WorkspaceLoading: () => <p>Loading quotes</p>,
}));
vi.mock("@/lib/demo/store", () => ({
  ...mocks,
  addComment: vi.fn(),
  assignQuote: vi.fn(),
  reviewQuote: vi.fn(),
  setStarred: vi.fn(),
  updateWorkflow: vi.fn(),
}));
vi.mock("@/lib/demo/configuration-display", async () => {
  const { useSyncExternalStore } = await import("react");
  return {
    useDemoDisplaySettings: () => ({
      showQuoteHandoffStatus: useSyncExternalStore(
        (listener) => {
          mocks.displayListeners.add(listener);
          return () => {
            mocks.displayListeners.delete(listener);
          };
        },
        () => mocks.showHandoff,
      ),
    }),
  };
});
vi.mock("@/components/DemoSavedResult", () => ({
  DemoSavedResult: () => <p>Saved pricing decision remains visible.</p>,
}));
import { QuotesPage, QuoteDetailPage } from "./QuotePages";

const savedQuote: DemoQuote = {
  id: 1,
  coreId: 1,
  area: "home",
  revision: 1,
  customerName: "Workflow Example",
  createdAt: "2026-09-09T12:00:00Z",
  input: { loanAmount: 100000 },
  result: { suggestedRate: 6 },
  summary: {
    productName: "Sample Home",
    amount: 100000,
    rate: 6,
    repayment: 600,
    approval: "none",
  },
};
const savedCore: DemoCore = {
  id: 1,
  area: "home",
  currentQuoteId: 1,
  starred: true,
  assignee: "Demo user",
  status: "reviewed",
  review: null,
  comments: [],
  history: [],
};
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
  mocks.listeners.clear();
  mocks.displayListeners.clear();
  mocks.showHandoff = true;
});

it("preserves search and starred filters across consecutive native-history updates", async () => {
  // Next's patched history bypasses its route subscription for private state
  // writes. Model that boundary so this catches accidentally replaying __NA.
  const replaceState = window.history.replaceState.bind(window.history);
  replaceState({ __NA: true }, "", "/home-loans/?sort=loan&dir=asc&page=2");
  mocks.query = window.location.search;
  vi.spyOn(window.history, "replaceState").mockImplementation(
    (state, unused, url) => {
      replaceState({ ...state, __NA: true }, unused, url);
      if (state?.__NA || state?._N) return;
      mocks.query = window.location.search;
      queueMicrotask(() => {
        for (const listener of mocks.listeners) listener();
      });
    },
  );
  mocks.listQuotes.mockResolvedValue([savedQuote]);
  mocks.getCore.mockResolvedValue(savedCore);
  render(<QuotesPage area="home" />);
  await screen.findAllByRole("link", { name: "Workflow Example" });
  const search = screen.getByRole("searchbox", { name: "Search saved quotes" });
  const starred = screen.getByRole("button", {
    name: "Starred only",
  });
  await act(async () => {
    fireEvent.change(search, { target: { value: "Workflow Example" } });
    fireEvent.click(starred);
  });
  expect((search as HTMLInputElement).value).toBe("Workflow Example");
  expect(starred.getAttribute("aria-pressed")).toBe("true");
  let query = new URLSearchParams(window.location.search);
  expect(Object.fromEntries(query)).toEqual({
    sort: "loan",
    dir: "asc",
    q: "Workflow Example",
    starred: "1",
  });

  await act(async () => {
    fireEvent.change(search, { target: { value: "not-present-example" } });
  });
  await screen.findByRole("heading", { name: "No quotes match these filters" });
  expect((search as HTMLInputElement).value).toBe("not-present-example");
  expect(starred.getAttribute("aria-pressed")).toBe("true");
  query = new URLSearchParams(window.location.search);
  expect(query.get("q")).toBe("not-present-example");
  expect(query.get("starred")).toBe("1");
  expect(
    screen.queryAllByRole("link", { name: "Workflow Example" }),
  ).toHaveLength(0);
});

it("hides handoff queues, filters and assignment columns immediately and ignores hidden URL filters", async () => {
  mocks.query = "?workflow=needs_risk_info";
  mocks.listQuotes.mockResolvedValue([savedQuote]);
  mocks.getCore.mockResolvedValue(savedCore);
  render(<QuotesPage area="home" />);
  await screen.findByRole("heading", { name: "No quotes match these filters" });
  expect(
    screen.getByRole("combobox", { name: "Filter by handoff status" }),
  ).toBeTruthy();
  await act(async () => {
    mocks.showHandoff = false;
    for (const listener of mocks.displayListeners) listener();
  });
  expect(
    await screen.findAllByRole("link", { name: "Workflow Example" }),
  ).toHaveLength(2);
  expect(
    screen.queryByRole("combobox", { name: "Filter by handoff status" }),
  ).toBeNull();
  expect(screen.queryByRole("columnheader", { name: "Handoff" })).toBeNull();
  expect(screen.queryByRole("columnheader", { name: "Assigned" })).toBeNull();
  expect(screen.queryByText("Ready for review")).toBeNull();
  expect(screen.queryByText("Needs credit risk")).toBeNull();
  expect(
    screen.getByRole("link", { name: "Bulk import" }).getAttribute("href"),
  ).toBe("/home-loans/bulk-import/");
  expect(savedCore.status).toBe("reviewed");
});

it("hides saved-quote handoff controls and history while retaining review, comments and pricing", async () => {
  mocks.query = "?id=1";
  window.history.replaceState(null, "", "/home-loans/quote/?id=1");
  mocks.getQuote.mockResolvedValue(savedQuote);
  mocks.getCore.mockResolvedValue({
    ...savedCore,
    history: [
      {
        id: 1,
        action: "assigned",
        quoteId: 1,
        detail: "Assigned to Sample reviewer.",
        actor: "Demo user",
        createdAt: savedQuote.createdAt,
      },
    ],
  });
  mocks.getHistory.mockResolvedValue([savedQuote]);
  render(<QuoteDetailPage area="home" />);
  await screen.findByRole("heading", { name: "Handoff" });
  expect(screen.getByText("Update handoff")).toBeTruthy();
  await act(async () => {
    mocks.showHandoff = false;
    for (const listener of mocks.displayListeners) listener();
  });
  expect(screen.queryByRole("heading", { name: "Handoff" })).toBeNull();
  expect(screen.queryByText("Update handoff")).toBeNull();
  expect(screen.queryByText("Assigned to Sample reviewer.")).toBeNull();
  expect(screen.getByText("Current")).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Review" })).toBeTruthy();
  expect(
    screen.getByRole("heading", { name: "Record review decision" }),
  ).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Comments" })).toBeTruthy();
  expect(
    screen.getByText("Saved pricing decision remains visible."),
  ).toBeTruthy();
});
