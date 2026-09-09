"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  BriefcaseBusiness,
  House,
  Wallet,
  LayoutDashboard,
  Search,
  Info,
  Menu,
  X,
  RotateCcw,
  Calculator,
  ExternalLink,
} from "lucide-react";
import { useDemo } from "./DemoProvider";

const links = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/home-loans/", label: "Home loans", icon: House },
  { href: "/personal-loans/", label: "Personal loans", icon: Wallet },
  {
    href: "/commercial-loans/",
    label: "Commercial loans",
    icon: BriefcaseBusiness,
  },
  { href: "/market-search/", label: "Market Search", icon: Search },
  { href: "/about/", label: "About this project", icon: Info },
];

export function DemoShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const { reset, busy, error } = useDemo();
  const closeRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        menuRef.current?.focus();
      }
      if (event.key !== "Tab") return;
      const items = drawerRef.current?.querySelectorAll<HTMLElement>(
        "a[href],button:not([disabled])",
      );
      if (!items?.length) return;
      const first = items[0],
        last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const navigation = (
    <nav aria-label="Main navigation" className="space-y-1 px-3">
      {links.map(({ href, label, icon: Icon }) => {
        const active =
          href === "/"
            ? pathname === href
            : pathname.startsWith(href.replace(/\/$/, ""));
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors ${active ? "bg-rail-active text-rail-ink" : "text-rail-muted hover:bg-rail-raised hover:text-rail-ink"}`}
          >
            <Icon size={18} aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
  const footer = (
    <div className="mt-auto space-y-3 border-t border-rail-border p-4">
      <p className="text-xs leading-relaxed text-rail-muted">
        Your own demo workspace.
        <br />
        No account needed.
      </p>
      {confirmReset ? (
        <div className="space-y-2">
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
                setOpen(false);
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
      ) : (
        <button
          className="demo-rail-button flex items-center gap-2"
          onClick={() => setConfirmReset(true)}
        >
          <RotateCcw size={15} aria-hidden />
          Reset demo
        </button>
      )}
      <a
        className="flex min-h-11 items-center gap-2 text-xs text-rail-muted hover:text-rail-ink"
        href="https://github.com/ajchieng/pricing-tool"
        target="_blank"
        rel="noreferrer"
      >
        View source
        <ExternalLink size={12} aria-hidden />
      </a>
    </div>
  );
  const brand = (
    <Link href="/" className="flex min-h-11 items-center gap-3 text-rail-ink">
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-rail-active text-rail-accent">
        <Calculator size={20} aria-hidden />
      </span>
      <span className="font-serif text-xl font-semibold">Pricing Tool</span>
    </Link>
  );

  return (
    <div className="min-h-dvh lg:flex">
      <a className="demo-skip" href="#main-content">
        Skip to content
      </a>
      <aside className="rail-chrome sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col bg-rail lg:flex">
        <div className="px-5 py-7">{brand}</div>
        {navigation}
        {footer}
      </aside>
      <div className="min-w-0 flex-1">
        <header className="rail-chrome sticky top-0 z-40 flex min-h-16 items-center justify-between bg-rail px-4 lg:hidden">
          {brand}
          <button
            ref={menuRef}
            className="demo-rail-button"
            aria-label="Open navigation"
            aria-expanded={open}
            onClick={() => setOpen(true)}
          >
            <Menu size={22} />
          </button>
        </header>
        {open && (
          <div className="fixed inset-0 z-50 bg-overlay-scrim lg:hidden">
            <aside
              ref={drawerRef}
              role="dialog"
              aria-modal="true"
              aria-label="Navigation"
              className="rail-chrome flex h-full w-[min(320px,90vw)] flex-col bg-rail"
            >
              <div className="flex items-center justify-between p-4">
                {brand}
                <button
                  ref={closeRef}
                  className="demo-rail-button"
                  aria-label="Close navigation"
                  onClick={() => {
                    setOpen(false);
                    menuRef.current?.focus();
                  }}
                >
                  <X size={20} />
                </button>
              </div>
              {navigation}
              {footer}
            </aside>
          </div>
        )}
        <div className="demo-notice border-b border-border bg-surface px-4 py-2.5 text-center text-[11px] leading-relaxed text-muted sm:px-6">
          Portfolio demo · Fictional pricing and customers · Changes stay in
          this browser.
        </div>
        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto max-w-[1680px] px-4 py-6 outline-none sm:px-6 lg:px-8 lg:py-8"
        >
          {error ? (
            <div role="alert" className="rounded-2xl bg-alert-soft p-6">
              <h1 className="font-serif text-2xl text-alert">
                Your demo workspace couldn’t open
              </h1>
              <p className="mt-3 max-w-prose text-sm">{error}</p>
              <p className="mt-2 text-sm">
                Check that browser storage is available, then retry. Resetting
                removes only this demo’s saved data.
              </p>
              <div className="mt-4 flex gap-3">
                <button
                  className="demo-button"
                  onClick={() => window.location.reload()}
                >
                  Retry
                </button>
                <button
                  className="demo-button-secondary"
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
  );
}
