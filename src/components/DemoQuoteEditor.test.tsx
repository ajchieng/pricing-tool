// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { DemoQuoteEditor } from "./DemoQuoteEditor";
import { getQuote } from "@/lib/demo/store";

vi.mock("@/lib/demo/store", () => ({ getQuote: vi.fn() }));
vi.mock("@/lib/demo/pricing", () => ({
  getDemoFormConfig: () => ({}),
  sampleInput: (area: string) => ({
    customerReference: `sample ${area}`,
    productId: area === "personal" ? 201 : 101,
    loanAmount: 35000,
  }),
}));
vi.mock("@/components/home-loans/HomeLoanQuoteForm", () => ({
  HomeLoanQuoteForm: ({
    header,
    ...props
  }: {
    header?: { title: string; actions?: ReactNode };
  }) => (
    <div data-testid="home-form">
      <h1>{header?.title}</h1>
      {header?.actions}
      {JSON.stringify(props)}
    </div>
  ),
}));
vi.mock("@/components/personal-loans/PersonalLoanQuoteForm", () => ({
  PersonalLoanQuoteForm: ({
    header,
    ...props
  }: {
    header?: { title: string; actions?: ReactNode };
  }) => (
    <div data-testid="personal-form">
      <h1>{header?.title}</h1>
      {header?.actions}
      {JSON.stringify(props)}
    </div>
  ),
}));
vi.mock("@/components/commercial-loans/CommercialLoanQuoteForm", () => ({
  CommercialLoanQuoteForm: ({
    header,
    ...props
  }: {
    header?: { title: string; actions?: ReactNode };
  }) => (
    <div data-testid="commercial-form">
      <h1>{header?.title}</h1>
      {header?.actions}
      {JSON.stringify(props)}
    </div>
  ),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("quote editor handoff and navigation", () => {
  it("preserves matching market dimensions when loading the sample again", async () => {
    render(<DemoQuoteEditor area="personal" marketId="personal-river" />);
    const form = await screen.findByTestId("personal-form");
    expect(form.textContent).toContain('"productId":"202"');
    expect(form.textContent).toContain('"securityType":"unsecured"');
    fireEvent.click(
      screen.getByRole("button", { name: "Load sample scenario" }),
    );
    expect(screen.getByTestId("personal-form").textContent).toContain(
      '"productId":"202"',
    );
    expect(screen.getByTestId("personal-form").textContent).toContain(
      '"marketRateId":"personal-river"',
    );
  });

  it("shows a clear warning and attaches no unknown or wrong-domain evidence", async () => {
    const view = render(
      <DemoQuoteEditor area="home" marketId="personal-river" />,
    );
    expect((await screen.findByTestId("home-form")).textContent).toContain(
      '"marketEvidence":null',
    );
    expect(screen.getByTestId("home-form").textContent).toContain(
      "belongs to personal",
    );
    view.rerender(<DemoQuoteEditor area="home" marketId="missing" />);
    await waitFor(() =>
      expect(screen.getByTestId("home-form").textContent).toContain(
        "could not be found",
      ),
    );
    expect(screen.getByTestId("home-form").textContent).toContain(
      '"marketEvidence":null',
    );
  });

  it("hides old revision inputs during navigation and recovers after a failed ID", async () => {
    vi.mocked(getQuote).mockResolvedValueOnce({
      id: 1,
      coreId: 1,
      revision: 1,
      createdAt: "2026-01-01T00:00:00.000Z",
      area: "home",
      customerName: "First record",
      input: { customerReference: "First record" },
      result: {},
      summary: {
        productName: "Demo home",
        amount: 420000,
        rate: 6,
        repayment: 2500,
        approval: "none",
      },
    });
    const view = render(<DemoQuoteEditor area="home" revisionId={1} />);
    expect((await screen.findByTestId("home-form")).textContent).toContain(
      "First record",
    );
    let resolve: (
      value: Awaited<ReturnType<typeof getQuote>>,
    ) => void = () => {};
    vi.mocked(getQuote).mockReturnValueOnce(
      new Promise((done) => {
        resolve = done;
      }),
    );
    view.rerender(<DemoQuoteEditor area="home" revisionId={2} />);
    expect(screen.queryByTestId("home-form")).toBeNull();
    expect(screen.getByRole("status").textContent).toContain("Loading");
    await act(async () => resolve(undefined));
    expect(screen.getByRole("alert").textContent).toContain(
      "not in this browser",
    );
    view.rerender(<DemoQuoteEditor area="home" marketId="home-river" />);
    expect((await screen.findByTestId("home-form")).textContent).toContain(
      '"marketRateId":"home-river"',
    );
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
