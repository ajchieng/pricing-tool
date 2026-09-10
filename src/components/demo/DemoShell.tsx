"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import {
  Calculator,
  Info,
  LayoutDashboard,
  Menu,
  MessageSquare,
  RotateCcw,
  Search,
  Settings,
  X,
} from "lucide-react";
import { PRODUCT_AREA_LIST } from "@/lib/product-areas";
import { APP_SHELL_CLASS } from "@/lib/layout";
import { buttonClass } from "@/components/ui/Button";
import { useDemo } from "./DemoProvider";
import { DemoDisplayPreferences } from "@/lib/demo/configuration-react";

const navigationSections = [
  {
    label: undefined,
    items: [
      {
        href: "/",
        label: "Overview",
        icon: LayoutDashboard,
        accentClass: "text-rail-accent",
      },
    ],
  },
  {
    label: "Lending",
    items: PRODUCT_AREA_LIST.map((area) => ({
      href: `${area.basePath}/`,
      label: area.shortName,
      icon: area.icon,
      accentClass: area.railAccentClass,
    })),
  },
  {
    label: "Reference",
    items: [
      {
        href: "/market-search/",
        label: "Market Search",
        icon: Search,
        accentClass: "text-rail-accent",
      },
      {
        href: "/feedback/",
        label: "Feedback",
        icon: MessageSquare,
        accentClass: "text-rail-accent",
      },
      {
        href: "/about/",
        label: "About",
        icon: Info,
        accentClass: "text-rail-accent",
      },
    ],
  },
  {
    label: "Administration",
    items: [
      {
        href: "/admin/",
        label: "Configuration",
        icon: Settings,
        accentClass: "text-rail-accent",
      },
    ],
  },
];

function DemoLogo({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center overflow-hidden rounded-full border border-rail-accent/30 bg-brand text-rail-accent ${className}`}
    >
      <Calculator size={18} strokeWidth={1.75} />
    </span>
  );
}

function BrandText() {
  return (
    <span className="min-w-0">
      <span className="block truncate text-sm font-semibold tracking-tight">
        Pricing Tool
      </span>
      <span className="block truncate text-[11px] text-rail-muted">
        Multi-product lending pricing
      </span>
    </span>
  );
}

function RailNavigation({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <div className="space-y-7">
      {navigationSections.map((section) => (
        <div key={section.label ?? "primary"}>
          {section.label && (
            <div className="mb-2 px-3 text-[11px] font-medium text-rail-muted/85">
              {section.label}
            </div>
          )}
          <ul className="space-y-px">
            {section.items.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href.replace(/\/$/, ""));
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    onClick={onNavigate}
                    className={`group flex min-h-[44px] items-center gap-2.5 rounded-md px-3 text-sm transition-colors ${active ? "bg-rail-active font-medium text-rail-ink" : "font-normal text-rail-muted hover:bg-rail-raised hover:text-rail-ink"}`}
                  >
                    <Icon
                      size={16}
                      strokeWidth={1.75}
                      aria-hidden
                      className={`shrink-0 transition-colors ${active ? item.accentClass : "text-rail-muted/75 group-hover:text-rail-ink"}`}
                    />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

function DemoUserCard({ onReset }: { onReset?: () => void }) {
  const { reset, busy } = useDemo();
  const [confirmReset, setConfirmReset] = useState(false);
  return (
    <>
      <div className="flex items-center gap-3 px-2 py-1.5">
        <span
          aria-hidden
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-rail-active text-xs font-semibold text-rail-ink"
        >
          DU
        </span>
        <Link
          href="/about/"
          className="min-w-0 flex-1 leading-tight"
          aria-label="Demo information"
        >
          <span className="block truncate text-sm font-medium text-rail-ink">
            Demo user
          </span>
          <span className="block truncate text-[11px] text-rail-muted">
            Browser-local workspace
          </span>
        </Link>
        <button
          type="button"
          title="Reset demo"
          aria-label="Reset demo"
          onClick={() => setConfirmReset(true)}
          className="grid h-11 w-11 place-items-center rounded-lg text-rail-muted transition-colors hover:bg-rail-raised hover:text-rail-ink"
        >
          <RotateCcw size={16} strokeWidth={1.75} aria-hidden />
        </button>
      </div>
      {confirmReset && (
        <div className="space-y-2 px-2 pb-1.5 pt-3">
          <p className="text-xs text-rail-ink">
            Replace your local quotes with the original examples?
          </p>
          <div className="flex gap-2">
            <button
              className="demo-rail-button"
              disabled={busy}
              onClick={() => {
                void reset();
                setConfirmReset(false);
                onReset?.();
              }}
            >
              Reset workspace
            </button>
            <button
              className="demo-rail-button"
              onClick={() => setConfirmReset(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

function DemoMobileNav() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const dialogId = useId();
  const descriptionId = useId();
  useEffect(() => {
    if (!open || !layerRef.current) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : triggerRef.current;
    const background = Array.from(document.body.children)
      .filter(
        (element): element is HTMLElement =>
          element instanceof HTMLElement && element !== layerRef.current,
      )
      .map((element) => ({
        element,
        inert: element.inert,
        ariaHidden: element.getAttribute("aria-hidden"),
      }));
    document.body.style.overflow = "hidden";
    for (const { element } of background) {
      element.inert = true;
      element.setAttribute("aria-hidden", "true");
    }
    const frame = requestAnimationFrame(() => closeRef.current?.focus());
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      for (const { element, inert, ariaHidden } of background) {
        element.inert = inert;
        if (ariaHidden == null) element.removeAttribute("aria-hidden");
        else element.setAttribute("aria-hidden", ariaHidden);
      }
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [open]);
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      return;
    }
    if (event.key !== "Tab" || !dialogRef.current) return;
    const elements = Array.from(
      dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
    ).filter(
      (element) =>
        element.getAttribute("aria-hidden") !== "true" &&
        element.getClientRects().length > 0,
    );
    if (!elements.length) {
      event.preventDefault();
      dialogRef.current.focus();
      return;
    }
    const first = elements[0],
      last = elements[elements.length - 1];
    if (
      event.shiftKey &&
      (document.activeElement === first ||
        !dialogRef.current.contains(document.activeElement))
    ) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
  return (
    <div className="lg:hidden">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={dialogId}
        aria-haspopup="dialog"
        aria-label="Open navigation"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-rail-muted transition-colors hover:bg-rail-raised hover:text-rail-ink"
      >
        <Menu size={18} strokeWidth={1.75} aria-hidden />
      </button>
      {open && typeof document !== "undefined"
        ? createPortal(
            <div ref={layerRef} data-mobile-nav-layer>
              <button
                type="button"
                aria-hidden
                tabIndex={-1}
                onClick={() => setOpen(false)}
                className="fixed inset-0 z-40 cursor-default bg-overlay-scrim"
              />
              <div
                ref={dialogRef}
                id={dialogId}
                role="dialog"
                aria-modal="true"
                aria-label="Navigation"
                aria-describedby={descriptionId}
                tabIndex={-1}
                onKeyDown={onKeyDown}
                className="nav-drawer rail-chrome fixed inset-y-0 left-0 z-50 flex w-[290px] max-w-[85vw] flex-col bg-rail text-rail-ink shadow-[var(--shadow-lg)]"
              >
                <div className="mx-3 mb-2 mt-3 flex items-center justify-between gap-3 pl-2">
                  <span
                    id={descriptionId}
                    className="flex min-w-0 items-center gap-3"
                  >
                    <DemoLogo />
                    <BrandText />
                  </span>
                  <button
                    ref={closeRef}
                    type="button"
                    aria-label="Close navigation"
                    onClick={() => setOpen(false)}
                    className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-rail-muted transition-colors hover:bg-rail-raised hover:text-rail-ink"
                  >
                    <X size={18} strokeWidth={1.75} aria-hidden />
                  </button>
                </div>
                <nav
                  aria-label="Main navigation"
                  className="rail-scroll flex-1 overflow-y-auto px-3 pb-6 pt-2"
                >
                  <RailNavigation onNavigate={() => setOpen(false)} />
                </nav>
                <div className="border-t border-rail-border p-3">
                  <DemoUserCard onReset={() => setOpen(false)} />
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

export function DemoShell({ children }: { children: React.ReactNode }) {
  const { error, reset } = useDemo();
  return (
    <>
      <DemoDisplayPreferences />
      <a
        href="#main-content"
        className="demo-skip sr-only fixed left-3 top-3 z-[100] rounded-md bg-surface px-4 py-2 font-medium text-ink shadow-md focus:not-sr-only"
      >
        Skip to content
      </a>
      <div className="flex min-h-dvh">
        <aside
          aria-label="Application navigation"
          className="rail-chrome sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col border-r border-rail-border bg-rail text-rail-ink lg:flex"
        >
          <Link
            href="/"
            className="mx-3 mb-4 mt-4 flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-rail-raised"
          >
            <DemoLogo />
            <BrandText />
          </Link>
          <nav
            aria-label="Main navigation"
            className="rail-scroll flex-1 overflow-y-auto px-3 pb-6"
          >
            <RailNavigation />
          </nav>
          <div className="border-t border-rail-border p-3">
            <DemoUserCard />
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="rail-chrome sticky top-0 z-30 border-b border-rail-border bg-rail text-rail-ink lg:hidden">
            <div className="flex min-h-14 items-center justify-between gap-3 px-3">
              <Link
                href="/"
                className="flex min-h-[44px] min-w-0 items-center gap-2.5 rounded-lg py-1.5 pl-1 pr-2"
              >
                <DemoLogo className="h-8 w-8" />
                <span className="truncate text-sm font-semibold tracking-tight">
                  Pricing Tool
                </span>
              </Link>
              <DemoMobileNav />
            </div>
          </header>
          <div className="demo-notice border-b border-border bg-panel/60">
            <div
              className={`${APP_SHELL_CLASS} py-2 text-[11px] leading-relaxed text-muted`}
            >
              Portfolio demo · Fictional pricing and customers · Changes stay in
              this browser.
            </div>
          </div>
          <main
            id="main-content"
            tabIndex={-1}
            className={`${APP_SHELL_CLASS} flex-1 py-7 lg:py-9`}
          >
            {error ? (
              <div
                role="alert"
                className="border-y border-alert/20 bg-alert-soft px-4 py-5"
              >
                <h1 className="font-serif text-2xl text-alert">
                  Your demo workspace couldn’t open
                </h1>
                <p className="mt-3 max-w-prose text-sm">{error}</p>
                <p className="mt-2 text-sm">
                  Check that browser storage is available, then retry. Resetting
                  removes only this demo’s saved data.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    className={buttonClass("primary")}
                    onClick={() => window.location.reload()}
                  >
                    Retry
                  </button>
                  <button
                    className={buttonClass("secondary")}
                    onClick={() => {
                      void reset();
                    }}
                  >
                    Reset demo storage
                  </button>
                </div>
              </div>
            ) : (
              children
            )}
          </main>
        </div>
      </div>
    </>
  );
}
