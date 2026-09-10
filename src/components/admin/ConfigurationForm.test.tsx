// @vitest-environment jsdom

import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { ConfigurationForm } from "./ConfigurationForm";
import {
  reportConfigurationResult,
  useConfigurationResult,
  useDemoConfiguration,
} from "@/lib/demo/configuration-react";
import { expectedConfigurationVersion } from "@/lib/demo/configuration-form-version";
import { createConfigurationActions } from "@/lib/demo/configuration-actions";
import {
  closeDemoConfiguration,
  getDemoConfiguration,
  initializeDemoConfiguration,
  mutateDemoConfiguration,
  readDemoConfigurationHistory,
} from "@/lib/demo/configuration";

vi.mock("@/lib/demo/configuration-react", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/demo/configuration-react")>();
  return { ...actual, useDemoConfiguration: vi.fn(() => ({ version: 1 })) };
});
beforeEach(() => {
  reportConfigurationResult("");
  vi.mocked(useDemoConfiguration).mockReturnValue({ version: 1 } as ReturnType<
    typeof useDemoConfiguration
  >);
});

afterEach(cleanup);

function Status() {
  const result = useConfigurationResult();
  return <p role="status">{result?.message}</p>;
}

describe("configuration row forms", () => {
  it("submits controls outside the form and preserves edits after a failed save", async () => {
    const action = vi.fn(async () => {
      throw new Error("Rate exceeds the allowed range.");
    });
    render(
      <>
        <ConfigurationForm id="rate-row" action={action}>
          <input type="hidden" name="id" value="7" />
        </ConfigurationForm>
        <label>
          Carded rate
          <input form="rate-row" name="cardedRate" defaultValue="6.4" />
        </label>
        <button form="rate-row" type="submit">
          Save
        </button>
        <Status />
      </>,
    );
    const field = screen.getByRole("textbox", {
      name: "Carded rate",
    }) as HTMLInputElement;
    fireEvent.change(field, { target: { value: "120" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toBe(
        "Rate exceeds the allowed range.",
      ),
    );
    const submitted = action.mock.calls[0] as unknown as [FormData];
    expect(submitted[0].get("id")).toBe("7");
    expect(submitted[0].get("cardedRate")).toBe("120");
    expect(field.value).toBe("120");
  });
});

it("retains the draft version after another tab publishes and preserves the rejected draft", async () => {
  const action = vi.fn(async (fd: FormData) => {
    if (expectedConfigurationVersion(fd, 2) !== 2)
      throw new Error(
        "Configuration changed. Reload before saving this draft.",
      );
  });
  function Row() {
    return (
      <>
        <ConfigurationForm id="shared-row" action={action} />
        <label>
          Rate draft
          <input form="shared-row" name="cardedRate" defaultValue="6.4" />
        </label>
        <button form="shared-row" type="submit">
          Save draft
        </button>
        <Status />
      </>
    );
  }
  const { rerender } = render(<Row />);
  const field = screen.getByRole("textbox", {
    name: "Rate draft",
  }) as HTMLInputElement;
  fireEvent.change(field, { target: { value: "6.7" } });
  vi.mocked(useDemoConfiguration).mockReturnValue({ version: 2 } as ReturnType<
    typeof useDemoConfiguration
  >);
  rerender(<Row />);
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  await waitFor(() =>
    expect(screen.getByRole("status").textContent).toBe(
      "Configuration changed. Reload before saving this draft.",
    ),
  );
  expect(expectedConfigurationVersion(action.mock.calls[0][0], 2)).toBe(1);
  expect(field.value).toBe("6.7");
});

describe("displayed policy baseline", () => {
  beforeEach(async () => {
    closeDemoConfiguration();
    vi.stubGlobal("indexedDB", new IDBFactory());
    await initializeDemoConfiguration();
    vi.mocked(useDemoConfiguration).mockImplementation(getDemoConfiguration);
  });
  afterEach(() => {
    closeDemoConfiguration();
    vi.unstubAllGlobals();
  });

  function ProductRow({
    action,
  }: {
    action?: (data: FormData) => Promise<void>;
  }) {
    const configuration = useDemoConfiguration();
    const product = configuration.tables.product[0];
    return (
      <>
        <ConfigurationForm
          id="product-row"
          action={
            action ??
            createConfigurationActions(configuration.version).updateProduct
          }
        >
          {Object.entries(product)
            .filter(([key]) => key !== "name" && key !== "loanPurpose")
            .map(([key, value]) => (
              <input
                key={key}
                type="hidden"
                name={key}
                value={value == null ? "" : String(value)}
              />
            ))}
        </ConfigurationForm>
        <label>
          Product name
          <input
            form="product-row"
            name="name"
            defaultValue={String(product.name)}
          />
        </label>
        <label>
          Purpose
          <select
            form="product-row"
            name="loanPurpose"
            defaultValue={String(product.loanPurpose)}
          >
            <option value="owner_occupied">Owner occupied</option>
            <option value="investment">Investment</option>
          </select>
        </label>
        <button form="product-row" type="submit">
          Save product
        </button>
        <Status />
      </>
    );
  }

  async function publishOtherTabProduct() {
    const configuration = getDemoConfiguration();
    const product = configuration.tables.product[0];
    await mutateDemoConfiguration({
      expectedVersion: configuration.version,
      targetType: "product",
      targetId: product.id,
      action: "update",
      data: {
        name: "Updated in another tab",
        loanPurpose:
          product.loanPurpose === "owner_occupied"
            ? "investment"
            : "owner_occupied",
      },
      reason: "Fictional policy update in another tab",
    });
    return getDemoConfiguration();
  }

  async function expectPreservedConflict() {
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toContain(
        "Your entered values are preserved. Reload this page",
      ),
    );
  }

  it("rejects a pristine select's old value after another tab updates policy, even when editing starts later", async () => {
    const original = getDemoConfiguration();
    const { rerender } = render(<ProductRow />);
    const purpose = screen.getByRole("combobox", {
      name: "Purpose",
    }) as HTMLSelectElement;

    const newer = await publishOtherTabProduct();
    rerender(<ProductRow />);
    expect(purpose.value).toBe(original.tables.product[0].loanPurpose);
    expect(purpose.value).not.toBe(newer.tables.product[0].loanPurpose);

    fireEvent.change(screen.getByRole("textbox", { name: "Product name" }), {
      target: { value: "Preserve this later draft" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save product" }));

    await expectPreservedConflict();
    expect(getDemoConfiguration()).toEqual(newer);
    expect(await readDemoConfigurationHistory()).toHaveLength(1);
    expect(
      (
        screen.getByRole("textbox", {
          name: "Product name",
        }) as HTMLInputElement
      ).value,
    ).toBe("Preserve this later draft");
    expect(purpose.value).toBe(original.tables.product[0].loanPurpose);
  });

  it("advances after its own save but rejects a newer policy published while the next save is finishing", async () => {
    const original = getDemoConfiguration();
    let publishWhileFinishing = false;
    const submittedVersions: number[] = [];
    const action = async (data: FormData) => {
      const current = getDemoConfiguration();
      submittedVersions.push(
        expectedConfigurationVersion(data, current.version),
      );
      await createConfigurationActions(current.version).updateProduct(data);
      if (publishWhileFinishing) await publishOtherTabProduct();
    };
    const { rerender } = render(<ProductRow action={action} />);
    const name = screen.getByRole("textbox", {
      name: "Product name",
    }) as HTMLInputElement;
    const purpose = screen.getByRole("combobox", {
      name: "Purpose",
    }) as HTMLSelectElement;
    const submit = screen.getByRole("button", { name: "Save product" });

    fireEvent.change(name, { target: { value: "First saved name" } });
    fireEvent.click(submit);
    await waitFor(() =>
      expect(
        document.getElementById("product-row")?.getAttribute("aria-busy"),
      ).toBeNull(),
    );
    expect(getDemoConfiguration().version).toBe(original.version + 1);
    rerender(<ProductRow action={action} />);

    publishWhileFinishing = true;
    fireEvent.change(name, { target: { value: "Second saved name" } });
    fireEvent.click(submit);
    await waitFor(() =>
      expect(
        document.getElementById("product-row")?.getAttribute("aria-busy"),
      ).toBeNull(),
    );
    const newer = getDemoConfiguration();
    expect(newer.version).toBe(original.version + 3);
    rerender(<ProductRow action={action} />);
    expect(purpose.value).not.toBe(newer.tables.product[0].loanPurpose);

    fireEvent.change(name, { target: { value: "Keep this unsaved name" } });
    fireEvent.click(submit);
    await expectPreservedConflict();
    expect(submittedVersions).toEqual([
      original.version,
      original.version + 1,
      original.version + 2,
    ]);
    expect(getDemoConfiguration()).toEqual(newer);
    expect(await readDemoConfigurationHistory()).toHaveLength(3);
    expect(name.value).toBe("Keep this unsaved name");
    expect(purpose.value).toBe(original.tables.product[0].loanPurpose);
  });
});
