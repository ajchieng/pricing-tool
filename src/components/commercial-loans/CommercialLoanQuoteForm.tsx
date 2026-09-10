"use client";

import type React from "react";
import Link from "next/link";
import { useEffect, useReducer, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { liveDemoProfitabilityLines } from "@/lib/demo/live-profitability-defaults";
import { useDemoConfiguration } from "@/lib/demo/configuration-react";
import { calculateDemo } from "@/lib/demo/pricing";
import { saveDemoForm } from "@/lib/demo/form-adapter";
import { demoFormError, focusDemoIssue } from "@/lib/demo/form-errors";
import { Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import {
  PROFITABILITY_CHANNEL_OPTIONS,
  Select,
  normalizeProfitabilityChannel,
} from "@/components/quote-form-ui";
import {
  COMMERCIAL_LOAN_LIMITS,
  COMMERCIAL_CUSTOMER_CONCENTRATION_THRESHOLD_PCT,
  FACILITY_TYPE_LABELS,
  COMMERCIAL_SECURITY_LABELS,
} from "@/lib/pricing/commercial/config";
import type { ProfitabilityChannel } from "@/lib/pricing/types";
import {
  ZERO_QUOTE_FEE_SETTING,
  type QuoteFeeSettingConfig,
} from "@/lib/pricing/quote-fees";
import {
  costOfFundsDefaultText,
  type CommercialCostOfFundsDefaults,
} from "@/lib/pricing/cost-of-funds-defaults";
import {
  commercialDefaultFieldStrings,
  type CommercialProfitabilityDefaultsByChannelAndFacility,
} from "@/lib/quotes/profitability-defaults";
import {
  commercialChannelDefaultsApplied,
  commercialFacilityTypeOf,
  emptyCommercialSecurity,
  initialCommercialLoanFormState,
  removeCommercialSecurity,
  setPrimaryCommercialSecurity,
  type CommercialSecurityFormValue,
  type FormState,
} from "@/components/commercial-loans/form-state";
import {
  buildCommercialQuoteRequest,
  commercialNumberOrNull as numOrNull,
  commercialRequestContext,
  convertCommercialProfitLineValue,
  type CommercialProfitInputUnit as ProfitInputUnit,
} from "@/components/commercial-loans/pricing-request";
import {
  commercialQuoteControllerReducer,
  initialCommercialQuoteControllerState,
} from "@/components/commercial-loans/quote-controller";
import { CommercialResultPanel } from "@/components/commercial-loans/CommercialResultPanel";
import {
  CommercialCapitalSection,
  CommercialRelationshipSection,
  CommercialRequestedPricingSection,
  CommercialRiskSection,
} from "@/components/commercial-loans/CommercialLoanFormSections";
import { SuggestedRateBar } from "@/components/quote/SuggestedRateBar";
import { QuoteFeeInputs } from "@/components/quote/QuoteFeeInputs";
import { ExpectedLossInputs } from "@/components/quote/ExpectedLossInputs";
import { BrokerIdentityFields } from "@/components/quote/BrokerIdentityFields";
import { Button } from "@/components/ui/Button";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, inputClass } from "@/components/ui/Field";
import { MoneyInput, NumberInput, RateInput } from "@/components/ui/inputs";
import { PageHeader } from "@/components/ui/PageHeader";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { StatusText } from "@/components/ui/StatusText";
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
import { useDebouncedPricingRequest } from "@/components/quotes/useDebouncedPricingRequest";
import {
  customerRateScenarioRequestKey,
  customerRatesEqual,
} from "@/components/quotes/customer-rate-scenario";
import { useUnsavedChangesGuard } from "@/components/quotes/useUnsavedChangesGuard";
import { QuoteFormTools } from "@/components/quotes/QuoteFormTools";
import { fmtMoney, fmtPct } from "@/lib/format";
import type { MarketQuoteEvidence } from "@/lib/market/quote-evidence";
import {
  COMMERCIAL_LOAN_TYPE_OPTIONS,
  COMMERCIAL_INPUT_IDS,
  COMMERCIAL_SECTION_FIELDS,
} from "@/components/commercial-loans/form-metadata";

type ProfitFieldKey = "commissions" | "otherIncome" | "expenses";

export function CommercialLoanQuoteForm({
  initialValues,
  profitabilityDefaults = {},
  costOfFundsDefaults = {},
  revisedFromQuoteId,
  saveLabel = "Save quote",
  header,
  canOverrideCapital = false,
  canOverrideExpectedLoss = false,
  quoteFeeSetting = ZERO_QUOTE_FEE_SETTING,
  customerConcentrationThresholdPct = COMMERCIAL_CUSTOMER_CONCENTRATION_THRESHOLD_PCT,
  marketEvidence = null,
  marketEvidenceError = null,
  applyProfitabilityDefaults,
}: {
  initialValues?: Partial<FormState>;
  profitabilityDefaults?: CommercialProfitabilityDefaultsByChannelAndFacility;
  costOfFundsDefaults?: CommercialCostOfFundsDefaults;
  revisedFromQuoteId?: number;
  saveLabel?: string;
  header?: {
    title: string;
    caption?: React.ReactNode;
    actions?: React.ReactNode;
  };
  canOverrideCapital?: boolean;
  canOverrideExpectedLoss?: boolean;
  quoteFeeSetting?: QuoteFeeSettingConfig;
  customerConcentrationThresholdPct?: number;
  marketEvidence?: MarketQuoteEvidence | null;
  marketEvidenceError?: string | null;
  /** Fresh quotes take fictional percentage defaults; revisions keep saved dollars. */
  applyProfitabilityDefaults?: boolean;
} = {}) {
  const router = useRouter();
  const { markDirty, markClean } = useUnsavedChangesGuard();
  const [form, setForm] = useState<FormState>(() => {
    const base = {
      ...initialCommercialLoanFormState(
        profitabilityDefaults,
        costOfFundsDefaults,
      ),
      ...initialValues,
    };
    return {
      ...base,
      competitorLender:
        marketEvidence?.lender.slice(0, 120) ?? base.competitorLender,
      competitorRate:
        marketEvidence == null
          ? base.competitorRate
          : String(marketEvidence.advertisedRate),
      expectedCreditLossOverrideEnabled:
        canOverrideExpectedLoss && base.expectedCreditLossOverrideEnabled,
      expectedCreditLossOverrideReason: canOverrideExpectedLoss
        ? base.expectedCreditLossOverrideReason
        : "",
      ...(marketEvidence &&
      marketEvidence.version === 2 &&
      marketEvidence.productCategory === "OVERDRAFTS" &&
      !revisedFromQuoteId
        ? {
            facilityType: "overdraft",
            repaymentType: "interest_only" as const,
            loanTermYears: "",
          }
        : {}),
    };
  });
  const [attachedMarketEvidence, setAttachedMarketEvidence] =
    useState<MarketQuoteEvidence | null>(marketEvidence);
  const [costOfFundsSource, setCostOfFundsSource] = useState<
    "default" | "override"
  >(
    initialValues?.costOfFunds == null ||
      String(initialValues.costOfFunds).trim() === ""
      ? "default"
      : "override",
  );
  const [controller, dispatchController] = useReducer(
    commercialQuoteControllerReducer,
    initialCommercialQuoteControllerState,
  );
  const { result, saving, retryToken: retryTick } = controller;
  const [lastPricedRequestedRate, setLastPricedRequestedRate] = useState<
    number | null
  >(null);
  const [lastPricedContextKey, setLastPricedContextKey] = useState<
    string | null
  >(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const securityIdRef = useRef(1);
  const securityTouchedRef = useRef(Boolean(initialValues?.securities));
  const pendingSecurityFocusRef = useRef<string | null>(null);
  const commissionBeforeOnlineRef = useRef<string | null>(null);
  const railRef = useRef<HTMLDivElement | null>(null);
  const actionRef = useRef<HTMLDivElement | null>(null);
  const [actionsInView, setActionsInView] = useState(false);
  const anyDefaults = Object.values(profitabilityDefaults).some(
    (defaults) =>
      defaults != null &&
      [
        defaults.commissionsPct,
        defaults.otherIncomePct,
        defaults.expensesPct,
      ].some((value) => value != null),
  );
  const applyChannelDefaults = commercialChannelDefaultsApplied({
    initialValues,
    applyProfitabilityDefaults,
  });
  const [profitInputUnit, setProfitInputUnit] = useState<ProfitInputUnit>(
    applyChannelDefaults && anyDefaults ? "percent" : "dollar",
  );
  const [profitDefaultFlags, setProfitDefaultFlags] = useState<
    Record<ProfitFieldKey, boolean>
  >({
    commissions: applyChannelDefaults,
    otherIncome: applyChannelDefaults,
    expenses: applyChannelDefaults,
  });
  const [openSections, setOpenSections] = useState({
    facility: true,
    risk: true,
    relationship: Boolean(
      initialValues?.existingRelationship ||
      initialValues?.operatingInRegion ||
      initialValues?.vipCustomer,
    ),
    profitability: Boolean(
      initialValues?.costOfFunds ||
      initialValues?.commissions ||
      initialValues?.otherIncome ||
      initialValues?.expenses,
    ),
    capital: Boolean(
      initialValues?.capitalClassificationConfirmed ||
      initialValues?.riskWeightOverridePct ||
      initialValues?.taxRateOverridePct ||
      initialValues?.creditConversionFactorOverridePct,
    ),
    requested: Boolean(
      marketEvidence ||
      initialValues?.competitorLender ||
      initialValues?.competitorRate ||
      initialValues?.competitorNotes ||
      initialValues?.requestedRate ||
      initialValues?.requestedReason ||
      initialValues?.requestedReasonNotes ||
      initialValues?.notes,
    ),
  });
  type CommercialSectionKey = keyof typeof openSections;

  const {
    isOverdraft,
    isCommercialProperty,
    isPurchase,
    purchasePrice,
    customerEquityContribution,
    derivedPurchaseAmount,
    facilityAmount,
    profitabilityExposure,
  } = commercialRequestContext(form);
  const liveProfitLines = liveDemoProfitabilityLines(
    form,
    profitDefaultFlags,
    commercialDefaultFieldStrings(
      profitabilityDefaults,
      form.channel,
      commercialFacilityTypeOf(form.facilityType),
    ),
    profitInputUnit,
    profitabilityExposure,
  );
  const configurationVersion = useDemoConfiguration().version;
  const scenarioContextKey = JSON.stringify([
    configurationVersion,
    form.facilityType,
    form.loanType,
    form.loanAmount,
    form.loanTermYears,
    form.repaymentType,
    form.industryCategory,
    form.businessRiskGrade,
    form.yearsTrading,
    form.annualRevenue,
    form.ebitda,
    form.existingAnnualDebtService,
    form.financialsQuality,
    form.financialsAgeMonths,
    form.revenueTrend,
    form.profitTrend,
    form.taxStatus,
    form.largestCustomerRevenueAboveThreshold,
    form.propertyTransactionType,
    form.purchasePrice,
    form.customerEquityContribution,
    form.securityMode,
    form.securities,
    form.existingRelationship,
    form.operatingInRegion,
    form.vipCustomer,
    form.yearsWithLender,
    form.otherLenderExposure,
    form.competitorLender,
    form.competitorRate,
    form.competitorNotes,
    attachedMarketEvidence?.marketRateId,
    form.requestedRate,
    form.requestedReason,
    form.channel,
    form.expectedUtilisationPct,
    form.costOfFunds,
    costOfFundsSource,
    liveProfitLines.commissions,
    liveProfitLines.otherIncome,
    form.upfrontFeeOverride,
    form.monthlyFeeOverride,
    liveProfitLines.expenses,
    form.expectedCreditLossOverrideAmount,
    form.expectedCreditLossOverrideEnabled,
    form.expectedCreditLossOverrideReason,
    form.currentDrawnBalance,
    form.apsExposureClass,
    form.capitalClassificationConfirmed,
    form.capitalPropertyStandardStatus,
    form.capitalPropertyCashFlowDependent,
    form.riskWeightOverridePct,
    form.taxRateOverridePct,
    form.creditConversionFactorOverridePct,
    form.capitalOverrideReason,
    profitInputUnit,
  ]);
  const rateScenario = useCustomerRateScenario({
    result,
    recommendationRate: result?.indicativeRate ?? null,
    formalRate: numOrNull(form.requestedRate),
    floorRate: result?.floorRate ?? null,
    topRate: result?.topRate ?? null,
    contextKey: scenarioContextKey,
  });
  const pricingRequestKey = customerRateScenarioRequestKey(
    scenarioContextKey,
    rateScenario.active ? rateScenario.rate : null,
  );

  useEffect(() => {
    const element = actionRef.current;
    if (!element || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setActionsInView(entry.isIntersecting),
      { threshold: 0.05 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  function scrollToResult() {
    const element = railRef.current;
    if (!element) return;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    element.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
    requestAnimationFrame(() => {
      element
        .querySelector<HTMLElement>("[data-pricing-result-region]")
        ?.focus({ preventScroll: true });
    });
  }

  const setSectionOpen = (key: CommercialSectionKey, open: boolean) => {
    setOpenSections((current) => ({ ...current, [key]: open }));
  };

  // The browser save adapter recalculates. Keep the last successful preview
  // visible while a changed scenario is repriced, and surface stale state if a
  // refresh fails.
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    markDirty();
    setForm((f) => ({ ...f, [key]: value }));
  };

  const changeCostOfFunds = (value: string) => {
    setForm((current) => ({ ...current, costOfFunds: value }));
    setCostOfFundsSource(value.trim() === "" ? "default" : "override");
  };

  const displayedCostOfFunds =
    costOfFundsSource === "default"
      ? costOfFundsDefaultText(
          costOfFundsDefaults[commercialFacilityTypeOf(form.facilityType)],
        )
      : form.costOfFunds;

  // A manually edited line item stops tracking the fictional default.
  const setProfitLine = (key: ProfitFieldKey, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setProfitDefaultFlags((current) =>
      current[key] ? { ...current, [key]: false } : current,
    );
  };

  const exposureFor = (current: FormState, facilityType: string): number => {
    const isPurchase =
      facilityType === "equipment_finance" ||
      (facilityType === "commercial_property" &&
        current.propertyTransactionType === "purchase");
    const amount = isPurchase
      ? Math.max(
          0,
          (numOrNull(current.purchasePrice) ?? 0) -
            (numOrNull(current.customerEquityContribution) ?? 0),
        )
      : (numOrNull(current.loanAmount) ?? 0);
    const utilisation =
      facilityType === "overdraft"
        ? (numOrNull(current.expectedUtilisationPct) ?? 65)
        : 100;
    return amount * (utilisation / 100);
  };

  const setSecurity = (
    id: string,
    key: keyof Pick<
      CommercialSecurityFormValue,
      "type" | "value" | "description"
    >,
    value: string,
  ) => {
    securityTouchedRef.current = true;
    setForm((current) => ({
      ...current,
      securities: current.securities.map((security) =>
        security.id === id ? { ...security, [key]: value } : security,
      ),
    }));
  };

  const setSecurityMode = (mode: "secured" | "unsecured") => {
    securityTouchedRef.current = true;
    set("securityMode", mode);
  };

  const addSecurity = () => {
    securityTouchedRef.current = true;
    setForm((current) => {
      if (current.securities.length >= 10) return current;
      const id = `security-${securityIdRef.current++}`;
      pendingSecurityFocusRef.current = id;
      return {
        ...current,
        securities: [
          ...current.securities,
          emptyCommercialSecurity(id, "commercial_property", false),
        ],
      };
    });
  };

  const removeSecurity = (id: string) => {
    securityTouchedRef.current = true;
    setForm((current) => {
      const removedIndex = current.securities.findIndex(
        (security) => security.id === id,
      );
      const securities = removeCommercialSecurity(current.securities, id);
      const nextIndex = Math.min(
        Math.max(removedIndex, 0),
        securities.length - 1,
      );
      pendingSecurityFocusRef.current = securities[nextIndex]?.id ?? null;
      return { ...current, securities };
    });
  };

  useEffect(() => {
    const id = pendingSecurityFocusRef.current;
    if (!id) return;
    pendingSecurityFocusRef.current = null;
    document.getElementById(`cl-security-${id}`)?.focus();
  }, [form.securities]);

  const markPrimarySecurity = (id: string) => {
    securityTouchedRef.current = true;
    setForm((current) => ({
      ...current,
      securities: setPrimaryCommercialSecurity(current.securities, id),
    }));
  };

  const changeFacilityType = (facilityType: string) => {
    setForm((current) => {
      let next = applyProfitDefaults(current, current.channel, facilityType);
      const nextIsPurchase =
        facilityType === "equipment_finance" ||
        (facilityType === "commercial_property" &&
          next.propertyTransactionType === "purchase");
      if (nextIsPurchase && !next.purchasePrice.trim()) {
        next = {
          ...next,
          purchasePrice: current.loanAmount,
          customerEquityContribution: next.customerEquityContribution || "0",
        };
      }
      if (
        facilityType === "equipment_finance" &&
        !securityTouchedRef.current &&
        next.securityMode === "secured"
      ) {
        next = {
          ...next,
          securities: next.securities.map((security, index) =>
            index === 0 ? { ...security, type: "business_assets" } : security,
          ),
        };
      }
      return next;
    });
  };

  const changePropertyTransactionType = (
    propertyTransactionType: "purchase" | "refinance",
  ) => {
    setForm((current) => {
      if (propertyTransactionType === "purchase") {
        return {
          ...current,
          propertyTransactionType,
          purchasePrice: current.purchasePrice || current.loanAmount,
          customerEquityContribution: current.customerEquityContribution || "0",
        };
      }
      const derivedAmount = Math.max(
        0,
        (numOrNull(current.purchasePrice) ?? 0) -
          (numOrNull(current.customerEquityContribution) ?? 0),
      );
      return {
        ...current,
        propertyTransactionType,
        loanAmount:
          derivedAmount > 0 ? String(derivedAmount) : current.loanAmount,
      };
    });
  };

  const defaultFor = (pct: string, exposure: number): string => {
    if (!pct) return "";
    if (profitInputUnit === "percent") return pct;
    const n = Number(pct);
    if (!Number.isFinite(n) || !(exposure > 0)) return "";
    return String(Math.round((n / 100) * exposure * 100) / 100);
  };

  // Re-fills untouched line items with the fictional default for the selected
  // channel and facility; manually edited lines keep their value.
  const applyProfitDefaults = (
    current: FormState,
    channel: ProfitabilityChannel,
    facilityType: string,
  ): FormState => {
    const defaults = commercialDefaultFieldStrings(
      profitabilityDefaults,
      channel,
      commercialFacilityTypeOf(facilityType),
    );
    const exposure = exposureFor(current, facilityType);
    return {
      ...current,
      channel,
      facilityType,
      commissions:
        channel === "online"
          ? "0"
          : profitDefaultFlags.commissions
            ? defaultFor(defaults.commissions, exposure)
            : current.commissions,
      otherIncome: profitDefaultFlags.otherIncome
        ? defaultFor(defaults.otherIncome, exposure)
        : current.otherIncome,
      expenses: profitDefaultFlags.expenses
        ? defaultFor(defaults.expenses, exposure)
        : current.expenses,
    };
  };

  const changeChannel = (channel: ProfitabilityChannel) => {
    setForm((current) => {
      if (channel === "online" && current.channel !== "online") {
        commissionBeforeOnlineRef.current = current.commissions;
      }
      const next = applyProfitDefaults(current, channel, current.facilityType);
      if (
        current.channel === "online" &&
        channel !== "online" &&
        !profitDefaultFlags.commissions &&
        commissionBeforeOnlineRef.current != null
      ) {
        next.commissions = commissionBeforeOnlineRef.current;
      }
      return next;
    });
  };

  const payload = (requestedRateForPricing?: number) =>
    buildCommercialQuoteRequest({
      form: { ...form, ...liveProfitLines },
      marketRateId: attachedMarketEvidence?.marketRateId ?? null,
      costOfFundsSource,
      profitInputUnit,
      requestedRateForPricing,
    });

  const { loading: calculating, error: calcError } = useDebouncedPricingRequest(
    {
      enabled: facilityAmount >= COMMERCIAL_LOAN_LIMITS.minLoanAmount,
      requestKey: pricingRequestKey,
      retryToken: retryTick,
      request: async (signal) => {
        const nextPayload = payload(
          rateScenario.active && rateScenario.rate != null
            ? rateScenario.rate
            : undefined,
        );
        signal.throwIfAborted();
        const data = await calculateDemo("commercial", nextPayload);
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

  const currentPricingReady =
    result != null &&
    !calculating &&
    calcError == null &&
    lastPricedContextKey === scenarioContextKey;

  const save = async () => {
    if (!currentPricingReady || rateScenario.active) {
      setSaveError(
        "Wait for current pricing to finish, and apply or reset any customer-rate scenario before saving.",
      );
      return;
    }
    setSaveError(null);
    dispatchController({ type: "save_started" });
    try {
      const saved = await saveDemoForm(
        "commercial",
        payload(),
        revisedFromQuoteId ?? undefined,
        attachedMarketEvidence,
        configurationVersion,
      );
      markClean();
      router.push(`/commercial-loans/quote/?id=${saved.id}`);
    } catch (error) {
      setSaveError(demoFormError(error));
      focusDemoIssue(error, {
        sectionFields: COMMERCIAL_SECTION_FIELDS,
        inputIds: COMMERCIAL_INPUT_IDS,
        openSection: (section) => setSectionOpen(section, true),
      });
    } finally {
      dispatchController({ type: "save_finished" });
    }
  };

  const equityContributionExceedsPrice =
    isPurchase &&
    purchasePrice > 0 &&
    customerEquityContribution > purchasePrice;
  const equityContributionValid =
    !isPurchase ||
    (purchasePrice > 0 &&
      customerEquityContribution >= 0 &&
      !equityContributionExceedsPrice);
  const securityAssessed =
    form.securityMode === "unsecured" ||
    (form.securities.length > 0 &&
      form.securities.filter((security) => security.isPrimary).length === 1 &&
      form.securities.every((security) => numOrNull(security.value) != null));
  const facilityComplete =
    facilityAmount >= COMMERCIAL_LOAN_LIMITS.minLoanAmount &&
    facilityAmount <= COMMERCIAL_LOAN_LIMITS.maxLoanAmount &&
    equityContributionValid &&
    securityAssessed;
  const riskAssessed = Boolean(
    form.businessRiskGrade &&
    form.industryCategory &&
    (form.financialsQuality || form.ebitda || form.annualRevenue),
  );
  const relationshipProvided =
    form.existingRelationship ||
    form.operatingInRegion !== "" ||
    form.vipCustomer ||
    [form.yearsWithLender, form.otherLenderExposure].some(
      (value) => value.trim() !== "",
    );
  const requestedInPlay =
    attachedMarketEvidence != null ||
    form.competitorLender.trim() !== "" ||
    form.competitorRate.trim() !== "" ||
    form.competitorNotes.trim() !== "" ||
    form.requestedRate.trim() !== "" ||
    form.requestedReason.trim() !== "" ||
    form.requestedReasonNotes.trim() !== "";
  const profitabilityProvided = Boolean(
    (costOfFundsSource === "override" && form.costOfFunds.trim()) ||
    liveProfitLines.commissions.trim() ||
    liveProfitLines.otherIncome.trim() ||
    form.upfrontFeeOverride.trim() ||
    form.monthlyFeeOverride.trim() ||
    liveProfitLines.expenses.trim() ||
    (form.expectedCreditLossOverrideAmount.trim() === "0"
      ? ""
      : form.expectedCreditLossOverrideAmount) ||
    form.expectedCreditLossOverrideEnabled,
  );

  const switchProfitInputUnit = (next: ProfitInputUnit) => {
    if (next === profitInputUnit) return;
    setForm((current) => ({
      ...current,
      commissions:
        current.channel === "online"
          ? "0"
          : convertCommercialProfitLineValue(
              current.commissions,
              profitInputUnit,
              next,
              profitabilityExposure,
            ),
      otherIncome: convertCommercialProfitLineValue(
        current.otherIncome,
        profitInputUnit,
        next,
        profitabilityExposure,
      ),
      expenses: convertCommercialProfitLineValue(
        current.expenses,
        profitInputUnit,
        next,
        profitabilityExposure,
      ),
      expectedCreditLossOverrideAmount: convertCommercialProfitLineValue(
        current.expectedCreditLossOverrideAmount,
        profitInputUnit,
        next,
        profitabilityExposure,
      ),
    }));
    setProfitInputUnit(next);
  };

  const profitLineInput = (
    id: string,
    value: string,
    onChange: (value: string) => void,
    disabled = false,
  ) =>
    profitInputUnit === "percent" ? (
      <NumberInput
        id={id}
        suffix="% exposure"
        value={value}
        onChange={onChange}
        disabled={disabled}
      />
    ) : (
      <MoneyInput
        id={id}
        value={value}
        onChange={onChange}
        disabled={disabled}
      />
    );
  const liveSummary = calcError
    ? calcError
    : calculating
      ? "Recalculating commercial pricing."
      : result
        ? rateScenario.active
          ? `Scenario customer rate ${result.finalDisplayRate.toFixed(2)}%. Approval ${result.approvalRequired ? "required" : "not required"}. Preview only, not saved.`
          : `${result.pricingBasis === "discount_entitlement_v1" ? "Suggested rate" : "Legacy indicative rate"} ${result.suggestedRate.toFixed(2)}%. Approval ${result.approvalRequired ? "required" : "not required"}.`
        : "Enter a valid facility amount to calculate commercial pricing.";
  const showMobileBar = result != null && !actionsInView;
  const scenarioCanApply =
    rateScenario.active &&
    !calculating &&
    calcError == null &&
    result != null &&
    lastPricedContextKey === scenarioContextKey &&
    customerRatesEqual(lastPricedRequestedRate, rateScenario.rate);
  const scenarioCanChange =
    result != null &&
    calcError == null &&
    !calculating &&
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
          setSectionOpen("requested", true);
          rateScenario.reset();
        }}
        onReset={rateScenario.reset}
      />
    ) : null;
  const sectionItems: QuoteSectionNavItem<CommercialSectionKey>[] = [
    {
      key: "facility",
      id: "quote-section-facility",
      label: "Business & facility",
      statusLabel: facilityComplete
        ? "Complete"
        : !securityAssessed
          ? "Needs security value"
          : "Incomplete",
      state: facilityComplete ? "complete" : "attention",
    },
    {
      key: "risk",
      id: "quote-section-risk",
      label: "Business risk",
      statusLabel: riskAssessed ? "Assessed" : "Needs detail",
      state: riskAssessed ? "complete" : "attention",
    },
    {
      key: "relationship",
      id: "quote-section-relationship",
      label: "Relationship value",
      statusLabel: relationshipProvided ? "Provided" : "Optional",
      state: relationshipProvided ? "complete" : "optional",
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
      statusLabel: profitabilityProvided ? "Custom" : "Defaults",
      state: profitabilityProvided ? "complete" : "informational",
    },
    {
      key: "requested",
      id: "quote-section-requested",
      label: "Requested rate & notes",
      statusLabel: requestedInPlay ? "In play" : "Optional",
      state: requestedInPlay ? "complete" : "optional",
    },
  ];
  const saveReadiness = quoteReadinessMessage({
    items: sectionItems,
    calculating,
    resultReady: currentPricingReady,
    scenarioActive: rateScenario.active,
    hasPricingError: Boolean(calcError && !result),
  });

  function activateSection(key: CommercialSectionKey, id: string) {
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
      <PageHeader
        title={header?.title ?? "New Commercial Loan Quote"}
        caption={
          header?.caption ?? (
            <>
              Discount-from-base-rate pricing from business risk grade,
              industry, security coverage and cash flow, with a{" "}
              <strong className="text-ink">suggested rate</strong>,{" "}
              profitability view and approval requirement.
            </>
          )
        }
        backHref="/commercial-loans"
        backLabel="Commercial loan quotes"
        compactMobile
        actions={<QuoteFormTools>{header?.actions}</QuoteFormTools>}
      />

      {marketEvidenceError && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-warn/30 bg-warn-soft px-4 py-3 text-sm text-warn"
        >
          {marketEvidenceError}
          <Link
            href="/market-search/?area=commercial"
            className="ml-2 inline-flex min-h-[44px] items-center font-semibold underline underline-offset-2"
          >
            Return to Commercial Market Search
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
              void save();
            }}
            saveLabel={saveLabel}
            saving={saving}
            saveDisabled={!currentPricingReady || rateScenario.active}
            saveDisabledReason={
              saveReadiness === "Ready to save" ? null : saveReadiness
            }
            label={
              rateScenario.active
                ? "Scenario customer rate"
                : result?.pricingBasis === "legacy_signed_adjustment"
                  ? "Legacy indicative rate"
                  : "Suggested rate"
            }
          />
        }
      >
        <QuoteWorkspaceForm onDirty={markDirty}>
          <QuoteSectionNavigator
            items={sectionItems}
            onActivate={activateSection}
            readinessLabel={saveReadiness}
          />
          <div
            data-quote-parameter-group="Quote context"
            className="border-t border-border py-5"
          >
            <div className="grid gap-4 @md:grid-cols-2">
              <Select
                label="Channel"
                value={form.channel}
                onChange={(value) =>
                  changeChannel(normalizeProfitabilityChannel(value))
                }
                options={PROFITABILITY_CHANNEL_OPTIONS}
                helper="Select how this opportunity reached Lender."
              />
              <Select
                label="Loan type"
                value={form.loanType}
                onChange={(value) =>
                  set(
                    "loanType",
                    value === "non_standard" ? "non_standard" : "standard",
                  )
                }
                options={[...COMMERCIAL_LOAN_TYPE_OPTIONS]}
                helper="Sets the fictional commercial base rate. Facility type and APS 112 property treatment remain separate."
              />
              {form.channel === "broker" && (
                <fieldset
                  data-quote-parameter-group="Broker details"
                  className="@md:col-span-2 grid gap-4 rounded-lg border border-border bg-panel p-4 @md:grid-cols-2"
                >
                  <legend className="px-1 text-sm font-semibold text-ink">
                    Broker details
                  </legend>
                  <BrokerIdentityFields
                    idPrefix="cl-broker"
                    brokerName={form.brokerName}
                    onBrokerNameChange={(value) => set("brokerName", value)}
                    brokerCompany={form.brokerCompany}
                    onBrokerCompanyChange={(value) =>
                      set("brokerCompany", value)
                    }
                  />
                </fieldset>
              )}
            </div>
          </div>
          <CollapsibleSection
            id="quote-section-facility"
            layout="hanging"
            title="Business & facility"
            chip={
              facilityComplete ? (
                <StatusText tone="ok">Complete</StatusText>
              ) : !securityAssessed ? (
                <StatusText tone="warn">Needs security value</StatusText>
              ) : (
                <StatusText tone="muted">Incomplete</StatusText>
              )
            }
            open={openSections.facility}
            onToggle={(open) => setSectionOpen("facility", open)}
          >
            <div className="grid gap-4 @md:grid-cols-2">
              <div className="@md:col-span-2">
                <h3 className="text-sm font-semibold text-ink">
                  Business identity
                </h3>
              </div>
              <Field label="Business name" htmlFor="cl-business">
                <input
                  id="cl-business"
                  className={inputClass}
                  value={form.businessName}
                  onChange={(e) => set("businessName", e.target.value)}
                  placeholder="e.g. Cedar Workshop Pty Ltd"
                />
              </Field>
              <Field label="ABN (optional)" htmlFor="cl-abn">
                <input
                  id="cl-abn"
                  className={inputClass}
                  value={form.abn}
                  onChange={(e) => set("abn", e.target.value)}
                  inputMode="numeric"
                />
              </Field>
              <div className="border-t border-border pt-5 @md:col-span-2">
                <h3 className="text-sm font-semibold text-ink">
                  Facility structure
                </h3>
              </div>
              <Field label="Facility type" htmlFor="cl-facility">
                <select
                  id="cl-facility"
                  className={inputClass}
                  value={form.facilityType}
                  onChange={(e) => changeFacilityType(e.target.value)}
                >
                  {Object.entries(FACILITY_TYPE_LABELS).map(([v, label]) => (
                    <option key={v} value={v}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              {isCommercialProperty && (
                <Field label="Transaction type">
                  <SegmentedControl
                    ariaLabel="Commercial property transaction type"
                    fullWidth
                    value={form.propertyTransactionType}
                    onChange={changePropertyTransactionType}
                    options={[
                      { value: "purchase", label: "Purchase" },
                      { value: "refinance", label: "Refinance" },
                    ]}
                  />
                </Field>
              )}
              {!isPurchase && (
                <Field
                  label={isOverdraft ? "Facility limit" : "Facility amount"}
                  htmlFor="cl-amount"
                  required
                  helper={`$${COMMERCIAL_LOAN_LIMITS.minLoanAmount.toLocaleString("en-AU")} – $${COMMERCIAL_LOAN_LIMITS.maxLoanAmount.toLocaleString("en-AU")}.`}
                >
                  <MoneyInput
                    id="cl-amount"
                    value={form.loanAmount}
                    onChange={(v) => set("loanAmount", v)}
                  />
                </Field>
              )}
              {isPurchase && (
                <>
                  <div className="border-t border-border pt-5 @md:col-span-2">
                    <h3 className="text-sm font-semibold text-ink">
                      Purchase funding
                    </h3>
                    <p className="mt-1 max-w-[68ch] text-sm text-muted">
                      Customer Equity Contribution reduces the amount financed.
                      Purchase funding does not set the assessed security value
                      and has no direct customer-score weight.
                    </p>
                  </div>
                  <Field
                    label="Purchase price"
                    htmlFor="cl-purchase-price"
                    required
                  >
                    <MoneyInput
                      id="cl-purchase-price"
                      value={form.purchasePrice}
                      onChange={(value) => set("purchasePrice", value)}
                    />
                  </Field>
                  <Field
                    label="Customer Equity Contribution"
                    htmlFor="cl-equity-contribution"
                    required
                    helper={
                      purchasePrice > 0
                        ? `${((customerEquityContribution / purchasePrice) * 100).toFixed(1)}% of purchase price.`
                        : "Enter the customer's contribution toward the purchase."
                    }
                  >
                    <MoneyInput
                      id="cl-equity-contribution"
                      value={form.customerEquityContribution}
                      onChange={(value) =>
                        set("customerEquityContribution", value)
                      }
                    />
                  </Field>
                  <Field label="Amount financed">
                    <div
                      className="flex min-h-[44px] items-center rounded-lg bg-surface px-3"
                      aria-live="polite"
                    >
                      <span className="tnum text-base font-semibold text-ink">
                        {derivedPurchaseAmount > 0
                          ? derivedPurchaseAmount.toLocaleString("en-AU", {
                              style: "currency",
                              currency: "AUD",
                              maximumFractionDigits: 0,
                            })
                          : "—"}
                      </span>
                    </div>
                  </Field>
                  {equityContributionExceedsPrice && (
                    <p
                      className="self-end text-sm text-alert @md:col-span-1"
                      role="alert"
                    >
                      Customer Equity Contribution cannot exceed the purchase
                      price.
                    </p>
                  )}
                </>
              )}
              {!isOverdraft && (
                <>
                  <Field label="Term" htmlFor="cl-term">
                    <NumberInput
                      id="cl-term"
                      suffix="years"
                      value={form.loanTermYears}
                      onChange={(v) => set("loanTermYears", v)}
                    />
                  </Field>
                  <Field label="Repayments">
                    <SegmentedControl
                      ariaLabel="Repayment type"
                      fullWidth
                      value={form.repaymentType}
                      onChange={(v) => set("repaymentType", v)}
                      options={[
                        { value: "principal_and_interest", label: "P&I" },
                        { value: "interest_only", label: "Interest only" },
                      ]}
                    />
                  </Field>
                </>
              )}
              {isOverdraft && (
                <Field label="Structure">
                  <p className="flex min-h-[44px] items-center rounded-lg bg-panel px-3 text-sm text-muted">
                    Revolving limit, assessed as fully drawn. A line fee applies
                    to the limit.
                  </p>
                </Field>
              )}
              <Field
                label="Purpose notes"
                htmlFor="cl-purpose"
                className="@md:col-span-2"
              >
                <input
                  id="cl-purpose"
                  className={inputClass}
                  value={form.loanPurposeNotes}
                  onChange={(e) => set("loanPurposeNotes", e.target.value)}
                  placeholder="e.g. Purchase of packing equipment"
                />
              </Field>
              <div className="border-t border-border pt-5 @md:col-span-2">
                <h3 className="text-sm font-semibold text-ink">
                  Supporting security
                </h3>
                <p className="mt-1 max-w-[68ch] text-sm text-muted">
                  The primary security sets the security-type score. All
                  assessed values contribute to total facility coverage.
                </p>
              </div>
              <Field
                label="Security position"
                required
                className="@md:col-span-2"
              >
                <SegmentedControl
                  ariaLabel="Facility security position"
                  fullWidth
                  value={form.securityMode}
                  onChange={(value) => setSecurityMode(value)}
                  options={[
                    { value: "secured", label: "Secured" },
                    { value: "unsecured", label: "Unsecured" },
                  ]}
                />
              </Field>
              {form.securityMode === "unsecured" ? (
                <p className="rounded-lg bg-surface px-3 py-3 text-sm text-muted @md:col-span-2">
                  No security supports this facility. Security coverage is
                  recorded as 0%.
                </p>
              ) : (
                <div className="space-y-3 @md:col-span-2">
                  {form.securities.map((security, index) => (
                    <div
                      key={security.id}
                      className="grid gap-3 rounded-lg bg-surface p-3 @md:grid-cols-2"
                    >
                      <div className="flex items-center justify-between gap-3 @md:col-span-2">
                        <label
                          data-quote-parameter-label={`Primary security ${index + 1}`}
                          className="flex min-h-11 items-center gap-2 text-sm font-medium text-ink"
                        >
                          <input
                            type="radio"
                            name="commercial-primary-security"
                            checked={security.isPrimary}
                            onChange={() => markPrimarySecurity(security.id)}
                          />
                          {security.isPrimary
                            ? "Primary security"
                            : `Set security ${index + 1} as primary`}
                        </label>
                        {form.securities.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            data-form-mutation
                            onClick={() => removeSecurity(security.id)}
                            aria-label={`Remove security ${index + 1}`}
                          >
                            <Trash2 size={15} strokeWidth={1.75} aria-hidden />
                            Remove
                          </Button>
                        )}
                      </div>
                      <Field
                        label="Security type"
                        htmlFor={`cl-security-${security.id}`}
                      >
                        <select
                          id={`cl-security-${security.id}`}
                          className={inputClass}
                          value={security.type}
                          onChange={(event) =>
                            setSecurity(security.id, "type", event.target.value)
                          }
                        >
                          {Object.entries(COMMERCIAL_SECURITY_LABELS)
                            .filter(([value]) => value !== "unsecured")
                            .map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                        </select>
                      </Field>
                      <Field
                        label="Assessed security value"
                        htmlFor={`cl-security-value-${security.id}`}
                        required
                      >
                        <MoneyInput
                          id={`cl-security-value-${security.id}`}
                          value={security.value}
                          onChange={(value) =>
                            setSecurity(security.id, "value", value)
                          }
                        />
                      </Field>
                      <Field
                        label="Description (optional)"
                        htmlFor={`cl-security-description-${security.id}`}
                        className="@md:col-span-2"
                      >
                        <input
                          id={`cl-security-description-${security.id}`}
                          className={inputClass}
                          maxLength={160}
                          value={security.description}
                          onChange={(event) =>
                            setSecurity(
                              security.id,
                              "description",
                              event.target.value,
                            )
                          }
                          placeholder="e.g. 14 High Street, the service region"
                        />
                      </Field>
                    </div>
                  ))}
                  <Button
                    variant="secondary"
                    size="sm"
                    data-form-mutation
                    onClick={addSecurity}
                    disabled={form.securities.length >= 10}
                  >
                    <Plus size={15} strokeWidth={1.75} aria-hidden />
                    {form.securities.length >= 10
                      ? "Maximum 10 securities"
                      : "Add security"}
                  </Button>
                </div>
              )}
            </div>
          </CollapsibleSection>

          <CommercialRiskSection
            form={form}
            set={set}
            customerConcentrationThresholdPct={
              customerConcentrationThresholdPct
            }
            assessed={riskAssessed}
            open={openSections.risk}
            onToggle={(open) => setSectionOpen("risk", open)}
          />

          <CommercialRelationshipSection
            form={form}
            set={set}
            provided={relationshipProvided}
            open={openSections.relationship}
            onToggle={(open) => setSectionOpen("relationship", open)}
          />

          <CommercialCapitalSection
            form={form}
            set={set}
            capitalAllocation={result?.profitability.capitalAllocation ?? null}
            isOverdraft={isOverdraft}
            canOverride={canOverrideCapital}
            open={openSections.capital}
            onToggle={(open) => setSectionOpen("capital", open)}
          />

          <CollapsibleSection
            id="quote-section-profitability"
            layout="hanging"
            title="Profitability"
            chip={
              profitabilityProvided ? (
                <StatusText tone="info">Custom</StatusText>
              ) : (
                <StatusText tone="muted">Defaults</StatusText>
              )
            }
            open={openSections.profitability}
            onToggle={(open) => setSectionOpen("profitability", open)}
          >
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <p className="max-w-prose text-xs leading-5 text-muted">
                Annual Lender deal P&amp;L. Blank annual line items use the
                fictional channel and facility defaults (zero when none exist)
                and tax is derived. Facility fees are excluded.
                <span className="block">
                  {profitInputUnit === "percent"
                    ? "Line items are a percentage of expected exposure."
                    : "Line items are annual dollar figures."}
                </span>
              </p>
              <SegmentedControl
                ariaLabel="Commercial profitability input units"
                value={profitInputUnit}
                onChange={(value) => switchProfitInputUnit(value)}
                options={[
                  { value: "dollar", label: "$" },
                  { value: "percent", label: "%" },
                ]}
              />
            </div>
            <div className="grid gap-4 @md:grid-cols-2">
              {isOverdraft && (
                <Field
                  label="Expected utilisation"
                  htmlFor="cl-utilisation"
                  helper="Expected average drawn balance as a percentage of the facility limit."
                >
                  <NumberInput
                    id="cl-utilisation"
                    suffix="%"
                    value={form.expectedUtilisationPct}
                    onChange={(value) => set("expectedUtilisationPct", value)}
                  />
                </Field>
              )}
              <Field
                label="Cost of funds"
                htmlFor="cl-cost-funds"
                helper={
                  costOfFundsSource === "default"
                    ? displayedCostOfFunds.trim() !== ""
                      ? "Configured margin default — type to override."
                      : "Percentage p.a. No configured margin default is available."
                    : "Percentage p.a. Clear the field to restore the configured margin default."
                }
              >
                <RateInput
                  id="cl-cost-funds"
                  value={displayedCostOfFunds}
                  onChange={changeCostOfFunds}
                />
              </Field>
              <Field
                label="Commission cost"
                htmlFor="cl-profit-commissions"
                helper={
                  form.channel === "online"
                    ? "Online channel has no commission cost."
                    : "Annual distribution cost. Leave blank to use the fictional default."
                }
              >
                {profitLineInput(
                  "cl-profit-commissions",
                  form.channel === "online" ? "0" : liveProfitLines.commissions,
                  (value) => setProfitLine("commissions", value),
                  form.channel === "online",
                )}
              </Field>
              <Field
                label="Other income"
                htmlFor="cl-profit-other-income"
                helper="Annual non-fee income. Leave blank to use the fictional default."
              >
                {profitLineInput(
                  "cl-profit-other-income",
                  liveProfitLines.otherIncome,
                  (value) => setProfitLine("otherIncome", value),
                )}
              </Field>
              <Field
                label="Operating expenses"
                htmlFor="cl-profit-expenses"
                helper="Annual directly attributable operating cost. Leave blank to use the fictional default."
              >
                {profitLineInput(
                  "cl-profit-expenses",
                  liveProfitLines.expenses,
                  (value) => setProfitLine("expenses", value),
                )}
              </Field>
            </div>
            <ExpectedLossInputs
              amount={form.expectedCreditLossOverrideAmount}
              onAmountChange={(value) =>
                set("expectedCreditLossOverrideAmount", value)
              }
              unit={profitInputUnit}
              percentLabel="% exposure"
              expectedLoss={result?.profitability.expectedLoss}
              canAuthorise={canOverrideExpectedLoss}
              overrideEnabled={form.expectedCreditLossOverrideEnabled}
              onOverrideEnabledChange={(enabled) =>
                set("expectedCreditLossOverrideEnabled", enabled)
              }
              overrideReason={form.expectedCreditLossOverrideReason}
              onOverrideReasonChange={(reason) =>
                set("expectedCreditLossOverrideReason", reason)
              }
            />
            <div className="mt-4">
              <QuoteFeeInputs
                idPrefix="commercial"
                setting={quoteFeeSetting}
                overrideEnabled={form.upfrontFeeOverride.trim() !== ""}
                onOverrideEnabledChange={(enabled) =>
                  set(
                    "upfrontFeeOverride",
                    enabled ? String(quoteFeeSetting.standardUpfrontFee) : "",
                  )
                }
                overrideValue={form.upfrontFeeOverride}
                onOverrideValueChange={(value) =>
                  set("upfrontFeeOverride", value)
                }
                monthlyOverrideEnabled={form.monthlyFeeOverride.trim() !== ""}
                onMonthlyOverrideEnabledChange={(enabled) =>
                  set(
                    "monthlyFeeOverride",
                    enabled ? String(quoteFeeSetting.monthlyFee) : "",
                  )
                }
                monthlyOverrideValue={form.monthlyFeeOverride}
                onMonthlyOverrideValueChange={(value) =>
                  set("monthlyFeeOverride", value)
                }
                referenceFees={
                  result
                    ? [
                        {
                          label: "Establishment",
                          value: fmtMoney(result.fees.establishmentFee),
                        },
                        ...(result.fees.annualLineFeePct != null
                          ? [
                              {
                                label: "Annual line fee",
                                value: `${fmtPct(result.fees.annualLineFeePct)} of limit`,
                              },
                            ]
                          : []),
                        ...(result.fees.documentationFee != null
                          ? [
                              {
                                label: "Documentation",
                                value: fmtMoney(result.fees.documentationFee),
                              },
                            ]
                          : []),
                      ]
                    : []
                }
                referenceFeeEmpty="Enter enough facility details to calculate its reference fees."
              />
            </div>
          </CollapsibleSection>

          <CommercialRequestedPricingSection
            form={form}
            set={set}
            marketEvidence={attachedMarketEvidence}
            onDetachMarketEvidence={() => setAttachedMarketEvidence(null)}
            inPlay={requestedInPlay}
            open={openSections.requested}
            onToggle={(open) => setSectionOpen("requested", open)}
          />
        </QuoteWorkspaceForm>

        <QuoteWorkspaceRail
          railRef={railRef}
          actionRef={actionRef}
          liveSummary={liveSummary}
          busy={calculating}
          resultError={calcError}
          resultIsStale={result != null}
          onRetry={() => dispatchController({ type: "retry_requested" })}
          actionError={saveError}
          actionHintId="commercial-save-readiness"
          actions={
            <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-2">
              <Button
                variant="secondary"
                onClick={() => dispatchController({ type: "retry_requested" })}
                disabled={calculating || !facilityComplete}
                aria-label="Refresh pricing"
                title="Refresh pricing"
              >
                <RefreshCw size={15} strokeWidth={2} aria-hidden />
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  void save();
                }}
                disabled={!currentPricingReady || saving || rateScenario.active}
                aria-describedby="commercial-save-readiness"
                title={
                  saveReadiness === "Ready to save" ? undefined : saveReadiness
                }
              >
                <Save size={15} strokeWidth={2} aria-hidden />
                {saving ? "Saving…" : saveLabel}
              </Button>
            </div>
          }
          actionHint={
            saveReadiness === "Ready to save"
              ? "Ready to save. The record will capture facility inputs, suggested rate, first-year profitability, approval and warnings for audit."
              : saveReadiness
          }
        >
          {result ? (
            <CommercialResultPanel
              result={result}
              dense
              scenarioActive={rateScenario.active}
              scenarioBaseline={rateScenario.baselineResult}
              scenarioControl={scenarioControl}
            />
          ) : (
            <EmptyState
              title={calculating ? "Calculating pricing" : "No pricing yet"}
              body="Enter a valid facility amount to see the rate build-up, first-year profitability, cash flow cover and fees."
            />
          )}
        </QuoteWorkspaceRail>
      </QuoteWorkspaceLayout>
    </div>
  );
}
