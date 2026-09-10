"use client";

import { Search } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useFormStatus } from "react-dom";
import { buttonClass } from "@/components/ui/Button";
import { inputClass } from "@/components/ui/Field";

function SearchSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={buttonClass("secondary", "md", "shrink-0")}
    >
      {pending ? "Searching…" : "Search"}
    </button>
  );
}

export function AdminConfigSearchForm() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentQuery =
    pathname.replace(/\/$/, "") === "/admin/search"
      ? (searchParams.get("q") ?? "")
      : "";

  return (
    <form
      action="/admin/search/"
      method="get"
      role="search"
      aria-label="Search configuration"
      className="flex w-[calc(100vw-2rem)] max-w-md min-w-0 gap-2 sm:w-[28rem]"
    >
      <label className="relative min-w-0 flex-1">
        <span className="sr-only">Search configuration</span>
        <Search
          size={16}
          strokeWidth={1.8}
          aria-hidden
          className="pointer-events-none absolute left-3 top-3.5 text-faint"
        />
        <input
          key={currentQuery}
          type="search"
          name="q"
          defaultValue={currentQuery}
          maxLength={120}
          placeholder="Products, rates, rules or settings"
          className={`${inputClass} pl-9`}
        />
      </label>
      <SearchSubmitButton />
    </form>
  );
}
