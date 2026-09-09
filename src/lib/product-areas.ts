import type { LucideIcon } from "lucide-react";
import { Briefcase, Home, Wallet } from "lucide-react";

// Single source of truth for the three lending verticals. Each product area
// has its own routes, visual accent (see [data-product] tokens in globals.css)
// and pricing engine; nothing renders them mixed together by default.

export type ProductAreaKey = "home" | "personal" | "commercial";

export interface ProductArea {
  key: ProductAreaKey;
  name: string;
  shortName: string;
  tagline: string;
  basePath: string;
  newQuotePath: string;
  guidePath: string;
  icon: LucideIcon;
  // Accent class for the dark rail, which sits OUTSIDE the themed
  // [data-product] wrapper. Everything else derives from brand tokens.
  railAccentClass: string;
}

export const PRODUCT_AREAS: Record<ProductAreaKey, ProductArea> = {
  home: {
    key: "home",
    name: "Home Loan Pricing",
    shortName: "Home Loans",
    tagline: "Owner occupied and investment mortgage pricing",
    basePath: "/home-loans",
    newQuotePath: "/home-loans/new",
    guidePath: "/home-loans/guide",
    icon: Home,
    railAccentClass: "text-rail-accent",
  },
  personal: {
    key: "personal",
    name: "Personal Loan Pricing",
    shortName: "Personal Loans",
    tagline: "Secured and unsecured consumer lending",
    basePath: "/personal-loans",
    newQuotePath: "/personal-loans/new",
    guidePath: "/personal-loans/guide",
    icon: Wallet,
    railAccentClass: "text-rail-accent-personal",
  },
  commercial: {
    key: "commercial",
    name: "Commercial Loan Pricing",
    shortName: "Commercial Loans",
    tagline: "Tailored pricing for business lending facilities",
    basePath: "/commercial-loans",
    newQuotePath: "/commercial-loans/new",
    guidePath: "/commercial-loans/guide",
    icon: Briefcase,
    railAccentClass: "text-rail-accent-commercial",
  },
};

export const PRODUCT_AREA_LIST: ProductArea[] = [
  PRODUCT_AREAS.home,
  PRODUCT_AREAS.personal,
  PRODUCT_AREAS.commercial,
];
