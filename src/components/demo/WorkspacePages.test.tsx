// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { DemoCore, DemoQuote } from "@/lib/demo/types";

const mocks = vi.hoisted(() => ({
  rawId: "1",
  getQuote: vi.fn(),
  getCore: vi.fn(),
  getHistory: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/home-loans/quote/",
  useSearchParams: () => new URLSearchParams(`id=${mocks.rawId}`),
}));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.ComponentProps<"a">) => (
    <a {...props}>{children}</a>
  ),
}));
vi.mock("./DemoProvider", () => ({
  useDemo: () => ({ ready: true, version: 0 }),
  WorkspaceLoading: () => <p role="status">Loading current quote</p>,
}));
vi.mock("@/components/DemoSavedResult", () => ({
  DemoSavedResult: () => <div>Saved calculation</div>,
}));
vi.mock("@/lib/demo/store", () => ({
  ...mocks,
  addComment: vi.fn(),
  assignQuote: vi.fn(),
  listQuotes: vi.fn(),
  reviewQuote: vi.fn(),
  setStarred: vi.fn(),
  updateWorkflow: vi.fn(),
}));
import { QuoteDetailPage } from "./WorkspacePages";

const quote = (id: number): DemoQuote => ({
  id,
  coreId: id,
  area: "home",
  revision: 1,
  customerName: `Customer ${id}`,
  createdAt: "2026-01-01T00:00:00Z",
  input: { loanAmount: 100000 },
  result: {},
  summary: {
    productName: "Sample Home",
    amount: 100000,
    rate: 6,
    repayment: 600,
    approval: "none",
  },
});
const core = (id: number): DemoCore => ({
  id,
  area: "home",
  currentQuoteId: id,
  starred: false,
  assignee: "Demo user",
  status: "draft",
  review: null,
  comments: [],
  history: [],
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it("removes the previous result and actions immediately when the quote query id changes", async () => {
  mocks.rawId = "1";
  let resolveSecond: (value: DemoQuote) => void = () => {};
  const second = new Promise<DemoQuote>((resolve) => {
    resolveSecond = resolve;
  });
  mocks.getQuote.mockImplementation((_area: string, id: number) =>
    id === 1 ? Promise.resolve(quote(1)) : second,
  );
  mocks.getCore.mockImplementation((id: number) => Promise.resolve(core(id)));
  mocks.getHistory.mockResolvedValue([]);
  const view = render(<QuoteDetailPage area="home" />);
  await screen.findByRole("heading", { name: "Customer 1" });
  mocks.rawId = "2";
  view.rerender(<QuoteDetailPage area="home" />);
  expect(screen.queryByRole("heading", { name: "Customer 1" })).toBeNull();
  expect(screen.queryByRole("link", { name: "Revise quote" })).toBeNull();
  expect(screen.getByRole("status").textContent).toBe("Loading current quote");
  await act(async () => {
    resolveSecond(quote(2));
  });
  await screen.findByRole("heading", { name: "Customer 2" });
  expect(
    screen.getByRole("link", { name: "Revise quote" }).getAttribute("href"),
  ).toContain("id=2");
});
