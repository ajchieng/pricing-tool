import type { ProfitabilityChannel } from "@/lib/pricing/types";
import type { PersonalProductSecurityType } from "@/lib/pricing/personal/types";
import type { CommercialFacilityType } from "@/lib/pricing/commercial/types";

// Admin-governed per-channel defaults for the profitability line items,
// expressed as % of loan amount (commercial: % of profitability exposure) p.a.
// They pre-fill the quote form visibly and are overridable per quote. The home
// calculator never applies them server-side; the personal and commercial
// engines resolve blank line items from them at calculation time. Saved quotes
// always store explicit dollar values as the complete audit record.

export interface ProfitabilityDefaultValues {
  commissionsPct: number | null;
  otherIncomePct: number | null;
  expensesPct: number | null;
}

export type ProfitabilityDefaultsByChannel = Partial<
  Record<ProfitabilityChannel, ProfitabilityDefaultValues>
>;

export type PersonalProfitabilityDefaultsByChannelAndSecurity = Partial<
  Record<
    `${ProfitabilityChannel}:${PersonalProductSecurityType}`,
    ProfitabilityDefaultValues
  >
>;

export type CommercialProfitabilityDefaultsByChannelAndFacility = Partial<
  Record<
    `${ProfitabilityChannel}:${CommercialFacilityType}`,
    ProfitabilityDefaultValues
  >
>;

export interface ProfitabilityDefaultRow extends ProfitabilityDefaultValues {
  channel: string;
  active: boolean;
}

export interface PersonalProfitabilityDefaultRow extends ProfitabilityDefaultValues {
  channel: string;
  securityType: string;
  active: boolean;
}

export interface CommercialProfitabilityDefaultRow extends ProfitabilityDefaultValues {
  channel: string;
  facilityType: string;
  active: boolean;
}

function isProfitabilityChannel(value: string): value is ProfitabilityChannel {
  return value === "broker" || value === "online" || value === "direct";
}

function isPersonalProductSecurityType(
  value: string,
): value is PersonalProductSecurityType {
  return value === "secured" || value === "unsecured";
}

function isCommercialFacilityType(
  value: string,
): value is CommercialFacilityType {
  return (
    value === "term_loan" ||
    value === "overdraft" ||
    value === "equipment_finance" ||
    value === "commercial_property"
  );
}

/**
 * Map DB rows to the per-channel defaults shape consumed by the quote form.
 * Inactive rows and unknown channels are dropped; the online channel never
 * carries a commissions default (online commissions are forced to 0).
 */
export function rowsToDefaultsByChannel(
  rows: ProfitabilityDefaultRow[],
): ProfitabilityDefaultsByChannel {
  const byChannel: ProfitabilityDefaultsByChannel = {};
  for (const row of rows) {
    if (!row.active || !isProfitabilityChannel(row.channel)) continue;
    byChannel[row.channel] = {
      commissionsPct: row.channel === "online" ? null : row.commissionsPct,
      otherIncomePct: row.otherIncomePct,
      expensesPct: row.expensesPct,
    };
  }
  return byChannel;
}

export function rowsToPersonalDefaultsByChannelAndSecurity(
  rows: PersonalProfitabilityDefaultRow[],
): PersonalProfitabilityDefaultsByChannelAndSecurity {
  const defaults: PersonalProfitabilityDefaultsByChannelAndSecurity = {};
  for (const row of rows) {
    if (
      !row.active ||
      !isProfitabilityChannel(row.channel) ||
      !isPersonalProductSecurityType(row.securityType)
    ) {
      continue;
    }
    defaults[`${row.channel}:${row.securityType}`] = {
      commissionsPct: row.channel === "online" ? null : row.commissionsPct,
      otherIncomePct: row.otherIncomePct,
      expensesPct: row.expensesPct,
    };
  }
  return defaults;
}

export function rowsToCommercialDefaultsByChannelAndFacility(
  rows: CommercialProfitabilityDefaultRow[],
): CommercialProfitabilityDefaultsByChannelAndFacility {
  const defaults: CommercialProfitabilityDefaultsByChannelAndFacility = {};
  for (const row of rows) {
    if (
      !row.active ||
      !isProfitabilityChannel(row.channel) ||
      !isCommercialFacilityType(row.facilityType)
    ) {
      continue;
    }
    defaults[`${row.channel}:${row.facilityType}`] = {
      commissionsPct: row.channel === "online" ? null : row.commissionsPct,
      otherIncomePct: row.otherIncomePct,
      expensesPct: row.expensesPct,
    };
  }
  return defaults;
}

export interface ProfitabilityDefaultFieldStrings {
  commissions: string;
  otherIncome: string;
  expenses: string;
}

/**
 * The channel's default pct values as form-state strings ("" = no default for
 * that line item).
 */
export function defaultFieldStrings(
  defaults: ProfitabilityDefaultsByChannel,
  channel: ProfitabilityChannel,
): ProfitabilityDefaultFieldStrings {
  const d = defaults[channel];
  const text = (v: number | null | undefined) => (v == null ? "" : String(v));
  return {
    commissions: text(d?.commissionsPct),
    otherIncome: text(d?.otherIncomePct),
    expenses: text(d?.expensesPct),
  };
}

export function personalDefaultFieldStrings(
  defaults: PersonalProfitabilityDefaultsByChannelAndSecurity,
  channel: ProfitabilityChannel,
  securityType: PersonalProductSecurityType,
): ProfitabilityDefaultFieldStrings {
  const d = defaults[`${channel}:${securityType}`];
  const text = (v: number | null | undefined) => (v == null ? "" : String(v));
  return {
    commissions: text(d?.commissionsPct),
    otherIncome: text(d?.otherIncomePct),
    expenses: text(d?.expensesPct),
  };
}

export function commercialDefaultFieldStrings(
  defaults: CommercialProfitabilityDefaultsByChannelAndFacility,
  channel: ProfitabilityChannel,
  facilityType: CommercialFacilityType,
): ProfitabilityDefaultFieldStrings {
  const d = defaults[`${channel}:${facilityType}`];
  const text = (v: number | null | undefined) => (v == null ? "" : String(v));
  return {
    commissions: text(d?.commissionsPct),
    otherIncome: text(d?.otherIncomePct),
    expenses: text(d?.expensesPct),
  };
}
