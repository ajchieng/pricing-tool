"use client";

import type React from "react";
import Link from "next/link";
import { useEffect, useReducer, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { calculateDemo } from "@/lib/demo/pricing";
import { saveDemoForm } from "@/lib/demo/form-adapter";
import { demoFormError, focusDemoIssue } from "@/lib/demo/form-errors";
import { Save } from "lucide-react";
import { isPersonalLivePricingReady } from "@/lib/pricing/personal/live-pricing";
import { personalProductSecurityType } from "@/lib/pricing/personal/config";
import type { ProfitabilityChannel } from "@/lib/pricing/types";
import {
  ZERO_QUOTE_FEE_SETTING,
  type QuoteFeeSettingConfig,
} from "@/lib/pricing/quote-fees";
import {
  personalDefaultFieldStrings,
  type PersonalProfitabilityDefaultsByChannelAndSecurity,
} from "@/lib/quotes/profitability-defaults";
import { PersonalResultPanel } from "@/components/personal-loans/PersonalResultPanel";
import { SuggestedRateBar } from "@/components/quote/SuggestedRateBar";
import { QuoteFeeInputs } from "@/components/quote/QuoteFeeInputs";
import { ExpectedLossInputs } from "@/components/quote/ExpectedLossInputs";
import { OpeningContextCard } from "@/components/quote/OpeningContextCard";
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
import {
  customerRateScenarioRequestKey,
  customerRatesEqual,
} from "@/components/quotes/customer-rate-scenario";
import { useUnsavedChangesGuard } from "@/components/quotes/useUnsavedChangesGuard";
import { QuoteFormTools } from "@/components/quotes/QuoteFormTools";
import { useDebouncedPricingRequest } from "@/components/quotes/useDebouncedPricingRequest";
import type { FormState } from "@/components/personal-loans/form-state";
import {
  initialPersonalQuoteControllerState,
  personalQuoteControllerReducer,
} from "@/components/personal-loans/quote-controller";
import {
  buildPersonalQuoteRequest,
  convertPersonalProfitLineValue,
  personalNumberOrNull as numOrNull,
  type PersonalProfitInputUnit as ProfitInputUnit,
} from "@/components/personal-loans/pricing-request";
import { personalProductFeeItems } from "@/lib/products/fees";
import {
  costOfFundsDefaultText,
  personalCostOfFundsDefault,
  type PersonalCostOfFundsDefaults,
} from "@/lib/pricing/cost-of-funds-defaults";
import type { MarketQuoteEvidence } from "@/lib/market/quote-evidence";
import {
  PERSONAL_INPUT_IDS,
  PERSONAL_SECTION_FIELDS,
} from "@/components/personal-loans/form-metadata";
import {
  initialPersonalLoanFormState,
  personalChannelDefaultsApplied,
  securityForPersonalProduct,
  type PersonalLoanProductOption,
} from "@/components/personal-loans/form-initialization";
import {
  PersonalAffordabilitySection,
  PersonalCapitalSection,
  PersonalLoanDetailsSection,
  PersonalNotesSection,
  PersonalRelationshipSection,
  PersonalRequestedPricingSection,
  PersonalRiskSection,
} from "@/components/personal-loans/PersonalLoanFormSections";

export { type PersonalLoanProductOption } from "@/components/personal-loans/form-initialization";

type ProfitFieldKey = "commissions" | "otherIncome" | "expenses";

export function PersonalLoanQuoteForm({
  products = [],
  profitabilityDefaults = {},
  costOfFundsDefaults = [],
  initialValues,
  revisedFromQuoteId,
  saveLabel = "Save quote",
  header,
  canOverrideCapital = false,
  canOverrideExpectedLoss = false,
  quoteFeeSetting = ZERO_QUOTE_FEE_SETTING,
  marketEvidence = null,
  marketEvidenceError = null,
  applyProfitabilityDefaults,
}: {
  products?: PersonalLoanProductOption[];
  profitabilityDefaults?: PersonalProfitabilityDefaultsByChannelAndSecurity;
  costOfFundsDefaults?: PersonalCostOfFundsDefaults;
  initialValues?: Partial<FormState>;
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
  marketEvidence?: MarketQuoteEvidence | null;
  marketEvidenceError?: string | null;
  /** Fresh quotes take fictional percentage defaults; revisions keep saved dollars. */
  applyProfitabilityDefaults?: boolean;
}) {
  const router = useRouter();
  const { markDirty, markClean } = useUnsavedChangesGuard();
  const [form, setForm] = useState<FormState>(() => {
    const base = {
      ...initialPersonalLoanFormState(
        products,
        profitabilityDefaults,
        costOfFundsDefaults,
      ),
      ...initialValues,
    };
    const customerStream =
      base.customerStream === "retention" ||
      base.customerStream === "existing_member"
        ? base.customerStream
        : base.existingMember
          ? "existing_member"
          : "new_to_bank";
    return {
      ...base,
      customerStream,
      existingMember: customerStream !== "new_to_bank",
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
    personalQuoteControllerReducer,
    initialPersonalQuoteControllerState,
  );
  const { result, saving, retryToken: retryTick } = controller;
  const [lastPricedRequestedRate, setLastPricedRequestedRate] = useState<
    number | null
  >(null);
  const [lastPricedContextKey, setLastPricedContextKey] = useState<
    string | null
  >(null);
  const [saveError, setSaveError] = useState<string | null>(null);
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
  const applyChannelDefaults = personalChannelDefaultsApplied({
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
  const [profitUnitNotice, setProfitUnitNotice] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState({
    loan: true,
    risk: true,
    relationship: Boolean(
      initialValues?.customerStream === "existing_member" ||
      initialValues?.customerStream === "retention" ||
      initialValues?.existingMember ||
      initialValues?.yearsAsMember,
    ),
    affordability: Boolean(
      initialValues?.netMonthlyIncome ||
      initialValues?.monthlyLivingExpenses ||
      initialValues?.existingMonthlyDebtRepayments,
    ),
    requested: Boolean(
      marketEvidence ||
      initialValues?.competitorLender ||
      initialValues?.competitorRate ||
      initialValues?.competitorNotes ||
      initialValues?.requestedRate ||
      initialValues?.requestedReason ||
      initialValues?.requestedReasonNotes,
    ),
    profitability: Boolean(initialValues),
    capital: Boolean(
      initialValues?.riskWeightOverridePct ||
      initialValues?.taxRateOverridePct ||
      initialValues?.capitalOverrideReason,
    ),
    notes: Boolean(initialValues?.notes),
  });
  type PersonalSectionKey = keyof typeof openSections;
  const scenarioContextKey = JSON.stringify([
    form.productId,
    form.loanPurpose,
    form.securityType,
    form.loanAmount,
    form.loanTermMonths,
    form.creditScores,
    form.employmentIncomeStability,
    form.customerStream,
    form.currentCustomerRate,
    form.retentionArrearsHardship18Months,
    form.retentionArrearsPast12Months,
    form.riskNotes,
    form.existingMember,
    form.yearsAsMember,
    form.netMonthlyIncome,
    form.monthlyLivingExpenses,
    form.existingMonthlyDebtRepayments,
    form.competitorLender,
    form.competitorRate,
    form.competitorNotes,
    attachedMarketEvidence?.marketRateId,
    form.requestedRate,
    form.requestedReason,
    form.requestedReasonNotes,
    form.channel,
    form.brokerName,
    form.brokerCompany,
    form.brokerInRegion,
    form.brokerVolumeBand,
    form.brokerDiscretionPct,
    form.costOfFunds,
    form.commissions,
    form.otherIncome,
    form.upfrontFeeOverride,
    form.monthlyFeeOverride,
    form.expenses,
    form.expectedCreditLossOverrideAmount,
    form.expectedCreditLossOverrideEnabled,
    form.expectedCreditLossOverrideReason,
    form.riskWeightOverridePct,
    form.taxRateOverridePct,
    form.capitalOverrideReason,
    profitInputUnit,
  ]);
  const formalRequestedRate = numOrNull(form.requestedRate);
  const rateScenario = useCustomerRateScenario({
    result,
    recommendationRate: result?.suggestedRate ?? null,
    formalRate: formalRequestedRate,
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

  const setSectionOpen = (key: PersonalSectionKey, open: boolean) => {
    setOpenSections((current) => ({ ...current, [key]: open }));
  };

  // The browser save adapter recalculates; the preview keeps the visible
  // preview in step with the populated inputs.
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    markDirty();
    setForm((f) => ({ ...f, [key]: value }));
  };

  const changeCostOfFunds = (value: string) => {
    setForm((current) => ({ ...current, costOfFunds: value }));
    setCostOfFundsSource(value.trim() === "" ? "default" : "override");
  };

  const costOfFundsProduct = products.find(
    (candidate) => String(candidate.id) === form.productId,
  );
  const displayedCostOfFunds =
    costOfFundsSource === "default"
      ? costOfFundsDefaultText(
          personalCostOfFundsDefault(
            costOfFundsDefaults,
            costOfFundsProduct?.id ?? null,
            personalProductSecurityType(form.securityType),
          ),
        )
      : form.costOfFunds;

  const defaultFor = (pct: string, loanAmount: number): string => {
    if (!pct) return "";
    if (profitInputUnit === "percent") return pct;
    const n = Number(pct);
    if (!Number.isFinite(n) || !(loanAmount > 0)) return "";
    return String(Math.round((n / 100) * loanAmount * 100) / 100);
  };

  const defaultStringsFor = (
    channel: ProfitabilityChannel,
    securityType: FormState["securityType"],
  ) =>
    personalDefaultFieldStrings(
      profitabilityDefaults,
      channel,
      personalProductSecurityType(securityType),
    );

  const setProfitLine = (key: ProfitFieldKey, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setProfitDefaultFlags((current) =>
      current[key] ? { ...current, [key]: false } : current,
    );
  };

  const applyProfitDefaults = (
    current: FormState,
    channel: ProfitabilityChannel,
    securityType: FormState["securityType"],
    loanAmount: number,
  ): FormState => {
    const defaults = defaultStringsFor(channel, securityType);
    return {
      ...current,
      channel,
      securityType,
      commissions:
        channel === "online"
          ? "0"
          : profitDefaultFlags.commissions
            ? defaultFor(defaults.commissions, loanAmount)
            : current.commissions,
      otherIncome: profitDefaultFlags.otherIncome
        ? defaultFor(defaults.otherIncome, loanAmount)
        : current.otherIncome,
      expenses: profitDefaultFlags.expenses
        ? defaultFor(defaults.expenses, loanAmount)
        : current.expenses,
    };
  };

  const changeProduct = (productId: string) => {
    const product = products.find((item) => String(item.id) === productId);
    setForm((current) => ({
      ...applyProfitDefaults(
        current,
        current.channel,
        securityForPersonalProduct(product),
        numOrNull(current.loanAmount) ?? 0,
      ),
      productId,
      loanTermMonths: product?.maxTermMonths
        ? String(
            Math.min(
              Number(current.loanTermMonths) || product.maxTermMonths,
              product.maxTermMonths,
            ),
          )
        : current.loanTermMonths,
    }));
  };

  const changeSecurity = (securityType: FormState["securityType"]) => {
    setForm((current) =>
      applyProfitDefaults(
        current,
        current.channel,
        securityType,
        numOrNull(current.loanAmount) ?? 0,
      ),
    );
  };

  const changeStream = (customerStream: FormState["customerStream"]) => {
    setForm((current) => ({
      ...current,
      customerStream,
      existingMember: customerStream !== "new_to_bank",
    }));
    if (customerStream !== "new_to_bank") {
      setSectionOpen("relationship", true);
    }
  };

  const changeChannel = (channel: ProfitabilityChannel) => {
    setForm((current) => {
      if (channel === "online" && current.channel !== "online") {
        commissionBeforeOnlineRef.current = current.commissions;
      }
      const next = applyProfitDefaults(
        current,
        channel,
        current.securityType,
        numOrNull(current.loanAmount) ?? 0,
      );
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
    buildPersonalQuoteRequest({
      form,
      marketRateId: attachedMarketEvidence?.marketRateId ?? null,
      costOfFundsSource,
      profitInputUnit,
      requestedRateForPricing,
    });

  const personalPricingReady = isPersonalLivePricingReady(payload());
  const { loading: calculating, error: calcError } = useDebouncedPricingRequest(
    {
      enabled: personalPricingReady,
      requestKey: pricingRequestKey,
      retryToken: retryTick,
      request: async (signal) => {
        const nextPayload = payload(
          rateScenario.active && rateScenario.rate != null
            ? rateScenario.rate
            : undefined,
        );
        signal.throwIfAborted();
        const data = await calculateDemo("personal", nextPayload);
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

  const save = async () => {
    setSaveError(null);
    dispatchController({ type: "save_started" });
    try {
      const saved = await saveDemoForm(
        "personal",
        payload(),
        revisedFromQuoteId ?? undefined,
        attachedMarketEvidence,
      );
      markClean();
      router.push(`/personal-loans/quote/?id=${saved.id}`);
    } catch (error) {
      setSaveError(demoFormError(error));
      focusDemoIssue(error, {
        sectionFields: PERSONAL_SECTION_FIELDS,
        inputIds: PERSONAL_INPUT_IDS,
        openSection: (section) => setSectionOpen(section, true),
      });
    } finally {
      dispatchController({ type: "save_finished" });
    }
  };

  const selectedProduct = products.find(
    (product) => String(product.id) === form.productId,
  );
  const currentPayload = payload();
  const livePricingReady = isPersonalLivePricingReady(currentPayload);
  const loanComplete =
    form.loanPurpose.trim() !== "" &&
    form.securityType.trim() !== "" &&
    form.loanAmount.trim() !== "" &&
    form.loanTermMonths.trim() !== "";
  const riskAssessed =
    form.customerStream === "retention"
      ? form.currentCustomerRate.trim() !== "" &&
        form.retentionArrearsHardship18Months !== "" &&
        (form.retentionArrearsHardship18Months === "no" ||
          form.retentionArrearsPast12Months !== "")
      : form.creditScores.some((score) => score.trim() !== "") ||
        form.employmentIncomeStability !== "not_assessed";
  const relationshipProvided = form.yearsAsMember.trim() !== "";
  const affordabilityAssessed =
    form.netMonthlyIncome.trim() !== "" &&
    form.monthlyLivingExpenses.trim() !== "";
  const requestedInPlay =
    attachedMarketEvidence != null ||
    form.competitorLender.trim() !== "" ||
    form.competitorRate.trim() !== "" ||
    form.competitorNotes.trim() !== "" ||
    form.requestedRate.trim() !== "";
  const onlineChannel = form.channel === "online";
  const loanAmountNum = numOrNull(form.loanAmount) ?? 0;
  const profitPercentEnabled = loanAmountNum > 0;
  const hasProfitLineValues = [
    onlineChannel ? "" : form.commissions,
    form.otherIncome,
    form.expenses,
    form.expectedCreditLossOverrideAmount.trim() === "0"
      ? ""
      : form.expectedCreditLossOverrideAmount,
  ].some((value) => value.trim() !== "");
  const profitabilityCustom =
    form.channel !== "direct" ||
    form.upfrontFeeOverride.trim() !== "" ||
    form.monthlyFeeOverride.trim() !== "" ||
    form.expectedCreditLossOverrideAmount.trim() !== "0" ||
    form.expectedCreditLossOverrideEnabled ||
    [
      costOfFundsSource === "default" ? "" : form.costOfFunds,
      onlineChannel ? "" : form.commissions,
      form.otherIncome,
      form.expenses,
    ].some((value) => value.trim() !== "");
  const liveSummary = calcError
    ? calcError
    : calculating
      ? "Recalculating pricing..."
      : result
        ? rateScenario.active
          ? `Scenario customer rate ${result.finalDisplayRate.toFixed(2)} percent. Preview only, not saved.`
          : `Suggested rate ${result.suggestedRate.toFixed(2)} percent.`
        : "";

  function switchProfitInputUnit(next: ProfitInputUnit) {
    if (next === profitInputUnit) return;
    if (!profitPercentEnabled) {
      if (hasProfitLineValues) {
        setProfitUnitNotice(
          "Enter loan amount first so existing figures can be converted.",
        );
        return;
      }
      setProfitInputUnit(next);
      setProfitUnitNotice(
        next === "percent"
          ? "Enter loan amount before saving so percentages can be converted."
          : null,
      );
      return;
    }

    setForm((current) => ({
      ...current,
      commissions:
        current.channel === "online"
          ? "0"
          : convertPersonalProfitLineValue(
              current.commissions,
              profitInputUnit,
              next,
              loanAmountNum,
            ),
      otherIncome: convertPersonalProfitLineValue(
        current.otherIncome,
        profitInputUnit,
        next,
        loanAmountNum,
      ),
      expenses: convertPersonalProfitLineValue(
        current.expenses,
        profitInputUnit,
        next,
        loanAmountNum,
      ),
      expectedCreditLossOverrideAmount: convertPersonalProfitLineValue(
        current.expectedCreditLossOverrideAmount,
        profitInputUnit,
        next,
        loanAmountNum,
      ),
    }));
    setProfitInputUnit(next);
    setProfitUnitNotice(null);
  }

  const profitLineInput = (
    id: string,
    value: string,
    onChange: (value: string) => void,
    disabled = false,
  ) =>
    profitInputUnit === "percent" ? (
      <NumberInput
        id={id}
        suffix="% loan"
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
  const sectionItems: QuoteSectionNavItem<PersonalSectionKey>[] = [
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
      key: "affordability",
      id: "quote-section-affordability",
      label: "Repayment affordability",
      statusLabel: affordabilityAssessed ? "Assessed" : "Not assessed",
      state: affordabilityAssessed ? "complete" : "attention",
    },
    {
      key: "requested",
      id: "quote-section-requested",
      label: "Requested pricing",
      statusLabel: requestedInPlay ? "In play" : "Optional",
      state: requestedInPlay ? "complete" : "optional",
    },
    {
      key: "capital",
      id: "quote-section-capital",
      label: "Capital allocation",
      statusLabel: "Capital policy · 100%",
      state: "informational",
    },
    {
      key: "profitability",
      id: "quote-section-profitability",
      label: "Profitability",
      statusLabel: profitabilityCustom ? "Custom" : "Defaults",
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
    calculating,
    resultReady: result != null,
    scenarioActive: rateScenario.active,
    hasPricingError: Boolean(calcError && !result),
  });

  function activateSection(key: PersonalSectionKey, id: string) {
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
        title={header?.title ?? "New Personal Loan Quote"}
        caption={
          header?.caption ?? (
            <>
              Customer-score pricing from loan details, Stream and customer
              assessment, with a{" "}
              <strong className="text-ink">suggested rate</strong>, indicative
              repayment and approval requirement.
            </>
          )
        }
        backHref="/personal-loans"
        backLabel="Personal loan quotes"
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
            href="/market-search/?area=personal"
            className="ml-2 inline-flex min-h-[44px] items-center font-semibold underline underline-offset-2"
          >
            Return to Personal Market Search
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
        <QuoteWorkspaceForm onDirty={markDirty}>
          <QuoteSectionNavigator
            items={sectionItems}
            onActivate={activateSection}
            readinessLabel={saveReadiness}
          />
          <OpeningContextCard
            customerStream={form.customerStream}
            onCustomerStreamChange={changeStream}
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
              htmlFor="pl-customer"
              className="block pt-4 text-sm font-semibold text-ink @2xl:py-5"
            >
              Customer name or reference
            </label>
            <div className="min-w-0 pb-6 pt-2 @2xl:py-5">
              <input
                id="pl-customer"
                className={inputClass}
                value={form.customerReference}
                onChange={(e) => set("customerReference", e.target.value)}
                placeholder="e.g. J. Citizen"
              />
              <p className="mt-1.5 text-xs text-faint">
                Optional. Use a reference, not sensitive personal details, if
                one is available.
              </p>
            </div>
          </div>

          <PersonalLoanDetailsSection
            form={form}
            products={products}
            selectedProduct={selectedProduct}
            complete={loanComplete}
            open={openSections.loan}
            onToggle={(open) => setSectionOpen("loan", open)}
            set={set}
            onProductChange={changeProduct}
            onSecurityChange={changeSecurity}
          />

          <PersonalRiskSection
            form={form}
            assessed={riskAssessed}
            open={openSections.risk}
            onToggle={(open) => setSectionOpen("risk", open)}
            set={set}
          />

          {form.customerStream !== "new_to_bank" && (
            <PersonalRelationshipSection
              yearsAsMember={form.yearsAsMember}
              provided={relationshipProvided}
              open={openSections.relationship}
              onToggle={(open) => setSectionOpen("relationship", open)}
              set={set}
            />
          )}

          <PersonalAffordabilitySection
            form={form}
            assessed={affordabilityAssessed}
            open={openSections.affordability}
            onToggle={(open) => setSectionOpen("affordability", open)}
            set={set}
          />

          <PersonalRequestedPricingSection
            form={form}
            requestedInPlay={requestedInPlay}
            marketEvidence={attachedMarketEvidence}
            open={openSections.requested}
            onToggle={(open) => setSectionOpen("requested", open)}
            set={set}
            onDetachMarketEvidence={() => setAttachedMarketEvidence(null)}
          />

          <PersonalCapitalSection
            form={form}
            capitalAllocation={result?.profitability.capitalAllocation ?? null}
            canOverride={canOverrideCapital}
            open={openSections.capital}
            onToggle={(open) => setSectionOpen("capital", open)}
            set={set}
          />

          <CollapsibleSection
            id="quote-section-profitability"
            layout="hanging"
            title="Profitability"
            chip={
              profitabilityCustom ? (
                <StatusText tone="info">Custom</StatusText>
              ) : (
                <StatusText tone="muted">Defaults</StatusText>
              )
            }
            open={openSections.profitability}
            onToggle={(o) => setSectionOpen("profitability", o)}
          >
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <p className="max-w-prose text-xs text-muted">
                Optional P&amp;L inputs. Blank lines use personal-loan defaults
                by security and channel; tax is derived.{" "}
                {profitInputUnit === "percent"
                  ? "Line items are a % of loan amount."
                  : "Line items are annual dollar figures."}
              </p>
              <SegmentedControl
                ariaLabel="Personal profitability input units"
                value={profitInputUnit}
                onChange={(value) => switchProfitInputUnit(value)}
                options={[
                  { value: "dollar", label: "$" },
                  {
                    value: "percent",
                    label: "%",
                    title: profitPercentEnabled
                      ? "Enter each line as a % of loan amount"
                      : "Enter loan amount first to convert existing figures",
                  },
                ]}
              />
            </div>
            {profitUnitNotice && (
              <p className="mb-3 rounded-md border border-info/25 bg-info-soft px-3 py-2 text-sm text-info">
                {profitUnitNotice}
              </p>
            )}
            <div className="grid gap-4 @md:grid-cols-2">
              <Field
                label="Cost of funds"
                htmlFor="pl-cost-funds"
                helper={
                  costOfFundsSource === "default"
                    ? displayedCostOfFunds.trim() !== ""
                      ? "Configured margin default — type to override."
                      : "Percentage p.a. No configured margin default is available."
                    : "Percentage p.a. Clear the field to restore the configured margin default."
                }
              >
                <RateInput
                  id="pl-cost-funds"
                  value={displayedCostOfFunds}
                  onChange={changeCostOfFunds}
                />
              </Field>
              <Field
                label="Commission cost"
                htmlFor="pl-commissions"
                helper={
                  form.channel === "online"
                    ? "Online channel has no commission cost."
                    : profitInputUnit === "percent"
                      ? "Percentage of loan amount. Leave blank to use the channel default."
                      : "Annual dollars. Leave blank to use the channel default."
                }
              >
                {profitLineInput(
                  "pl-commissions",
                  form.channel === "online" ? "0" : form.commissions,
                  (v) => setProfitLine("commissions", v),
                  form.channel === "online",
                )}
              </Field>
              <Field
                label="Other income"
                htmlFor="pl-other-income"
                helper={
                  profitInputUnit === "percent"
                    ? "Percentage of loan amount. Leave blank to use the channel default."
                    : "Annual dollars. Leave blank to use the channel default."
                }
              >
                {profitLineInput("pl-other-income", form.otherIncome, (v) =>
                  setProfitLine("otherIncome", v),
                )}
              </Field>
              <Field
                label="Expenses"
                htmlFor="pl-profit-expenses"
                helper={
                  profitInputUnit === "percent"
                    ? "Percentage of loan amount. Leave blank to use the secured/unsecured default."
                    : "Annual dollars. Leave blank to use the secured/unsecured default."
                }
              >
                {profitLineInput("pl-profit-expenses", form.expenses, (v) =>
                  setProfitLine("expenses", v),
                )}
              </Field>
            </div>
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
                idPrefix="personal"
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
                  selectedProduct
                    ? personalProductFeeItems(selectedProduct)
                    : []
                }
              />
            </div>
          </CollapsibleSection>

          <PersonalNotesSection
            notes={form.notes}
            open={openSections.notes}
            onToggle={(open) => setSectionOpen("notes", open)}
            set={set}
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
          actionHintId="personal-save-readiness"
          actions={
            <Button
              variant="primary"
              className="w-full"
              onClick={() => {
                void save();
              }}
              disabled={!result || saving || rateScenario.active}
              aria-describedby="personal-save-readiness"
              title={
                saveReadiness === "Ready to save" ? undefined : saveReadiness
              }
            >
              <Save size={15} strokeWidth={2} aria-hidden />
              {saving ? "Saving…" : saveLabel}
            </Button>
          }
          actionHint={
            saveReadiness === "Ready to save"
              ? "Ready to save. The record will capture available inputs, suggested rate, breakdown, approval and warnings for audit."
              : saveReadiness
          }
        >
          {result ? (
            <PersonalResultPanel
              result={result}
              dense
              scenarioActive={rateScenario.active}
              scenarioBaseline={rateScenario.baselineResult}
              scenarioControl={scenarioControl}
            />
          ) : (
            <EmptyState
              title={calculating ? "Calculating pricing" : "No pricing yet"}
              body={
                livePricingReady
                  ? "Pricing will appear automatically from the populated loan and borrower details."
                  : "Enter the loan amount and term to see the customer score, suggested rate, repayments and affordability."
              }
            />
          )}
        </QuoteWorkspaceRail>
      </QuoteWorkspaceLayout>
    </div>
  );
}
