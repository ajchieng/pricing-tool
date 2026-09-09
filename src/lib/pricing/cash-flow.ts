export interface MonthlyAmortisationRow {
  month: number;
  openingBalance: number;
  payment: number;
  interest: number;
  principal: number;
  closingBalance: number;
  fundingCost: number | null;
}

export interface AmortisingCashFlowSummary {
  method: "scheduled_declining_balance";
  horizonMonths: number;
  scheduledPayment: number;
  openingBalance: number;
  closingBalance: number;
  averageOutstandingBalance: number;
  principalRepaid: number;
  interestRevenue: number;
  fundingCost: number | null;
  netInterestIncome: number | null;
  schedule: MonthlyAmortisationRow[];
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function scheduledMonthlyPayment(
  principal: number,
  annualRatePct: number,
  termMonths: number,
): number {
  if (!(principal > 0) || !(termMonths > 0)) return 0;
  const monthlyRate = annualRatePct / 100 / 12;
  if (monthlyRate === 0) return principal / termMonths;
  const factor = (1 + monthlyRate) ** termMonths;
  return (principal * monthlyRate * factor) / (factor - 1);
}

export function amortisingCashFlow(input: {
  principal: number;
  annualCustomerRatePct: number;
  annualFundingRatePct?: number | null;
  termMonths: number;
  horizonMonths?: number;
}): AmortisingCashFlowSummary {
  if (
    !Number.isFinite(input.principal) ||
    input.principal <= 0 ||
    !Number.isFinite(input.annualCustomerRatePct) ||
    input.annualCustomerRatePct < 0 ||
    !Number.isInteger(input.termMonths) ||
    input.termMonths <= 0
  ) {
    throw new Error(
      "A positive principal, non-negative rate and term are required.",
    );
  }
  if (
    input.annualFundingRatePct != null &&
    (!Number.isFinite(input.annualFundingRatePct) ||
      input.annualFundingRatePct < 0)
  ) {
    throw new Error(
      "Funding rate must be null or a non-negative finite number.",
    );
  }

  const horizonMonths = Math.min(
    input.termMonths,
    Math.max(1, Math.trunc(input.horizonMonths ?? 12)),
  );
  const payment = scheduledMonthlyPayment(
    input.principal,
    input.annualCustomerRatePct,
    input.termMonths,
  );
  const customerMonthlyRate = input.annualCustomerRatePct / 100 / 12;
  const fundingMonthlyRate =
    input.annualFundingRatePct == null
      ? null
      : input.annualFundingRatePct / 100 / 12;
  const schedule: MonthlyAmortisationRow[] = [];
  let balance = input.principal;

  for (let month = 1; month <= horizonMonths; month += 1) {
    const openingBalance = balance;
    const interest = openingBalance * customerMonthlyRate;
    const actualPayment = Math.min(payment, openingBalance + interest);
    const principal = Math.max(0, actualPayment - interest);
    balance = Math.max(0, openingBalance - principal);
    schedule.push({
      month,
      openingBalance: roundMoney(openingBalance),
      payment: roundMoney(actualPayment),
      interest: roundMoney(interest),
      principal: roundMoney(principal),
      closingBalance: roundMoney(balance),
      fundingCost:
        fundingMonthlyRate == null
          ? null
          : roundMoney(openingBalance * fundingMonthlyRate),
    });
  }

  const interestRevenue = roundMoney(
    schedule.reduce((sum, row) => sum + row.interest, 0),
  );
  const fundingCost =
    fundingMonthlyRate == null
      ? null
      : roundMoney(
          schedule.reduce((sum, row) => sum + (row.fundingCost ?? 0), 0),
        );
  const averageOutstandingBalance = roundMoney(
    schedule.reduce((sum, row) => sum + row.openingBalance, 0) /
      schedule.length,
  );
  const closingBalance = schedule.at(-1)?.closingBalance ?? input.principal;

  return {
    method: "scheduled_declining_balance",
    horizonMonths,
    scheduledPayment: roundMoney(payment),
    openingBalance: roundMoney(input.principal),
    closingBalance,
    averageOutstandingBalance,
    principalRepaid: roundMoney(input.principal - closingBalance),
    interestRevenue,
    fundingCost,
    netInterestIncome:
      fundingCost == null ? null : roundMoney(interestRevenue - fundingCost),
    schedule,
  };
}
