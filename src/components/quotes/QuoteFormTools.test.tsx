// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QuoteFormTools } from "./QuoteFormTools";

const nativeDialogMethods = Object.fromEntries(
  ["showModal", "close"].map((name) => [
    name,
    Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, name),
  ]),
);

beforeEach(() => {
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) =>
    window.setTimeout(() => callback(0), 0),
  );
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.setAttribute("open", "");
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.removeAttribute("open");
      this.dispatchEvent(new Event("close"));
    },
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  for (const [name, descriptor] of Object.entries(nativeDialogMethods)) {
    if (descriptor)
      Object.defineProperty(HTMLDialogElement.prototype, name, descriptor);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, name);
  }
});

describe("quote tools focus ownership", () => {
  it("leaves dialog Escape and search keys to the finder and restores its desktop trigger", async () => {
    render(<QuoteFormTools />);
    const trigger = screen.getByRole("button", { name: /Find parameter/ });
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = (await screen.findByRole("dialog", {
      name: "Find a quote parameter",
    })) as HTMLDialogElement;
    const search = screen.getByRole("combobox", {
      name: "Search inputs and results",
    });
    await waitFor(() => expect(document.activeElement).toBe(search));
    expect(fireEvent.keyDown(search, { key: "Home" })).toBe(true);
    expect(fireEvent.keyDown(search, { key: "Escape" })).toBe(true);
    expect(document.activeElement).toBe(search);
    // Browser cancellation closes the native dialog after uncancelled Escape.
    dialog.close();
    expect(document.activeElement).toBe(trigger);
  });

  it("returns focus to More after opening the finder from the mobile menu", async () => {
    render(<QuoteFormTools />);
    const more = screen.getByRole("button", { name: "More" });
    more.focus();
    fireEvent.keyDown(more, { key: "ArrowDown" });
    const item = await screen.findByRole("menuitem", {
      name: "Find parameter",
    });
    await waitFor(() => expect(document.activeElement).toBe(item));
    fireEvent.click(item);
    const dialog = (await screen.findByRole("dialog", {
      name: "Find a quote parameter",
    })) as HTMLDialogElement;
    const search = screen.getByRole("combobox", {
      name: "Search inputs and results",
    });
    await waitFor(() => expect(document.activeElement).toBe(search));
    expect(screen.queryByRole("menu", { name: "Quote tools" })).toBeNull();
    dialog.close();
    expect(document.activeElement).toBe(more);
  });
});
