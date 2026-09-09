import type { ReactNode } from "react";

type AsyncStatusKind = "info" | "pending" | "success" | "error";

const TEXT_CLASS: Record<AsyncStatusKind, string> = {
  info: "text-muted",
  pending: "text-muted",
  success: "text-ok",
  error: "text-alert",
};

export function AsyncStatus({
  children,
  kind = "info",
  id,
  className = "",
}: {
  children: ReactNode;
  kind?: AsyncStatusKind;
  id?: string;
  className?: string;
}) {
  return (
    <p
      id={id}
      role={kind === "error" ? "alert" : "status"}
      aria-live={kind === "error" ? "assertive" : "polite"}
      className={`${TEXT_CLASS[kind]} ${className}`}
    >
      {children}
    </p>
  );
}
