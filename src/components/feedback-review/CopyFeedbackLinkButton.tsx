"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function CopyFeedbackLinkButton() {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={() => void copy()}
    >
      {copied ? (
        <Check size={15} strokeWidth={2} aria-hidden />
      ) : (
        <Link2 size={15} strokeWidth={1.8} aria-hidden />
      )}
      {copied ? "Copied" : "Copy link"}
    </Button>
  );
}
