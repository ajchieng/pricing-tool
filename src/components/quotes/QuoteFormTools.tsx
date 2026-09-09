"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { ChevronDown, Search } from "lucide-react";
import {
  QuoteParameterFinder,
  type QuoteParameterFinderHandle,
} from "@/components/quotes/QuoteParameterFinder";
import { buttonClass } from "@/components/ui/Button";

const MENU_WIDTH = 216;

export function QuoteFormTools({ children }: { children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const finderRef = useRef<QuoteParameterFinderHandle>(null);

  function openMenu() {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const below = rect.bottom + 4;
    setPosition({
      top:
        below + 52 <= window.innerHeight - 8
          ? below
          : Math.max(8, rect.top - 56),
      left: Math.max(
        8,
        Math.min(window.innerWidth - MENU_WIDTH - 8, rect.right - MENU_WIDTH),
      ),
    });
    setOpen(true);
    requestAnimationFrame(() =>
      menuRef.current
        ?.querySelector<HTMLButtonElement>('[role="menuitem"]')
        ?.focus({ preventScroll: true }),
    );
  }
  function closeMenu(restoreFocus = true) {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }
  function handleKeyDown(event: KeyboardEvent<HTMLSpanElement>) {
    const fromTrigger = event.target === triggerRef.current;
    const fromMenu = menuRef.current?.contains(event.target as Node);
    // The finder dialog and other form tools own their keyboard interactions.
    if (!fromTrigger && !fromMenu) return;
    if (event.key === "Escape") {
      if (!open) return;
      event.preventDefault();
      closeMenu();
    } else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      if (event.target === triggerRef.current) openMenu();
      else
        menuRef.current
          ?.querySelector<HTMLButtonElement>('[role="menuitem"]')
          ?.focus({ preventScroll: true });
    } else if (event.key === "Tab") setOpen(false);
  }
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  return (
    <span className="inline-flex items-center gap-2" onKeyDown={handleKeyDown}>
      <QuoteParameterFinder ref={finderRef} triggerClassName="max-sm:!hidden" />
      {children}
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => (open ? closeMenu() : openMenu())}
        className={buttonClass("secondary", "sm", "sm:hidden")}
      >
        More
        <ChevronDown size={14} strokeWidth={1.9} aria-hidden />
      </button>
      {open && position ? (
        <>
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={() => closeMenu()}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div
            ref={menuRef}
            role="menu"
            aria-label="Quote tools"
            className="fixed z-50 rounded-lg border border-border bg-surface p-1 shadow-[var(--shadow-md)]"
            style={{
              top: position.top,
              left: position.left,
              width: MENU_WIDTH,
            }}
          >
            <button
              role="menuitem"
              type="button"
              onClick={() => {
                // The menuitem unmounts. Keep a persistent, visible return target.
                closeMenu();
                requestAnimationFrame(() => finderRef.current?.open());
              }}
              className="flex min-h-[44px] w-full items-center gap-2 rounded-md px-3 text-left text-sm text-ink transition-colors hover:bg-panel"
            >
              <Search size={15} strokeWidth={1.75} aria-hidden />
              Find parameter
            </button>
          </div>
        </>
      ) : null}
    </span>
  );
}
