import { PersonalLoanAdminTabs } from "@/components/PersonalLoanAdminTabs";
import { PRODUCT_AREAS } from "@/lib/product-areas";

export default function PersonalLoanAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const product = PRODUCT_AREAS.personal;
  const Icon = product.icon;

  return (
    <div data-product="personal">
      <div className="mb-4 border-b border-border pb-3">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
          <span
            aria-hidden
            className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-brand-soft text-brand"
          >
            <Icon size={15} strokeWidth={2} />
          </span>
          <span className="text-sm font-semibold tracking-tight text-brand">
            Personal Loan Configuration
          </span>
          <span className="text-xs text-faint">
            Governed product, rate, score, margin and approval policy for
            personal loans
          </span>
        </div>
        <p className="mt-2 text-xs leading-5 text-muted">
          These controls affect personal-loan quotes only. Home-loan and
          commercial policy remains separate.
        </p>
      </div>
      <PersonalLoanAdminTabs />
      {children}
    </div>
  );
}
