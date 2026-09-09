"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import { AREA_INFO, quoteHref } from "@/lib/demo/presentation";
import type { DemoArea } from "@/lib/demo/types";

const MENU_WIDTH = 176; // matches w-44

// Row overflow menu. Positioned `fixed` so it escapes the table's
// overflow-x-auto container instead of being clipped by it.

export function DemoQuoteRowMenu({
  quoteId,
  area,
}: {
  quoteId: number;
  area: DemoArea;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const basePath = AREA_INFO[area].path;

  function menuItems(): HTMLElement[] {
    return Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>(
        '[role="menuitem"]:not([disabled])',
      ) ?? [],
    );
  }

  function openMenu(focus: "first" | "last" = "first") {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const menuHeight = 3 * 44 + 24;
    const below = rect.bottom + 4;
    const top =
      below + menuHeight <= window.innerHeight - 8
        ? below
        : Math.max(8, rect.top - menuHeight - 4);
    const left = Math.max(
      8,
      Math.min(window.innerWidth - MENU_WIDTH - 8, rect.right - MENU_WIDTH),
    );
    setPos({ top, left });
    setOpen(true);
    requestAnimationFrame(() => {
      const items = menuItems();
      items[focus === "last" ? items.length - 1 : 0]?.focus();
    });
  }

  function toggle() {
    if (open) closeMenu();
    else openMenu();
  }

  function closeMenu() {
    setOpen(false);
    buttonRef.current?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLSpanElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
      return;
    }
    if (event.target === buttonRef.current) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        openMenu("first");
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        openMenu("last");
      }
      return;
    }
    if (!menuRef.current?.contains(event.target as Node)) return;
    const items = menuItems();
    const index = items.indexOf(event.target as HTMLElement);
    if (event.key === "ArrowDown") {
      event.preventDefault();
      items[(index + 1) % items.length]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      items[(index - 1 + items.length) % items.length]?.focus();
    } else if (event.key === "Home") {
      event.preventDefault();
      items[0]?.focus();
    } else if (event.key === "End") {
      event.preventDefault();
      items.at(-1)?.focus();
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  }

  // The menu is viewport-anchored; close it if the page moves under it.
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
    <span
      data-row-menu
      onClick={(e) => e.stopPropagation()}
      onKeyDown={handleKeyDown}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-label={`Actions for quote ${quoteId}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={toggle}
        className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-muted transition-colors hover:bg-panel hover:text-ink"
      >
        <MoreHorizontal size={16} strokeWidth={1.75} aria-hidden />
      </button>
      {open && pos && (
        <>
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={closeMenu}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div
            ref={menuRef}
            role="menu"
            className="fixed z-50 w-44 rounded-lg border border-border bg-surface p-1 shadow-[var(--shadow-md)]"
            style={{ top: pos.top, left: pos.left }}
          >
            <Link
              role="menuitem"
              href={quoteHref(area, quoteId)}
              onClick={closeMenu}
              className="flex min-h-[44px] items-center rounded-md px-3 text-left text-sm text-ink transition-colors hover:bg-panel"
            >
              View details
            </Link>
            <Link
              role="menuitem"
              href={`${basePath}/revise/?id=${quoteId}`}
              onClick={closeMenu}
              className="flex min-h-[44px] items-center rounded-md px-3 text-left text-sm text-ink transition-colors hover:bg-panel"
            >
              Revise quote
            </Link>
            <div role="separator" className="my-1 border-t border-border" />
            <Link
              role="menuitem"
              href={`${quoteHref(area, quoteId)}&history=1`}
              onClick={closeMenu}
              className="flex min-h-[44px] items-center rounded-md px-3 text-left text-sm text-ink transition-colors hover:bg-panel"
            >
              View history
            </Link>
          </div>
        </>
      )}
    </span>
  );
}
