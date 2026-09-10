// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ExpectedLossPolicyDraftEditor } from "./ExpectedLossPolicyDraftEditor";
import { demoExpectedLossPolicies } from "@/lib/demo/policy-seeds";
import { mutateDemoConfiguration } from "@/lib/demo/configuration";
import { scheduleDemoConfigurationChange } from "@/lib/demo/configuration-governance";
import { reportConfigurationResult } from "@/lib/demo/configuration-react";

vi.mock("@/lib/demo/configuration", () => ({
  mutateDemoConfiguration: vi.fn(),
}));
vi.mock("@/lib/demo/configuration-governance", () => ({
  scheduleDemoConfigurationChange: vi.fn(),
}));
vi.mock("@/lib/demo/configuration-react", () => ({
  reportConfigurationResult: vi.fn(),
}));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

function renderDraft(effectiveFrom: string) {
  const policy = demoExpectedLossPolicies.personal;
  const onReload = vi.fn();
  render(
    <ExpectedLossPolicyDraftEditor
      vertical="personal"
      configurationVersion={7}
      nextVersion={policy.version + 1}
      riskDefinitionHash={policy.compatibleRiskDefinitionHash}
      sourceScoreModelVersion={policy.sourceScoreModelVersion}
      lgdScopes={policy.lgdBands.map((row) => row.lossScope)}
      eadScopes={policy.eadSettings.map((row) => row.exposureScope)}
      effectiveFrom={effectiveFrom}
      onReload={onReload}
    />,
  );
  fireEvent.change(screen.getByLabelText("Policy name"), {
    target: { value: "Future fictional EL policy" },
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
    target: { value: "Fictional future policy review" },
  });
  return {
    onReload,
    submit: () =>
      fireEvent.submit(
        screen
          .getByRole("button", { name: "Publish expected-loss policy" })
          .closest("form")!,
      ),
  };
}

it("schedules a future policy and resets the draft only after the queue commit succeeds", async () => {
  let committed!: () => void;
  vi.mocked(scheduleDemoConfigurationChange).mockImplementation(
    () =>
      new Promise((resolve) => {
        committed = () =>
          resolve(
            {} as Awaited<ReturnType<typeof scheduleDemoConfigurationChange>>,
          );
      }),
  );
  const { onReload, submit } = renderDraft("2099-01-01");
  submit();
  await waitFor(() =>
    expect(scheduleDemoConfigurationChange).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedVersion: 7,
        effectiveAt: "2099-01-01T00:00:00.000Z",
        mutation: expect.objectContaining({
          targetType: "expected_loss_policy",
          action: "create",
        }),
      }),
    ),
  );
  expect(mutateDemoConfiguration).not.toHaveBeenCalled();
  expect(onReload).not.toHaveBeenCalled();
  committed();
  await waitFor(() => expect(onReload).toHaveBeenCalledOnce());
  expect(reportConfigurationResult).toHaveBeenCalledWith(
    expect.stringContaining("scheduled in the approval queue"),
    "success",
  );
});

it("keeps the entered draft when scheduling fails", async () => {
  vi.mocked(scheduleDemoConfigurationChange).mockRejectedValue(
    new Error("Configuration changed in another tab."),
  );
  const { onReload, submit } = renderDraft("2099-01-01");
  submit();
  await waitFor(() =>
    expect(screen.getByRole("alert").textContent).toContain(
      "changed in another tab",
    ),
  );
  expect((screen.getByLabelText("Policy name") as HTMLInputElement).value).toBe(
    "Future fictional EL policy",
  );
  expect(mutateDemoConfiguration).not.toHaveBeenCalled();
  expect(onReload).not.toHaveBeenCalled();
});

it("publishes a policy effective today through the existing direct mutation", async () => {
  vi.mocked(mutateDemoConfiguration).mockResolvedValue(
    {} as Awaited<ReturnType<typeof mutateDemoConfiguration>>,
  );
  const { onReload, submit } = renderDraft(
    new Date().toISOString().slice(0, 10),
  );
  submit();
  await waitFor(() => expect(onReload).toHaveBeenCalledOnce());
  expect(mutateDemoConfiguration).toHaveBeenCalledWith(
    expect.objectContaining({
      expectedVersion: 7,
      targetType: "expected_loss_policy",
    }),
  );
  expect(scheduleDemoConfigurationChange).not.toHaveBeenCalled();
});
