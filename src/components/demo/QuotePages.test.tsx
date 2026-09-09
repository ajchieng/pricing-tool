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
  getQuote: vi.fn(),
  getHistory: vi.fn(),
  reviewQuote: vi.fn(),
  setStarred: vi.fn(),
  updateWorkflow: vi.fn(),
}));
import { QuotesPage } from "./QuotePages";

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
