import { Suspense } from "react";
import { ConfigurationWorkspace } from "@/components/admin/ConfigurationWorkspace";
import { AdminChrome } from "@/components/AdminChrome";
export const metadata = { title: "Configuration" };
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ConfigurationWorkspace>
      <div className="min-w-0 max-w-full overflow-x-clip" data-admin-root>
        <Suspense fallback={null}>
          <AdminChrome />
        </Suspense>
        {children}
      </div>
    </ConfigurationWorkspace>
  );
}
