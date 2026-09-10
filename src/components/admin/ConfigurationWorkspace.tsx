"use client";
import { useDemo, WorkspaceLoading } from "@/components/demo/DemoProvider";
export function ConfigurationWorkspace({
  children,
}: {
  children: React.ReactNode;
}) {
  const { ready } = useDemo();
  return ready ? children : <WorkspaceLoading />;
}
