import { CommercialLoanAdminTabs } from "@/components/CommercialLoanAdminTabs";
import { PRODUCT_AREAS } from "@/lib/product-areas";

export default function CommercialLoanAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const product = PRODUCT_AREAS.commercial;
  const Icon = product.icon;

  return (
    <div data-product="commercial">
      <div className="mb-4 border-b border-border pb-3">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
          <span
            aria-hidden
            className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-brand-soft text-brand"
          >
            <Icon size={15} strokeWidth={2} />
          </span>
          <span className="text-sm font-semibold tracking-tight text-brand">
            Commercial Loan Configuration
          </span>
          <span className="text-xs text-faint">
            Governed product, base-rate, score, margin and approval policy for
            commercial loans
          </span>
        </div>
        <p className="mt-2 text-xs leading-5 text-muted">
          These controls affect commercial-loan quotes only. Home-loan and
          personal policy remains separate.
        </p>
      </div>
      <CommercialLoanAdminTabs />
      {children}
    </div>
  );
}
