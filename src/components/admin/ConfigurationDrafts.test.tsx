// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ScoreModelEditor } from "./ScoreModelEditor";
import { ExpectedLossPolicyDraftEditor } from "./ExpectedLossPolicyDraftEditor";
import { MarketSourceSelectionMatrix } from "./MarketSourceSelectionMatrix";
import {
  DEFAULT_CUSTOMER_SCORE_MODEL,
  ALLOWED_CUSTOMER_SCORE_FIELDS,
} from "@/lib/pricing/customer-score";
import { demoExpectedLossPolicies } from "@/lib/demo/policy-seeds";
import { mutateDemoConfiguration } from "@/lib/demo/configuration";
import { saveDemoMarketSelections } from "@/lib/demo/market-configuration";

vi.mock("@/lib/demo/configuration", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/demo/configuration")>()),
  mutateDemoConfiguration: vi.fn(),
}));
vi.mock("@/lib/demo/market-configuration", () => ({
  saveDemoMarketSelections: vi.fn(),
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it("preserves score edits and submits the original draft version after a remote publication", async () => {
  vi.mocked(mutateDemoConfiguration).mockRejectedValue(
    new Error("Configuration changed in another tab."),
  );
  const props = {
    activeModel: DEFAULT_CUSTOMER_SCORE_MODEL,
    defaultModel: DEFAULT_CUSTOMER_SCORE_MODEL,
    fields: ALLOWED_CUSTOMER_SCORE_FIELDS,
    configurationVersion: 1,
    instantApply: true,
  };
  const { rerender } = render(<ScoreModelEditor {...props} />);
  fireEvent.change(screen.getByLabelText("Model name"), {
    target: { value: "Fictional unsaved draft" },
  });
  rerender(
    <ScoreModelEditor
      {...props}
      configurationVersion={2}
      activeModel={{
        ...DEFAULT_CUSTOMER_SCORE_MODEL,
        version: DEFAULT_CUSTOMER_SCORE_MODEL.version + 1,
        name: "Remote model",
      }}
    />,
  );
  expect((screen.getByLabelText("Model name") as HTMLInputElement).value).toBe(
    "Fictional unsaved draft",
  );
  fireEvent.submit(
    screen
      .getByRole("button", { name: "Publish score model" })
      .closest("form")!,
  );
  await waitFor(() =>
    expect(mutateDemoConfiguration).toHaveBeenCalledWith(
      expect.objectContaining({ expectedVersion: 1 }),
    ),
  );
  expect((screen.getByLabelText("Model name") as HTMLInputElement).value).toBe(
    "Fictional unsaved draft",
  );
});

it("preserves expected-loss policy fields and stale protection until explicitly reloaded", async () => {
  vi.mocked(mutateDemoConfiguration).mockRejectedValue(
    new Error("Configuration changed in another tab."),
  );
  const policy = demoExpectedLossPolicies.personal;
  const props = {
    vertical: "personal" as const,
    configurationVersion: 1,
    nextVersion: policy.version + 1,
    riskDefinitionHash: policy.compatibleRiskDefinitionHash,
    sourceScoreModelVersion: policy.sourceScoreModelVersion,
    lgdScopes: policy.lgdBands.map((row) => row.lossScope),
    eadScopes: policy.eadSettings.map((row) => row.exposureScope),
    effectiveFrom: "2026-01-01",
    onReload: vi.fn(),
  };
  const { rerender } = render(<ExpectedLossPolicyDraftEditor {...props} />);
  fireEvent.change(screen.getByLabelText("Policy name"), {
    target: { value: "Fictional EL draft" },
  });
  fireEvent.change(screen.getByLabelText("PD grades and bands"), {
    target: { value: JSON.stringify(policy.pdBands) },
  });
  fireEvent.change(screen.getByLabelText("LGD scopes"), {
    target: { value: JSON.stringify(policy.lgdBands) },
  });
  fireEvent.change(screen.getByLabelText("EAD methods and CCFs"), {
    target: { value: JSON.stringify(policy.eadSettings) },
  });
  fireEvent.change(screen.getByLabelText("Change reason"), {
    target: { value: "Example edit" },
  });
  rerender(
    <ExpectedLossPolicyDraftEditor {...props} configurationVersion={2} />,
  );
  expect((screen.getByLabelText("Policy name") as HTMLInputElement).value).toBe(
    "Fictional EL draft",
  );
  fireEvent.submit(
    screen
      .getByRole("button", { name: "Publish expected-loss policy" })
      .closest("form")!,
  );
  await waitFor(() =>
    expect(mutateDemoConfiguration).toHaveBeenCalledWith(
      expect.objectContaining({ expectedVersion: 1 }),
    ),
  );
  expect((screen.getByLabelText("Policy name") as HTMLInputElement).value).toBe(
    "Fictional EL draft",
  );
});

it("retains lender matrix drafts and rejects a refreshed configuration version", async () => {
  vi.mocked(saveDemoMarketSelections).mockRejectedValue(
    new Error("Configuration changed in another tab."),
  );
  const sources = [
    {
      id: 1,
      lenderName: "Riverbank Demo",
      brandName: null,
      operationalAvailable: true,
      isOwnBrand: false,
      home: true,
      personal: true,
      commercial: true,
    },
  ];
  const { rerender } = render(
    <MarketSourceSelectionMatrix sources={sources} configurationVersion={1} />,
  );
  fireEvent.click(
    screen.getByRole("checkbox", { name: "Home Loans — Riverbank Demo" }),
  );
  rerender(
    <MarketSourceSelectionMatrix sources={sources} configurationVersion={2} />,
  );
  expect(
    (
      screen.getByRole("checkbox", {
        name: "Home Loans — Riverbank Demo",
      }) as HTMLInputElement
    ).checked,
  ).toBe(false);
  fireEvent.submit(
    screen.getByRole("button", { name: "Save selections" }).closest("form")!,
  );
  await waitFor(() =>
    expect(saveDemoMarketSelections).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ 1: expect.objectContaining({ home: false }) }),
      "",
    ),
  );
});
