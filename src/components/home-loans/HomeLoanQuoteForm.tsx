"use client";

import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { calculateDemo } from "@/lib/demo/pricing";
import { saveDemoForm } from "@/lib/demo/form-adapter";
import { demoFormError, focusDemoIssue } from "@/lib/demo/form-errors";
import type { ProfitabilityChannel } from "@/lib/pricing/types";
import { ResultPanel } from "@/components/ResultPanel";
import { approvalStatus } from "@/lib/status";
import {
  averageCreditScores,
  CREDIT_SCORE_MAX,
  CREDIT_SCORE_MIN,
} from "@/lib/pricing/credit-scores";
import {
  defaultFieldStrings,
  type ProfitabilityDefaultsByChannel,
} from "@/lib/quotes/profitability-defaults";
import { fixedPeriodLabel } from "@/components/quote-form-ui";
import { Button } from "@/components/ui/Button";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { StatusText } from "@/components/ui/StatusText";
import { inputClass } from "@/components/ui/Field";
import { PageHeader } from "@/components/ui/PageHeader";
import { OpeningContextCard } from "@/components/quote/OpeningContextCard";
import { ProfitabilityInputsCard } from "@/components/quote/ProfitabilityInputsCard";
import { ExpectedLossInputs } from "@/components/quote/ExpectedLossInputs";
import { QuoteFeeInputs } from "@/components/quote/QuoteFeeInputs";
import { SuggestedRateBar } from "@/components/quote/SuggestedRateBar";
import type { SectionKey } from "@/components/quote/types";
import type { ProductOption } from "@/lib/products/types";
import { productFeeItems } from "@/lib/products/fees";
import {
  QuoteWorkspaceForm,
  QuoteWorkspaceLayout,
  QuoteWorkspaceRail,
} from "@/components/quotes/QuoteWorkspaceShell";
import {
  QuoteSectionNavigator,
  quoteReadinessMessage,
  type QuoteSectionNavItem,
} from "@/components/quotes/QuoteSectionNavigator";
import { CustomerRateScenarioControl } from "@/components/quotes/CustomerRateScenarioControl";
import { useCustomerRateScenario } from "@/components/quotes/useCustomerRateScenario";
import {
  customerRateScenarioRequestKey,
  customerRatesEqual,
} from "@/components/quotes/customer-rate-scenario";
import { useUnsavedChangesGuard } from "@/components/quotes/useUnsavedChangesGuard";
import { QuoteFormTools } from "@/components/quotes/QuoteFormTools";
import { useDebouncedPricingRequest } from "@/components/quotes/useDebouncedPricingRequest";
import type { MarketQuoteEvidence } from "@/lib/market/quote-evidence";
import {
  ZERO_QUOTE_FEE_SETTING,
  type QuoteFeeSettingConfig,
} from "@/lib/pricing/quote-fees";
import {
  costOfFundsDefaultText,
  homeCostOfFundsDefault,
  type HomeCostOfFundsDefaults,
} from "@/lib/pricing/cost-of-funds-defaults";
import { buildHomeQuoteRequest } from "@/components/home-loans/pricing-request";
import {
  HOME_INPUT_IDS,
  HOME_SECTION_FIELDS,
} from "@/components/home-loans/form-metadata";
import type { FormState } from "@/components/home-loans/form-state";
import {
  anyHomeChannelHasDefaults,
  homeChannelDefaultsApplied,
  initialHomeLoanFormState,
} from "@/components/home-loans/form-initialization";
import {
  HomeCapitalSection,
  HomeLoanDetailsSection,
  HomeNotesSection,
  HomeRelationshipSection,
  HomeRiskSection,
  HomeStrategicSection,
} from "@/components/home-loans/HomeLoanFormSections";
import {
  homeQuoteControllerReducer,
  initialHomeQuoteControllerState,
} from "@/components/home-loans/quote-controller";

export type { ProductOption } from "@/lib/products/types";

type HomeProfitLineKey = "commissions" | "otherIncome" | "expenses";

/**
 * Re-apply a channel's fictional defaults to the line items the user has not
 * touched. Defaults are % of loan amount: usable directly in % mode, converted
 * in $ mode when a loan amount exists, otherwise cleared (the flag is kept so a
 * later switch can re-fill).
 */
function channelPatch(
  current: FormState,
  next: ProfitabilityChannel,
  profitabilityDefaults: ProfitabilityDefaultsByChannel,
  flags: Record<HomeProfitLineKey, boolean>,
  unit: "dollar" | "percent",
  previousCommission: string | null,
): Partial<FormState> {
  const d = defaultFieldStrings(profitabilityDefaults, next);
  const loanAmountNum = parseFloat(current.loanAmount);
  const defaultFor = (pct: string): string => {
    if (!pct) return "";
    if (unit === "percent") return pct;
    const n = parseFloat(pct);
    if (Number.isNaN(n) || !(loanAmountNum > 0)) return "";
    return String(Math.round((n / 100) * loanAmountNum * 100) / 100);
  };

  let commissions = current.commissions;
  if (next === "online") {
    commissions = "0";
  } else if (
    current.channel === "online" &&
    !flags.commissions &&
    previousCommission != null
  ) {
    commissions = previousCommission;
  } else if (flags.commissions) {
    commissions = defaultFor(d.commissions);
  }

  return {
    channel: next,
    commissions,
    ...(flags.otherIncome ? { otherIncome: defaultFor(d.otherIncome) } : {}),
    ...(flags.expenses ? { expenses: defaultFor(d.expenses) } : {}),
  };
}

export function HomeLoanQuoteForm({
  products,
  initialValues,
  profitabilityDefaults = {},
  costOfFundsDefaults = [],
  revisedFromQuoteId = null,
  saveLabel = "Save quote",
  header,
  canOverrideCapital = false,
  canOverrideExpectedLoss = false,
  marketEvidence = null,
  marketEvidenceError = null,
  applyProfitabilityDefaults,
  quoteFeeSetting = ZERO_QUOTE_FEE_SETTING,
  serviceabilityNsiEnabled = false,
}: {
  products: ProductOption[];
  initialValues?: Partial<FormState>;
  profitabilityDefaults?: ProfitabilityDefaultsByChannel;
  costOfFundsDefaults?: HomeCostOfFundsDefaults;
  revisedFromQuoteId?: number | null;
  saveLabel?: string;
  header?: {
    title: React.ReactNode;
    caption?: React.ReactNode;
    backHref?: string;
    backLabel?: string;
    actions?: React.ReactNode;
  };
  canOverrideCapital?: boolean;
  canOverrideExpectedLoss?: boolean;
  marketEvidence?: MarketQuoteEvidence | null;
  marketEvidenceError?: string | null;
  applyProfitabilityDefaults?: boolean;
  quoteFeeSetting?: QuoteFeeSettingConfig;
  serviceabilityNsiEnabled?: boolean;
}) {
  const router = useRouter();
  const { markDirty, markClean } = useUnsavedChangesGuard();

  // --- form state ---
  const [form, setForm] = useState<FormState>(() => {
    const base = initialHomeLoanFormState({
      initialValues,
      profitabilityDefaults,
      costOfFundsDefaults,
      applyProfitabilityDefaults,
      canOverrideExpectedLoss,
    });
    return {
      ...base,
      ...(!serviceabilityNsiEnabled &&
      base.serviceabilityIncomeMeasure === "serviceability_nsi"
        ? {
            serviceabilityIncomeMeasure: "gross_annual_income" as const,
            serviceabilityNsi: "",
          }
        : {}),
      competitorLender:
        marketEvidence?.lender.slice(0, 120) ?? base.competitorLender,
      competitorRate:
        marketEvidence?.advertisedRate == null
          ? base.competitorRate
          : String(marketEvidence.advertisedRate),
    };
  });
  // Dirty tracking stays with the `QuoteWorkspaceForm` wrapper below, which
  // already listens for input across the whole workspace.
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const existingMember = form.customerStream !== "new_to_bank";
  const retentionScenario = form.customerStream === "retention";
  const newToBankGrowthOpportunity = form.customerStream === "new_to_bank";

  const creditScoreValues = form.creditScores
    .filter((score) => score.trim() !== "")
    .map((score) => Number(score))
    .filter(
      (score) =>
        Number.isInteger(score) &&
        score >= CREDIT_SCORE_MIN &&
        score <= CREDIT_SCORE_MAX,
    );
  const creditScoreAverage = averageCreditScores(creditScoreValues);

  const [attachedMarketEvidence, setAttachedMarketEvidence] =
    useState<MarketQuoteEvidence | null>(marketEvidence);
  // A blank saved value is not an override: the mapped form model always
  // carries the key, so emptiness — not absence — decides the source.
  const [costOfFundsSource, setCostOfFundsSource] = useState<
    "default" | "override"
  >(initialValues?.costOfFunds ? "override" : "default");

  function changeCostOfFunds(value: string) {
    set("costOfFunds", value);
    setCostOfFundsSource(value.trim() === "" ? "default" : "override");
  }

  const applyChannelDefaults = homeChannelDefaultsApplied({
    initialValues,
    applyProfitabilityDefaults,
  });
  const anyChannelHasDefaults = anyHomeChannelHasDefaults(
    profitabilityDefaults,
  );

  const commissionBeforeOnlineRef = useRef<string | null>(null);

  const displayedCostOfFunds =
    costOfFundsSource === "default"
      ? costOfFundsDefaultText(
          homeCostOfFundsDefault(
            costOfFundsDefaults,
            form.productId,
            form.loanPurpose,
            form.rateType,
          ),
        )
      : form.costOfFunds;

  // Profitability line items can be entered as $ or as a % of loan amount.
  // Storage/calc is always $; % is converted on the way in. Channel defaults
  // are percentages, so a fresh form with defaults opens in % mode.
  const [profitInputUnit, setProfitInputUnit] = useState<"dollar" | "percent">(
    applyChannelDefaults && anyChannelHasDefaults ? "percent" : "dollar",
  );
  // Per-field: true while the field is untouched (still carrying its channel
  // default). Typing clears the flag; channel switches re-apply the new
  // channel's default only to still-flagged fields.
  const [profitDefaultFlags, setProfitDefaultFlags] = useState(() => ({
    commissions: applyChannelDefaults,
    otherIncome: applyChannelDefaults,
    expenses: applyChannelDefaults,
  }));
  const [profitUnitNotice, setProfitUnitNotice] = useState<string | null>(null);

  const loanAmountRef = useRef<HTMLInputElement | null>(null);

  const [controller, dispatchController] = useReducer(
    homeQuoteControllerReducer,
    initialHomeQuoteControllerState,
  );
  const { result, saving, retryToken: retryTick } = controller;
  const [lastPricedRequestedRate, setLastPricedRequestedRate] = useState<
    number | null
  >(null);
  const [lastPricedContextKey, setLastPricedContextKey] = useState<
    string | null
  >(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Section open/closed state. Loan + risk start open; relationship,
  // competitor and notes open themselves when revise/import values are present.
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>(
    () => ({
      loan: true,
      risk: true,
      relationship:
        (initialValues?.customerStream ?? "new_to_bank") !== "new_to_bank" &&
        Boolean(
          initialValues?.yearsAsMember ||
          (initialValues?.lenderProducts?.length ?? 0) > 0 ||
          initialValues?.relationshipNotes,
        ),
      competitor: Boolean(
        (initialValues?.livesInServiceRegion ?? "unknown") !== "unknown" ||
        initialValues?.vipCustomer ||
        initialValues?.competitorLender ||
        initialValues?.competitorRate ||
        marketEvidence != null ||
        initialValues?.requestedRate,
      ),
      profitability: false,
      capital: Boolean(
        initialValues?.capitalStandardStatus &&
        initialValues.capitalStandardStatus !== "unconfirmed",
      ),
      notes: Boolean(initialValues?.notes),
    }),
  );
  function setSectionOpen(key: SectionKey, open: boolean) {
    setOpenSections((s) => ({ ...s, [key]: open }));
  }

  const formalRequestedRate =
    form.requestedRate.trim() === "" ? null : Number(form.requestedRate);
  const scenarioContextKey = JSON.stringify([
    form.productId,
    form.loanPurpose,
    form.rateType,
    form.fixedPeriodMonths,
    form.loanAmount,
    form.propertyValue,
    form.loanTermYears,
    form.customerStream,
    form.currentCustomerRate,
    form.retentionArrearsHardship18Months,
    form.retentionArrearsPast12Months,
    form.vipCustomer,
    form.competitorRate,
    attachedMarketEvidence,
    form.requestedRate,
    form.requestedReason,
    form.creditScores,
    form.dtiRatio,
    form.grossAnnualIncome,
    form.serviceabilityIncomeMeasure,
    form.serviceabilityNsi,
    form.yearsAsMember,
    form.livesInServiceRegion,
    form.existingLenderLoan,
    form.lenderProducts,
    form.channel,
    form.brokerName,
    form.brokerCompany,
    form.brokerInRegion,
    form.brokerVolumeBand,
    form.brokerDiscretionPct,
    displayedCostOfFunds,
    form.commissions,
    form.otherIncome,
    form.upfrontFeeOverrideEnabled,
    form.upfrontFeeOverride,
    form.monthlyFeeOverrideEnabled,
    form.monthlyFeeOverride,
    form.expenses,
    form.expectedCreditLossOverrideAmount,
    form.expectedCreditLossOverrideEnabled,
    form.expectedCreditLossOverrideReason,
    form.capitalStandardStatus,
    form.eligibleLmi,
    form.homeGuaranteeSchemeEligible,
    form.riskWeightOverridePct,
    form.taxRateOverridePct,
    form.capitalOverrideReason,
    profitInputUnit,
  ]);
  const rateScenario = useCustomerRateScenario({
    result,
    recommendationRate: result?.suggestedRate ?? null,
    formalRate:
      formalRequestedRate != null && Number.isFinite(formalRequestedRate)
        ? formalRequestedRate
        : null,
    floorRate: result?.floorRate ?? null,
    topRate: result?.topRate ?? null,
    contextKey: scenarioContextKey,
  });
  const pricingRequestKey = customerRateScenarioRequestKey(
    scenarioContextKey,
    rateScenario.active ? rateScenario.rate : null,
  );

  // The compact mobile command bar remains available until the full action
  // area is on-screen.
  const railRef = useRef<HTMLDivElement | null>(null);
  const actionRef = useRef<HTMLDivElement | null>(null);
  const [actionsInView, setActionsInView] = useState(false);
  useEffect(() => {
    const el = actionRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setActionsInView(entry.isIntersecting),
      { threshold: 0.05 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  function scrollToResult() {
    const el = railRef.current;
    if (!el) return;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    el.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
    requestAnimationFrame(() => {
      el.querySelector<HTMLElement>("[data-pricing-result-region]")?.focus({
        preventScroll: true,
      });
    });
  }

  // --- derived: LVR ---
  const lvr = useMemo(() => {
    const la = parseFloat(form.loanAmount);
    const pv = parseFloat(form.propertyValue);
    if (la >= 0 && pv > 0) return (la / pv) * 100;
    return null;
  }, [form.loanAmount, form.propertyValue]);

  // --- derived: available fixed periods for current purpose ---
  const fixedPeriods = useMemo(() => {
    const set = new Map<number, string>();
    products
      .filter(
        (p) =>
          p.loanPurpose === form.loanPurpose &&
          p.rateType === "fixed" &&
          p.fixedPeriodMonths != null,
      )
      .forEach((p) =>
        set.set(p.fixedPeriodMonths!, fixedPeriodLabel(p.fixedPeriodMonths)),
      );
    if (
      attachedMarketEvidence?.rateCriteria.fixedPeriodMonths != null &&
      form.rateType === "fixed"
    ) {
      const months = attachedMarketEvidence.rateCriteria.fixedPeriodMonths;
      set.set(months, fixedPeriodLabel(months));
    }
    return Array.from(set.entries()).sort((a, b) => a[0] - b[0]);
  }, [products, form.loanPurpose, form.rateType, attachedMarketEvidence]);

  // --- derived: filtered products ---
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (p.loanPurpose !== form.loanPurpose) return false;
      if (p.rateType !== form.rateType) return false;
      if (form.rateType === "fixed" && form.fixedPeriodMonths != null) {
        if (p.fixedPeriodMonths !== form.fixedPeriodMonths) return false;
      }
      return true;
    });
  }, [products, form.loanPurpose, form.rateType, form.fixedPeriodMonths]);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === form.productId) ?? null,
    [products, form.productId],
  );

  // Selecting a different scenario invalidates the chosen product/period.
  function changeLoanPurpose(value: FormState["loanPurpose"]) {
    setForm((current) => ({
      ...current,
      loanPurpose: value,
      fixedPeriodMonths: null,
      productId: null,
    }));
  }
  function changeRateType(value: FormState["rateType"]) {
    setForm((current) => ({
      ...current,
      rateType: value,
      fixedPeriodMonths: null,
      productId: null,
    }));
  }
  function changeFixedPeriod(value: number | null) {
    setForm((current) => ({
      ...current,
      fixedPeriodMonths: value,
      productId: null,
    }));
  }

  const homePricingReady =
    Boolean(form.productId) &&
    parseFloat(form.loanAmount) > 0 &&
    parseFloat(form.propertyValue) > 0;
  const { loading: calcLoading, error: calcError } = useDebouncedPricingRequest(
    {
      enabled: homePricingReady,
      requestKey: pricingRequestKey,
      retryToken: retryTick,
      request: async (signal) => {
        const nextPayload = buildPayload(
          rateScenario.active && rateScenario.rate != null
            ? rateScenario.rate
            : undefined,
        );
        signal.throwIfAborted();
        const data = await calculateDemo("home", nextPayload);
        signal.throwIfAborted();
        return {
          result: data.result,
          requestedRate: nextPayload.requestedRate,
        };
      },
      onSuccess: (value) => {
        dispatchController({ type: "pricing_resolved", result: value.result });
        setLastPricedRequestedRate(value.requestedRate);
        setLastPricedContextKey(scenarioContextKey);
      },
      onDisabled: () => {
        dispatchController({ type: "pricing_invalidated" });
        setLastPricedRequestedRate(null);
        setLastPricedContextKey(null);
      },
      errorMessage: demoFormError,
    },
  );

  // Concise, screen-reader-only summary announced whenever the result changes.
  const liveSummary = (() => {
    if (calcError) return calcError;
    if (calcLoading) return "Recalculating pricing…";
    if (!result || result.suggestedRate == null) return "";
    const appr = approvalStatus(result.approvalLevel).label;
    const warn = result.warnings.length
      ? `, ${result.warnings.length} warning${result.warnings.length > 1 ? "s" : ""}`
      : "";
    return rateScenario.active
      ? `Scenario customer rate ${result.finalDisplayRate?.toFixed(2) ?? rateScenario.rate?.toFixed(2) ?? "—"} percent. ${appr}${warn}. Preview only, not saved.`
      : `Suggested rate ${result.suggestedRate.toFixed(2)} percent. ${appr}${warn}.`;
  })();

  // Loan amount is the base for "% of loan" entry; without it, % is off.
  const loanAmountNum = parseFloat(form.loanAmount);
  const profitPercentEnabled = loanAmountNum > 0;
  const onlineChannel = form.channel === "online";
  // User-entered line values only — untouched channel defaults don't count.
  const hasUserProfitLineValues = [
    onlineChannel || profitDefaultFlags.commissions ? "" : form.commissions,
    profitDefaultFlags.otherIncome ? "" : form.otherIncome,
    profitDefaultFlags.expenses ? "" : form.expenses,
    form.expectedCreditLossOverrideAmount.trim() === "0"
      ? ""
      : form.expectedCreditLossOverrideAmount,
  ].some((value) => value.trim() !== "");

  function clearProfitDefaultFlag(key: HomeProfitLineKey) {
    setProfitDefaultFlags((f) => (f[key] ? { ...f, [key]: false } : f));
  }

  function changeProfitLine(key: HomeProfitLineKey, value: string) {
    clearProfitDefaultFlag(key);
    set(key, value);
  }

  function changeChannel(next: ProfitabilityChannel) {
    if (next === "online" && form.channel !== "online") {
      commissionBeforeOnlineRef.current = form.commissions;
    }
    setForm((current) => ({
      ...current,
      ...channelPatch(
        current,
        next,
        profitabilityDefaults,
        profitDefaultFlags,
        profitInputUnit,
        commissionBeforeOnlineRef.current,
      ),
    }));
  }

  // Toggle the input unit, converting existing field values so they keep the
  // same economic meaning. Needs a loan amount to convert against.
  function switchProfitInputUnit(next: "dollar" | "percent") {
    if (next === profitInputUnit) return;
    if (!profitPercentEnabled) {
      if (hasUserProfitLineValues) {
        setProfitUnitNotice(
          "Enter loan amount first so existing dollar figures can be converted.",
        );
        loanAmountRef.current?.focus();
        return;
      }
      // Only untouched channel defaults (or nothing) present. Without a loan
      // base they can't be converted, so re-materialize them for the new unit:
      // pct strings in % mode, blank in $ mode (flags kept for later re-fill).
      const d = defaultFieldStrings(profitabilityDefaults, form.channel);
      const materialize = (pct: string) => (next === "percent" ? pct : "");
      setForm((current) => ({
        ...current,
        ...(profitDefaultFlags.commissions && !onlineChannel
          ? { commissions: materialize(d.commissions) }
          : {}),
        ...(profitDefaultFlags.otherIncome
          ? { otherIncome: materialize(d.otherIncome) }
          : {}),
        ...(profitDefaultFlags.expenses
          ? { expenses: materialize(d.expenses) }
          : {}),
      }));
      setProfitUnitNotice(
        next === "percent"
          ? "Enter loan amount before saving so percentages can be converted."
          : null,
      );
      setProfitInputUnit(next);
      return;
    }
    const toPercent = next === "percent";
    const convert = (raw: string): string => {
      if (!raw) return raw;
      const n = parseFloat(raw);
      if (Number.isNaN(n) || !(loanAmountNum > 0)) return raw;
      const out = toPercent
        ? Math.round((n / loanAmountNum) * 100 * 10000) / 10000
        : Math.round((n / 100) * loanAmountNum * 100) / 100;
      return String(out);
    };
    setForm((current) => ({
      ...current,
      commissions: convert(current.commissions),
      otherIncome: convert(current.otherIncome),
      expenses: convert(current.expenses),
      expectedCreditLossOverrideAmount: convert(
        current.expectedCreditLossOverrideAmount,
      ),
    }));
    setProfitInputUnit(next);
    setProfitUnitNotice(null);
  }

  function buildPayload(requestedRateForPricing?: number) {
    return buildHomeQuoteRequest(
      {
        ...form,
        revisedFromQuoteId,
        marketRateId: attachedMarketEvidence?.marketRateId ?? null,
        costOfFundsSource,
        profitInputUnit,
      },
      requestedRateForPricing,
    );
  }

  async function handleSave() {
    setSaveError(null);
    dispatchController({ type: "save_started" });
    try {
      const saved = await saveDemoForm(
        "home",
        buildPayload(),
        revisedFromQuoteId ?? undefined,
        attachedMarketEvidence,
      );
      markClean();
      router.push(`/home-loans/quote/?id=${saved.id}`);
    } catch (error) {
      setSaveError(demoFormError(error));
      focusDemoIssue(error, {
        sectionFields: HOME_SECTION_FIELDS,
        inputIds: HOME_INPUT_IDS,
        openSection: (section) => setSectionOpen(section, true),
      });
    } finally {
      dispatchController({ type: "save_finished" });
    }
  }

  // --- section status chips ---
  const loanComplete =
    Boolean(form.productId) &&
    parseFloat(form.loanAmount) > 0 &&
    parseFloat(form.propertyValue) > 0;
  const riskAssessed = retentionScenario
    ? form.currentCustomerRate.trim() !== "" &&
      form.retentionArrearsHardship18Months !== "" &&
      (form.retentionArrearsHardship18Months === "no" ||
        form.retentionArrearsPast12Months !== "")
    : [
        ...form.creditScores,
        form.dtiRatio,
        form.grossAnnualIncome,
        form.serviceabilityNsi,
      ].some((value) => value.trim() !== "") || form.riskNotes.trim() !== "";
  const relationshipProvided =
    form.yearsAsMember.trim() !== "" ||
    form.existingLenderLoan !== "unknown" ||
    form.lenderProducts.length > 0 ||
    form.relationshipNotes.trim() !== "";
  const strategicProvided =
    form.vipCustomer ||
    attachedMarketEvidence != null ||
    form.livesInServiceRegion !== "unknown" ||
    form.competitorLender.trim() !== "" ||
    form.competitorRate.trim() !== "" ||
    form.requestedRate.trim() !== "";
  // Untouched channel defaults don't make the section "custom" — the chip
  // should read "Defaults applied" until the user overrides something.
  const profitabilityCustom =
    form.channel !== "direct" ||
    form.upfrontFeeOverrideEnabled ||
    form.monthlyFeeOverrideEnabled ||
    form.expectedCreditLossOverrideAmount.trim() !== "0" ||
    form.expectedCreditLossOverrideEnabled ||
    [
      costOfFundsSource === "default" ? "" : form.costOfFunds,
      onlineChannel || profitDefaultFlags.commissions ? "" : form.commissions,
      profitDefaultFlags.otherIncome ? "" : form.otherIncome,
      profitDefaultFlags.expenses ? "" : form.expenses,
    ].some((v) => v.trim() !== "");

  const quoteFormTools = <QuoteFormTools>{header?.actions}</QuoteFormTools>;

  const showMobileBar = result != null && !actionsInView;
  const scenarioCanApply =
    rateScenario.active &&
    !calcLoading &&
    calcError == null &&
    result != null &&
    lastPricedContextKey === scenarioContextKey &&
    customerRatesEqual(lastPricedRequestedRate, rateScenario.rate);
  const scenarioCanChange =
    result != null &&
    calcError == null &&
    !calcLoading &&
    lastPricedContextKey === scenarioContextKey;
  const scenarioControl =
    result && rateScenario.rate != null && rateScenario.bounds ? (
      <CustomerRateScenarioControl
        rate={rateScenario.rate}
        bounds={rateScenario.bounds}
        active={rateScenario.active}
        baselineRate={rateScenario.baselineRate}
        canChangeRate={scenarioCanChange}
        canApply={scenarioCanApply}
        contextKey={scenarioContextKey}
        hasPricingError={calcError != null}
        effectiveRate={scenarioCanApply ? result.finalDisplayRate : null}
        onRateChange={rateScenario.changeRate}
        onApply={() => {
          set("requestedRate", rateScenario.rate!.toFixed(2));
          setSectionOpen("competitor", true);
          rateScenario.reset();
        }}
        onReset={rateScenario.reset}
      />
    ) : null;
  const sectionItems: QuoteSectionNavItem<SectionKey>[] = [
    {
      key: "loan",
      id: "quote-section-loan",
      label: "Loan details",
      statusLabel: loanComplete ? "Complete" : "Incomplete",
      state: loanComplete ? "complete" : "attention",
    },
    {
      key: "risk",
      id: "quote-section-risk",
      label: "Customer risk",
      statusLabel: riskAssessed ? "Assessed" : "Not assessed",
      state: riskAssessed ? "complete" : "attention",
    },
    ...(form.customerStream !== "new_to_bank"
      ? [
          {
            key: "relationship" as const,
            id: "quote-section-relationship",
            label: "Relationship",
            statusLabel: relationshipProvided ? "Provided" : "Optional",
            state: relationshipProvided
              ? ("complete" as const)
              : ("optional" as const),
          },
        ]
      : []),
    {
      key: "competitor",
      id: "quote-section-strategic",
      label: "Strategic",
      statusLabel: strategicProvided ? "Provided" : "Optional",
      state: strategicProvided ? "complete" : "optional",
    },
    {
      key: "capital",
      id: "quote-section-capital",
      label: "Capital allocation",
      statusLabel:
        result?.profitability.capitalAllocation?.classificationBasis ===
        "provisional"
          ? "Unconfirmed"
          : "Capital policy",
      state:
        result?.profitability.capitalAllocation?.classificationBasis ===
        "provisional"
          ? "attention"
          : "informational",
    },
    {
      key: "profitability",
      id: "quote-section-profitability",
      label: "Profitability",
      statusLabel: profitabilityCustom ? "Custom inputs" : "Defaults applied",
      state: profitabilityCustom ? "complete" : "informational",
    },
    {
      key: "notes",
      id: "quote-section-notes",
      label: "Notes",
      statusLabel: form.notes.trim() ? "Provided" : "Optional",
      state: form.notes.trim() ? "complete" : "optional",
    },
  ];
  const saveReadiness = quoteReadinessMessage({
    items: sectionItems,
    calculating: calcLoading,
    resultReady: result != null,
    scenarioActive: rateScenario.active,
    hasPricingError: Boolean(calcError && !result),
  });

  function activateSection(key: SectionKey, id: string) {
    setSectionOpen(key, true);
    requestAnimationFrame(() => {
      const section = document.getElementById(id);
      const toggle = document.getElementById(`${id}-toggle`);
      section?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "start",
      });
      if (toggle instanceof HTMLElement) {
        toggle.focus({ preventScroll: true });
      }
    });
  }

  return (
    <div>
      {header ? (
        <PageHeader
          title={header.title}
          caption={header.caption}
          backHref={header.backHref}
          backLabel={header.backLabel}
          compactMobile
          actions={quoteFormTools}
        />
      ) : (
        <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
          {quoteFormTools}
        </div>
      )}

      {marketEvidenceError && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-warn/30 bg-warn-soft px-4 py-3 text-sm text-warn"
        >
          {marketEvidenceError}
          <Link
            href="/market-search"
            className="ml-2 inline-flex min-h-[44px] items-center font-semibold underline underline-offset-2"
          >
            Return to Market Search
          </Link>
        </div>
      )}

      <QuoteWorkspaceLayout
        mobileSummary={
          <SuggestedRateBar
            visible={showMobileBar}
            suggestedRate={
              rateScenario.active
                ? (result?.finalDisplayRate ?? rateScenario.rate)
                : (result?.suggestedRate ?? null)
            }
            approvalLevel={result?.approvalLevel ?? null}
            onViewResult={scrollToResult}
            onSave={() => {
              void handleSave();
            }}
            saveLabel={saveLabel}
            saving={saving}
            saveDisabled={!result || rateScenario.active}
            saveDisabledReason={
              saveReadiness === "Ready to save" ? null : saveReadiness
            }
            label={
              rateScenario.active ? "Scenario customer rate" : "Suggested rate"
            }
          />
        }
      >
        {/* LEFT: guided input sections — a ruled ledger, not a card stack */}
        <QuoteWorkspaceForm onDirty={markDirty}>
          <QuoteSectionNavigator
            items={sectionItems}
            onActivate={activateSection}
            readinessLabel={saveReadiness}
          />
          <OpeningContextCard
            customerStream={form.customerStream}
            onCustomerStreamChange={(value) => set("customerStream", value)}
            channel={form.channel}
            onChannelChange={changeChannel}
            brokerName={form.brokerName}
            onBrokerNameChange={(value) => set("brokerName", value)}
            brokerCompany={form.brokerCompany}
            onBrokerCompanyChange={(value) => set("brokerCompany", value)}
            brokerInRegion={form.brokerInRegion}
            onBrokerInRegionChange={(value) => set("brokerInRegion", value)}
            brokerVolumeBand={form.brokerVolumeBand}
            onBrokerVolumeBandChange={(value) => set("brokerVolumeBand", value)}
            brokerDiscretionPct={form.brokerDiscretionPct}
            onBrokerDiscretionPctChange={(value) =>
              set("brokerDiscretionPct", value)
            }
          />
          <div
            data-quote-parameter-label="Customer name or reference"
            data-quote-parameter-group="Quote context"
            className="border-t border-border @2xl:grid @2xl:grid-cols-[11rem_minmax(0,1fr)] @2xl:gap-x-8"
          >
            <label
              htmlFor="customer-reference"
              className="block pt-4 text-sm font-semibold text-ink @2xl:py-5"
            >
              Customer name or reference
            </label>
            <div className="min-w-0 pb-6 pt-2 @2xl:py-5">
              <input
                id="customer-reference"
                className={inputClass}
                value={form.customerReference}
                onChange={(e) => set("customerReference", e.target.value)}
                placeholder="e.g. SMITH-J or ref 10293"
              />
              <p className="mt-1.5 text-xs text-faint">
                Optional. Use a reference, not sensitive personal details, if
                one is available.
              </p>
            </div>
          </div>

          <HomeLoanDetailsSection
            form={form}
            set={set}
            complete={loanComplete}
            fixedPeriods={fixedPeriods}
            filteredProducts={filteredProducts}
            selectedProduct={selectedProduct}
            loanAmountRef={loanAmountRef}
            lvr={lvr}
            cardedRate={result?.cardedRate ?? null}
            onLoanPurposeChange={changeLoanPurpose}
            onRateTypeChange={changeRateType}
            onFixedPeriodChange={changeFixedPeriod}
            open={openSections.loan}
            onToggle={(o) => setSectionOpen("loan", o)}
          />

          <HomeRiskSection
            form={form}
            set={set}
            assessed={riskAssessed}
            retentionScenario={retentionScenario}
            serviceabilityNsiEnabled={serviceabilityNsiEnabled}
            open={openSections.risk}
            onToggle={(o) => setSectionOpen("risk", o)}
          />

          {form.customerStream !== "new_to_bank" && (
            <HomeRelationshipSection
              form={form}
              set={set}
              provided={relationshipProvided}
              open={openSections.relationship}
              onToggle={(o) => setSectionOpen("relationship", o)}
            />
          )}

          <HomeStrategicSection
            form={form}
            set={set}
            provided={strategicProvided}
            marketEvidence={attachedMarketEvidence}
            onDetachMarketEvidence={() => setAttachedMarketEvidence(null)}
            open={openSections.competitor}
            onToggle={(o) => setSectionOpen("competitor", o)}
          />

          <HomeCapitalSection
            form={form}
            set={set}
            canOverride={canOverrideCapital}
            capitalAllocation={result?.profitability.capitalAllocation ?? null}
            open={openSections.capital}
            onToggle={(o) => setSectionOpen("capital", o)}
          />

          <CollapsibleSection
            id="quote-section-profitability"
            layout="hanging"
            title="Profitability"
            chip={
              profitabilityCustom ? (
                <StatusText tone="info">Custom inputs</StatusText>
              ) : (
                <StatusText tone="muted">Defaults applied</StatusText>
              )
            }
            open={openSections.profitability}
            onToggle={(o) => setSectionOpen("profitability", o)}
          >
            <ProfitabilityInputsCard
              channel={form.channel}
              costOfFunds={displayedCostOfFunds}
              onCostOfFundsChange={changeCostOfFunds}
              costOfFundsDefaultApplied={costOfFundsSource === "default"}
              commissions={form.commissions}
              onCommissionsChange={(v) => changeProfitLine("commissions", v)}
              otherIncome={form.otherIncome}
              onOtherIncomeChange={(v) => changeProfitLine("otherIncome", v)}
              expenses={form.expenses}
              onExpensesChange={(v) => changeProfitLine("expenses", v)}
              defaultFlags={profitDefaultFlags}
              profitInputUnit={profitInputUnit}
              onSwitchUnit={switchProfitInputUnit}
              profitUnitNotice={profitUnitNotice}
              percentEnabled={profitPercentEnabled}
            />
            <ExpectedLossInputs
              amount={form.expectedCreditLossOverrideAmount}
              onAmountChange={(value) =>
                set("expectedCreditLossOverrideAmount", value)
              }
              unit={profitInputUnit}
              percentLabel="% loan"
              expectedLoss={result?.profitability.expectedLoss}
              canAuthorise={canOverrideExpectedLoss}
              overrideEnabled={form.expectedCreditLossOverrideEnabled}
              onOverrideEnabledChange={(value) =>
                set("expectedCreditLossOverrideEnabled", value)
              }
              overrideReason={form.expectedCreditLossOverrideReason}
              onOverrideReasonChange={(value) =>
                set("expectedCreditLossOverrideReason", value)
              }
            />
            <div className="mt-4">
              <QuoteFeeInputs
                idPrefix="home"
                setting={quoteFeeSetting}
                overrideEnabled={form.upfrontFeeOverrideEnabled}
                onOverrideEnabledChange={(enabled) => {
                  set("upfrontFeeOverrideEnabled", enabled);
                  if (enabled && form.upfrontFeeOverride.trim() === "") {
                    set(
                      "upfrontFeeOverride",
                      String(quoteFeeSetting.standardUpfrontFee),
                    );
                  }
                }}
                overrideValue={form.upfrontFeeOverride}
                onOverrideValueChange={(value) =>
                  set("upfrontFeeOverride", value)
                }
                monthlyOverrideEnabled={form.monthlyFeeOverrideEnabled}
                onMonthlyOverrideEnabledChange={(enabled) => {
                  set("monthlyFeeOverrideEnabled", enabled);
                  if (enabled && form.monthlyFeeOverride.trim() === "") {
                    set(
                      "monthlyFeeOverride",
                      String(quoteFeeSetting.monthlyFee),
                    );
                  }
                }}
                monthlyOverrideValue={form.monthlyFeeOverride}
                onMonthlyOverrideValueChange={(value) =>
                  set("monthlyFeeOverride", value)
                }
                referenceFees={
                  selectedProduct ? productFeeItems(selectedProduct) : []
                }
              />
            </div>
          </CollapsibleSection>

          <HomeNotesSection
            form={form}
            set={set}
            open={openSections.notes}
            onToggle={(o) => setSectionOpen("notes", o)}
          />
        </QuoteWorkspaceForm>

        {/* RIGHT: sticky live result rail */}
        <QuoteWorkspaceRail
          railRef={railRef}
          actionRef={actionRef}
          liveSummary={liveSummary}
          busy={calcLoading}
          resultError={calcError}
          resultIsStale={result != null}
          onRetry={() => dispatchController({ type: "retry_requested" })}
          actionError={saveError}
          actionHintId="home-save-readiness"
          actions={
            <Button
              variant="primary"
              className="w-full"
              data-loading-bar
              onClick={() => {
                void handleSave();
              }}
              disabled={saving || !result || rateScenario.active}
              aria-describedby="home-save-readiness"
              title={
                rateScenario.active
                  ? "Apply or reset the customer-rate scenario before saving"
                  : undefined
              }
            >
              {saving ? "Saving…" : saveLabel}
            </Button>
          }
          actionHint={
            saveReadiness === "Ready to save"
              ? "Ready to save. The record will capture available inputs, suggested rate, breakdown, approval and warnings for audit."
              : saveReadiness
          }
        >
          <ResultPanel
            result={result}
            loading={calcLoading}
            scenarioActive={rateScenario.active}
            scenarioBaseline={rateScenario.baselineResult}
            scenarioControl={scenarioControl}
            context={{
              customerStream: form.customerStream,
              channel: form.channel,
              creditScore: retentionScenario ? null : creditScoreAverage,
              dtiRatio:
                !retentionScenario && form.dtiRatio
                  ? parseFloat(form.dtiRatio)
                  : null,
              grossAnnualIncome:
                !retentionScenario && form.grossAnnualIncome
                  ? parseFloat(form.grossAnnualIncome)
                  : null,
              serviceabilityIncomeMeasure: form.serviceabilityIncomeMeasure,
              serviceabilityNsi:
                !retentionScenario && form.serviceabilityNsi
                  ? parseFloat(form.serviceabilityNsi)
                  : null,
              currentCustomerRate: form.currentCustomerRate
                ? parseFloat(form.currentCustomerRate)
                : null,
              retentionArrearsHardship18Months:
                form.retentionArrearsHardship18Months === ""
                  ? null
                  : form.retentionArrearsHardship18Months === "yes",
              retentionArrearsPast12Months:
                form.retentionArrearsPast12Months === ""
                  ? null
                  : form.retentionArrearsPast12Months === "yes",
              existingMember,
              livesInServiceRegion: form.livesInServiceRegion,
              lenderProducts: form.lenderProducts,
              retentionScenario,
              newToBankGrowthOpportunity,
              vipCustomer: form.vipCustomer,
              yearsAsMember: form.yearsAsMember
                ? parseInt(form.yearsAsMember)
                : null,
              brokerName: form.brokerName || null,
              brokerCompany: form.brokerCompany || null,
              brokerInRegion:
                form.brokerInRegion === "yes" || form.brokerInRegion === "no"
                  ? form.brokerInRegion
                  : null,
              brokerVolumeBand:
                form.brokerVolumeBand === "1_3" ||
                form.brokerVolumeBand === "4_6" ||
                form.brokerVolumeBand === "7_9" ||
                form.brokerVolumeBand === "10_plus"
                  ? form.brokerVolumeBand
                  : null,
              brokerDiscretionPct: form.brokerDiscretionPct
                ? parseFloat(form.brokerDiscretionPct)
                : null,
            }}
          />
        </QuoteWorkspaceRail>
      </QuoteWorkspaceLayout>
    </div>
  );
}
