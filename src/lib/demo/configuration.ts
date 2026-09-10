import { ZodError } from "zod";

/** Browser-local policy publication. All configuration and audit writes are atomic. */
import * as seeds from "./policy-seeds";
import {
  configurationSchemas,
  validateConfigurationData,
  type DemoConfigurationTable,
  type DemoConfigurationTarget,
} from "./configuration-validation";
import type { DemoArea } from "./types";
import type { CustomerScoreModelConfig } from "@/lib/pricing/types";
import type { ExpectedLossPolicyConfig } from "@/lib/pricing/credit-risk/policy-validation";
import {
  demoConfigurationProposals,
  type DemoConfigurationProposal,
} from "./configuration-governance";
import { homeRiskContract } from "@/lib/pricing/credit-risk/home";
import {
  PERSONAL_CREDIT_RISK_FIELDS,
  PERSONAL_RISK_FACT_DERIVATION_CONFIG,
  PERSONAL_RISK_FACT_DERIVATION_VERSION,
} from "@/lib/pricing/credit-risk/personal";
import {
  COMMERCIAL_CREDIT_RISK_FIELDS,
  COMMERCIAL_RISK_FACT_DERIVATION_VERSION,
} from "@/lib/pricing/credit-risk/commercial";
import { riskDefinitionHash } from "@/lib/pricing/credit-risk/risk-definition-hash";
export type {
  DemoConfigurationTable,
  DemoConfigurationTarget,
} from "./configuration-validation";
export type DemoConfigurationRow = { id: number; [key: string]: unknown };
export interface DemoConfiguration {
  schemaVersion: 1;
  version: number;
  updatedAt: string;
  tables: Record<DemoConfigurationTable, DemoConfigurationRow[]>;
  scoreModels: Record<DemoArea, CustomerScoreModelConfig>;
  expectedLossPolicies: Record<DemoArea, ExpectedLossPolicyConfig>;
  proposals: DemoConfigurationProposal[];
}
export interface DemoConfigurationHistoryInput {
  targetType: string;
  action: string;
  targetId: number | null;
  reason: string;
  before: unknown;
  after: unknown;
}
export interface DemoConfigurationHistory extends DemoConfigurationHistoryInput {
  id: string;
  version: number;
  createdAt: string;
  actorName: string;
}
export interface DemoConfigurationMutation {
  expectedVersion: number;
  targetType: DemoConfigurationTarget;
  action: "create" | "update" | "delete";
  targetId?: number | null;
  data: Record<string, unknown>;
  reason: string;
}
export class DemoConfigurationError extends Error {
  constructor(
    public readonly code:
      | "unavailable"
      | "blocked"
      | "storage_full"
      | "storage_failure"
      | "unsupported_version"
      | "corrupt_data"
      | "stale_configuration"
      | "invalid_configuration",
    message: string,
  ) {
    super(message);
    this.name = "DemoConfigurationError";
  }
}
export const DEMO_CONFIGURATION_DATABASE_NAME =
  "pricing-portfolio-configuration";
const AREAS: DemoArea[] = ["home", "personal", "commercial"];
const FACILITIES = [
  "term_loan",
  "overdraft",
  "equipment_finance",
  "commercial_property",
] as const;
const TABLES = Object.keys(configurationSchemas).filter(
  (key) => key !== "score_model" && key !== "expected_loss_policy",
) as DemoConfigurationTable[];
const singletonTables = new Set<DemoConfigurationTable>([
  "capital_allocation_setting",
  "quote_fee_setting",
  "workspace_display_setting",
  "commercial_approval_setting",
]);
const productRelations: Partial<
  Record<DemoConfigurationTable, [DemoConfigurationTable, string][]>
> = {
  product: [
    ["product_rate", "productId"],
    ["margin_setting", "productId"],
    ["pricing_adjustment_rule", "appliesToProductId"],
  ],
  personal_loan_product: [
    ["personal_loan_product_rate", "productId"],
    ["personal_margin_setting", "personalProductId"],
  ],
  commercial_loan_product: [
    ["commercial_loan_product_rate", "productId"],
    ["commercial_margin_setting", "commercialProductId"],
  ],
};
function clone<T>(value: T): T {
  return structuredClone(value);
}
function freeze<T>(value: T): T {
  if (value && typeof value === "object") {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}
export function createDemoConfigurationSeed(): DemoConfiguration {
  const tables = Object.fromEntries(
    TABLES.map((key) => [key, []]),
  ) as unknown as DemoConfiguration["tables"];
  tables.product = seeds
    .getDemoFormConfig("home")
    .products.map((row) => ({ ...row, productCategory: row.name }));
  tables.product_rate = seeds.homeRates.map((row) => ({
    ...row,
    effectiveFrom: "2026-01-01T00:00:00.000Z",
    effectiveTo: null,
  }));
  tables.margin_setting = seeds.homeMargins.map((row) => ({ ...row }));
  tables.approval_rule = seeds
    .homeConfigFor(
      seeds.sampleInput("home") as Parameters<typeof seeds.homeConfigFor>[0],
    )
    .approvalRules.map((row) => ({ ...row }));
  tables.profitability_default = seeds.homeProfitabilityDefaults.map((row) => ({
    ...row,
  }));
  tables.personal_loan_product = seeds.personalProducts.map(
    ({
      fees,
      cardedRate,
      comparisonRate,
      selectedRateId,
      pricingRole,
      ...row
    }) => {
      void cardedRate;
      void comparisonRate;
      void selectedRateId;
      void pricingRole;
      return { ...row, id: row.id!, ...fees };
    },
  );
  tables.personal_loan_product_rate = seeds.personalProducts.map((row) => ({
    id: row.selectedRateId!,
    productId: row.id,
    cardedRate: row.cardedRate,
    comparisonRate: row.comparisonRate,
    pricingRole: row.pricingRole,
    active: true,
    effectiveFrom: "2026-01-01T00:00:00.000Z",
    effectiveTo: null,
  }));
  tables.personal_margin_setting = seeds.personalMargins.map((row) => ({
    ...row,
  }));
  tables.personal_approval_rule = seeds
    .personalConfigFor(
      seeds.sampleInput("personal") as Parameters<
        typeof seeds.personalConfigFor
      >[0],
    )
    .approvalRules.map((row) => ({ ...row }));
  tables.personal_profitability_default = seeds.personalDefaults.map((row) => ({
    ...row,
  }));
  for (const facilityType of FACILITIES) {
    const config = seeds.commercialConfigFor({ facilityType });
    tables.commercial_loan_product.push({
      id: config.productId!,
      name: config.baseRates[facilityType].standard.label,
      facilityType,
      baseRateName: config.baseRates[facilityType].standard.baseRateName,
      ...config.productLimits,
      establishmentFeePct: config.fees.establishmentFeePct,
      establishmentFeeMin: config.fees.establishmentFeeMin,
      annualLineFeePct: config.fees.overdraftLineFeePct,
      documentationFee: config.fees.equipmentDocumentationFee,
      active: true,
      sourceUrl: null,
      notes: seeds.DEMO_POLICY_NOTICE,
    });
    for (const loanType of ["standard", "non_standard"] as const) {
      const rate = config.baseRates[facilityType][loanType];
      tables.commercial_loan_product_rate.push({
        id: rate.selectedRateId!,
        productId: config.productId,
        loanType,
        baseRate: rate.rate,
        pricingRole: rate.pricingRole,
        active: true,
        effectiveFrom: "2026-01-01T00:00:00.000Z",
        effectiveTo: null,
      });
    }
    tables.commercial_margin_setting.push({
      id: config.marginSettingIds![0],
      commercialProductId: config.productId,
      facilityType,
      ...config.marginPolicy,
      active: true,
    });
  }
  const commercial = seeds.commercialConfigFor({ facilityType: "term_loan" });
  tables.commercial_approval_setting = [
    {
      id: 3401,
      name: "Illustrative commercial policy thresholds",
      ...commercial.approval,
      dscrStrongMin: commercial.dscrBands.strongMin,
      dscrAcceptableMin: commercial.dscrBands.acceptableMin,
      customerConcentrationThresholdPct:
        commercial.customerConcentrationThresholdPct,
      active: true,
    },
  ];
  tables.commercial_profitability_default = seeds.commercialDefaults.map(
    (row) => ({ ...row }),
  );
  tables.capital_allocation_setting = [
    { id: 1, capitalRatioPct: seeds.DEMO_CAPITAL_RATIO_PCT },
  ];
  tables.quote_fee_setting = AREAS.map((vertical, index) => ({
    id: index + 1,
    vertical,
    standardUpfrontFee: seeds.demoQuoteFees[vertical].standardUpfrontFee,
    monthlyFee: seeds.demoQuoteFees[vertical].monthlyFee,
  }));
  tables.workspace_display_setting = [
    {
      id: 1,
      showQuoteHandoffStatus: true,
      highContrast: false,
      comfortableDensity: false,
      largeNumericDisplay: false,
      simpleMode: false,
    },
  ];
  tables.market_source_setting = [
    "Riverbank Demo",
    "Horizon Demo",
    "Summit Demo",
  ].map((name, index) => ({
    id: index + 1,
    name,
    enabledHome: true,
    enabledPersonal: true,
    enabledCommercial: true,
  }));
  return clone({
    schemaVersion: 1,
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    tables,
    scoreModels: Object.fromEntries(
      AREAS.map((area) => [area, seeds.getDemoPolicy(area).scoreModel]),
    ) as DemoConfiguration["scoreModels"],
    expectedLossPolicies: seeds.demoExpectedLossPolicies,
    proposals: demoConfigurationProposals(),
  });
}
let current = freeze(createDemoConfigurationSeed());
let database: Promise<IDBDatabase> | undefined;
let activeDatabase: IDBDatabase | undefined;
let initialized = false;
let lastError: Error | null = null;
const listeners = new Set<() => void>();
let channel: BroadcastChannel | undefined;
let listening = false;
export function getDemoConfiguration(): DemoConfiguration {
  return current;
}
export function getDemoConfigurationError(): Error | null {
  return lastError;
}
function announce(broadcast = false) {
  for (const listener of listeners) {
    try {
      listener();
    } catch {
      /* A view cannot undo a committed write. */
    }
  }
  if (broadcast) {
    try {
      channel?.postMessage("changed");
      if (typeof window !== "undefined")
        window.localStorage.setItem(
          `${DEMO_CONFIGURATION_DATABASE_NAME}:changed`,
          `${Date.now()}:${Math.random()}`,
        );
    } catch {
      /* IndexedDB remains authoritative when localStorage is unavailable. */
    }
  }
}
function publish(next: DemoConfiguration, broadcast = false) {
  if (initialized && next.version < current.version) return;
  current = freeze(clone(next));
  initialized = true;
  lastError = null;
  announce(broadcast);
}
async function refresh() {
  try {
    const db = await openDatabase();
    const tx = db.transaction("configuration", "readonly");
    const stored = await request(tx.objectStore("configuration").get("state"));
    if (stored) publish(validateStored(stored));
  } catch (error) {
    lastError = storageError(error);
    announce();
  }
}
function connect() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  if (typeof BroadcastChannel !== "undefined") {
    channel = new BroadcastChannel(DEMO_CONFIGURATION_DATABASE_NAME);
    channel.onmessage = () => void refresh();
  }
  window.addEventListener("storage", (event) => {
    if (event.key === `${DEMO_CONFIGURATION_DATABASE_NAME}:changed`)
      void refresh();
  });
  window.addEventListener("focus", () => void refresh());
}
export function subscribeDemoConfiguration(listener: () => void) {
  listeners.add(listener);
  connect();
  return () => {
    listeners.delete(listener);
  };
}
function validationError(error: ZodError): DemoConfigurationError {
  const labels: Record<string, string> = {
    lvrMin: "Minimum LVR",
    lvrMax: "Maximum LVR",
    cardedRate: "Carded rate",
    baseRate: "Base rate",
    capitalRatioPct: "Capital ratio",
    minLoanAmount: "Minimum loan amount",
    maxLoanAmount: "Maximum loan amount",
  };
  const message = error.issues
    .slice(0, 3)
    .map((issue) => {
      const key = String(issue.path.at(-1) ?? "Configuration");
      const words = key
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replaceAll("_", " ")
        .toLowerCase();
      const field =
        labels[key] ?? words.charAt(0).toUpperCase() + words.slice(1);
      if (issue.code === "too_small" && issue.origin === "number")
        return `${field} must be ${issue.inclusive ? "at least" : "greater than"} ${issue.minimum}.`;
      if (issue.code === "too_big" && issue.origin === "number")
        return `${field} must be ${issue.inclusive ? "at most" : "less than"} ${issue.maximum}.`;
      if (issue.code === "invalid_type" && issue.expected === "number")
        return `${field} must be a valid number.`;
      return `${field}: ${issue.message.replace(/\.$/, "")}.`;
    })
    .join(" ");
  return new DemoConfigurationError("invalid_configuration", message);
}

function storageError(error: unknown): DemoConfigurationError {
  if (error instanceof DemoConfigurationError) return error;
  const name = error instanceof Error ? error.name : "";
  if (name === "QuotaExceededError")
    return new DemoConfigurationError(
      "storage_full",
      "Browser storage is full. The policy change was not saved.",
    );
  if (name === "VersionError")
    return new DemoConfigurationError(
      "unsupported_version",
      "This browser has configuration from a newer demo. Reload the latest app before continuing.",
    );
  if (name === "SecurityError" || name === "InvalidStateError")
    return new DemoConfigurationError(
      "unavailable",
      "Browser configuration storage is unavailable. Enable site storage and retry.",
    );
  return new DemoConfigurationError(
    "storage_failure",
    "Browser configuration could not be read or saved. Existing policy has not been replaced.",
  );
}
function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
function finished(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () =>
      reject(
        tx.error ??
          new DemoConfigurationError(
            "storage_failure",
            "Configuration transaction was cancelled.",
          ),
      );
    tx.onerror = () => reject(tx.error);
  });
}
function openDatabase(): Promise<IDBDatabase> {
  connect();
  database ??= new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(
        new DemoConfigurationError(
          "unavailable",
          "This browser does not support browser storage for configuration.",
        ),
      );
      return;
    }
    const req = indexedDB.open(DEMO_CONFIGURATION_DATABASE_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      db.createObjectStore("configuration");
      db.createObjectStore("history", { keyPath: "id" });
    };
    req.onblocked = () =>
      reject(
        new DemoConfigurationError(
          "blocked",
          "Close other demo tabs, then retry opening configuration.",
        ),
      );
    req.onerror = () => reject(storageError(req.error));
    req.onsuccess = () => {
      activeDatabase = req.result;
      activeDatabase.onversionchange = () => {
        activeDatabase?.close();
        activeDatabase = undefined;
        database = undefined;
        initialized = false;
      };
      resolve(req.result);
    };
  }).catch((error) => {
    database = undefined;
    throw storageError(error);
  });
  return database;
}
function validateStored(value: unknown): DemoConfiguration {
  if (!value || typeof value !== "object")
    throw new DemoConfigurationError(
      "corrupt_data",
      "Saved configuration is invalid. Reset the demo to restore fictional defaults.",
    );
  const state = value as DemoConfiguration;
  if (state.schemaVersion !== 1)
    throw new DemoConfigurationError(
      "unsupported_version",
      "Saved configuration uses an unsupported version. Update the app or reset the demo.",
    );
  if (
    !Number.isSafeInteger(state.version) ||
    state.version < 1 ||
    !state.tables ||
    !state.scoreModels ||
    !state.expectedLossPolicies ||
    !Array.isArray(state.proposals)
  )
    throw new DemoConfigurationError(
      "corrupt_data",
      "Saved configuration is incomplete. Reset the demo to restore fictional defaults.",
    );
  try {
    const proposalIds = new Set<string>();
    for (const proposal of state.proposals) {
      if (
        !proposal ||
        typeof proposal !== "object" ||
        typeof proposal.id !== "string" ||
        !proposal.id ||
        proposalIds.has(proposal.id) ||
        !["pending", "scheduled", "approved", "rejected"].includes(
          proposal.status,
        ) ||
        typeof proposal.summary !== "string" ||
        typeof proposal.reason !== "string" ||
        typeof proposal.proposedByName !== "string" ||
        typeof proposal.decisionNotes !== "string" ||
        !Number.isFinite(Date.parse(proposal.proposedAt)) ||
        (proposal.decidedAt !== null &&
          !Number.isFinite(Date.parse(proposal.decidedAt))) ||
        (proposal.effectiveAt !== null &&
          !Number.isFinite(Date.parse(proposal.effectiveAt))) ||
        (proposal.status === "scheduled" && !proposal.effectiveAt) ||
        !proposal.mutation ||
        !(proposal.mutation.targetType in configurationSchemas) ||
        !["create", "update", "delete"].includes(proposal.mutation.action) ||
        typeof proposal.mutation.reason !== "string"
      )
        throw new Error("Invalid stored configuration proposal");
      proposalIds.add(proposal.id);
      if (proposal.mutation.action !== "delete")
        validateConfigurationData(
          proposal.mutation.targetType,
          proposal.mutation.data,
        );
      if (
        proposal.mutation.action !== "create" &&
        (!Number.isSafeInteger(proposal.mutation.targetId) ||
          Number(proposal.mutation.targetId) < 1)
      )
        throw new Error("Invalid proposal target");
    }
    for (const table of TABLES) {
      if (!Array.isArray(state.tables[table]))
        throw new Error("Missing policy table");
      for (const row of state.tables[table]) {
        const { id, ...data } = row;
        if (!Number.isSafeInteger(id) || id < 1)
          throw new Error("Invalid row identity");
        validateConfigurationData(table, data);
      }
    }
    for (const area of AREAS) {
      const model = state.scoreModels[area];
      validateConfigurationData("score_model", {
        productArea: area,
        name: model.name,
        description: model.description ?? null,
        modelJson: {
          factors: model.factors,
          bands: model.bands,
          rateCurve: model.rateCurve,
        },
      });
      const policy = state.expectedLossPolicies[area];
      policy.effectiveFrom = new Date(policy.effectiveFrom);
      policy.effectiveTo = policy.effectiveTo
        ? new Date(policy.effectiveTo)
        : null;
      if (
        !Number.isSafeInteger(model.version) ||
        model.version < 1 ||
        model.productArea !== area
      )
        throw new Error("Invalid score-model identity");
      const withoutIds = (rows: { id: number | null }[]) =>
        rows.map(({ id, ...data }) => {
          void id;
          return data;
        });
      validateConfigurationData("expected_loss_policy", {
        vertical: policy.vertical,
        version: policy.version,
        name: policy.name,
        description: policy.description,
        compatibleRiskDefinitionHash: policy.compatibleRiskDefinitionHash,
        sourceScoreModelArea: policy.sourceScoreModelArea,
        sourceScoreModelVersion: policy.sourceScoreModelVersion,
        effectiveFrom: policy.effectiveFrom.toISOString(),
        effectiveTo: policy.effectiveTo?.toISOString() ?? null,
        active: policy.active,
        pdBands: withoutIds(policy.pdBands),
        lgdBands: withoutIds(policy.lgdBands),
        eadSettings: withoutIds(policy.eadSettings),
      });
    }
    validateRelations(state);
  } catch {
    throw new DemoConfigurationError(
      "corrupt_data",
      "Saved configuration did not pass validation. Reset the demo to restore fictional defaults.",
    );
  }
  return state;
}
export async function initializeDemoConfiguration(): Promise<DemoConfiguration> {
  if (initialized) return current;
  try {
    const db = await openDatabase();
    const tx = db.transaction(["configuration", "history"], "readwrite");
    const done = finished(tx);
    const stored = await request(tx.objectStore("configuration").get("state"));
    const next = stored
      ? validateStored(stored)
      : createDemoConfigurationSeed();
    if (!stored) tx.objectStore("configuration").put(next, "state");
    await done;
    publish(next);
    return current;
  } catch (error) {
    lastError = storageError(error);
    throw lastError;
  }
}
export async function readDemoConfigurationHistory(): Promise<
  DemoConfigurationHistory[]
> {
  await initializeDemoConfiguration();
  const db = await openDatabase();
  const tx = db.transaction("history", "readonly");
  return (
    (await request(
      tx.objectStore("history").getAll(),
    )) as DemoConfigurationHistory[]
  ).sort(
    (a, b) => b.version - a.version || b.createdAt.localeCompare(a.createdAt),
  );
}
function validateRelations(state: DemoConfiguration) {
  for (const [parent, relations] of Object.entries(productRelations))
    for (const [child, field] of relations!)
      for (const row of state.tables[child]) {
        if (child.endsWith("_rate") && !Number.isSafeInteger(row[field]))
          throw new Error("Choose an existing product for this rate.");
        if (
          row[field] != null &&
          !state.tables[parent as DemoConfigurationTable].some(
            (product) => product.id === row[field],
          )
        )
          throw new Error(
            "Choose an existing product for the configuration row.",
          );
      }
  for (const table of TABLES) {
    const ids = state.tables[table].map((row) => row.id);
    if (new Set(ids).size !== ids.length)
      throw new Error("Configuration row IDs must be unique.");
  }
  for (const table of [
    "profitability_default",
    "personal_profitability_default",
    "commercial_profitability_default",
  ] as const) {
    const keys = state.tables[table].map(
      (row) => `${row.channel}:${row.securityType ?? row.facilityType ?? ""}`,
    );
    if (new Set(keys).size !== keys.length)
      throw new Error(
        "Only one profitability default is allowed for each channel and scope.",
      );
  }
  const productKeys = state.tables.market_product_setting.map(
    (row) => row.productKey,
  );
  if (new Set(productKeys).size !== productKeys.length)
    throw new Error("Each market product needs one visibility setting.");
  for (const table of [
    "capital_allocation_setting",
    "workspace_display_setting",
  ] as const)
    if (state.tables[table].length !== 1)
      throw new Error("This setting needs exactly one row.");
  if (
    state.tables.quote_fee_setting.length !== 3 ||
    new Set(state.tables.quote_fee_setting.map((row) => row.vertical)).size !==
      3
  )
    throw new Error("Each pricing domain needs one quote fee setting.");
  if (
    state.tables.commercial_approval_setting.filter((row) => row.active)
      .length !== 1
  )
    throw new Error(
      "Commercial needs exactly one active policy threshold setting.",
    );
}
export function getDemoRiskDefinition(
  area: DemoArea,
  model: CustomerScoreModelConfig = current.scoreModels[area],
) {
  const contract =
    area === "home"
      ? homeRiskContract(model)
      : area === "personal"
        ? {
            eligibleFields: PERSONAL_CREDIT_RISK_FIELDS,
            factDerivationVersion: PERSONAL_RISK_FACT_DERIVATION_VERSION,
            factDerivationConfig: PERSONAL_RISK_FACT_DERIVATION_CONFIG,
          }
        : {
            eligibleFields: COMMERCIAL_CREDIT_RISK_FIELDS,
            factDerivationVersion: COMMERCIAL_RISK_FACT_DERIVATION_VERSION,
            factDerivationConfig: {},
          };
  return {
    ...contract,
    riskDefinitionHash: riskDefinitionHash({
      model,
      productArea: area,
      ...contract,
    }),
    sourceScoreModelVersion: model.version,
  };
}
export function applyDemoConfigurationMutation(
  draft: DemoConfiguration,
  mutation: Omit<DemoConfigurationMutation, "expectedVersion">,
): DemoConfigurationHistoryInput {
  const { targetType, action, data, targetId } = mutation;
  const reason = mutation.reason.trim();
  if (!reason || reason.length > 2000)
    throw new Error(
      "Record a reason of 1–2,000 characters for this configuration change.",
    );
  if (!(targetType in configurationSchemas))
    throw new Error("Unsupported configuration target.");
  if (!["create", "update", "delete"].includes(action))
    throw new Error("Unsupported configuration action.");
  let before: unknown = null;
  let after: unknown = null;
  let changedId: number | null = targetId ?? null;
  if (targetType === "score_model") {
    if (action !== "create")
      throw new Error(
        "Publish score changes as a new immutable model version.",
      );
    const parsed = validateConfigurationData(targetType, data);
    const area = parsed.productArea as DemoArea;
    before = clone(draft.scoreModels[area]);
    const previous = draft.scoreModels[area];
    const model = {
      ...(parsed.modelJson as Pick<
        CustomerScoreModelConfig,
        "factors" | "bands" | "rateCurve"
      >),
      id:
        Math.max(0, ...AREAS.map((key) => draft.scoreModels[key].id ?? 0)) + 1,
      productArea: area,
      name: parsed.name as string,
      description: parsed.description as string | null,
      version: previous.version + 1,
    };
    draft.scoreModels[area] = model;
    after = clone(model);
    changedId = model.id;
  } else if (targetType === "expected_loss_policy") {
    if (action !== "create")
      throw new Error(
        "Publish expected-loss changes as a new immutable policy version.",
      );
    const parsed = validateConfigurationData(targetType, data);
    const area = parsed.vertical as DemoArea;
    before = clone(draft.expectedLossPolicies[area]);
    const previous = draft.expectedLossPolicies[area];
    if ((parsed.version as number) <= previous.version)
      throw new Error(
        "Expected-loss policy version must exceed the current published version.",
      );
    const contract = getDemoRiskDefinition(area, draft.scoreModels[area]);
    if (
      parsed.compatibleRiskDefinitionHash !== contract.riskDefinitionHash ||
      parsed.sourceScoreModelVersion !== contract.sourceScoreModelVersion ||
      parsed.sourceScoreModelArea !== area
    )
      throw new Error(
        "Expected-loss policy must match the currently published score model and risk definition.",
      );
    const policy = {
      ...parsed,
      id:
        Math.max(
          ...AREAS.map((key) => draft.expectedLossPolicies[key].id ?? 0),
        ) + 1,
      effectiveFrom: new Date(parsed.effectiveFrom as string),
      effectiveTo: parsed.effectiveTo
        ? new Date(parsed.effectiveTo as string)
        : null,
      pdBands: (parsed.pdBands as Record<string, unknown>[]).map((row, i) => ({
        id: i + 1,
        ...row,
      })),
      lgdBands: (parsed.lgdBands as Record<string, unknown>[]).map(
        (row, i) => ({ id: i + 1, ...row }),
      ),
      eadSettings: (parsed.eadSettings as Record<string, unknown>[]).map(
        (row, i) => ({ id: i + 1, ...row }),
      ),
    } as unknown as ExpectedLossPolicyConfig;
    draft.expectedLossPolicies[area] = policy;
    after = clone(policy);
    changedId = policy.id;
  } else {
    const rows = draft.tables[targetType];
    const index = rows.findIndex((row) => row.id === targetId);
    if (action !== "create" && index < 0)
      throw new Error(
        "This configuration row no longer exists. Refresh and retry.",
      );
    if (action === "delete") {
      if (singletonTables.has(targetType))
        throw new Error("This required policy setting cannot be deleted.");
      before = clone(rows[index]);
      for (const [child, field] of productRelations[targetType] ?? [])
        if (draft.tables[child].some((row) => row[field] === targetId))
          throw new Error(
            "Remove this product’s linked rates and margin settings before deleting it.",
          );
      rows.splice(index, 1);
    } else {
      if (action === "create" && singletonTables.has(targetType))
        throw new Error("Update the existing policy setting.");
      const previousData =
        action === "update"
          ? Object.fromEntries(
              Object.entries(rows[index]).filter(([key]) => key !== "id"),
            )
          : {};
      const parsed = validateConfigurationData(targetType, {
        ...previousData,
        ...data,
      });
      if (action === "update") {
        before = clone(rows[index]);
        after = { id: targetId!, ...parsed };
        rows[index] = after as DemoConfigurationRow;
      } else {
        changedId = Math.max(0, ...rows.map((row) => row.id)) + 1;
        after = { id: changedId, ...parsed };
        rows.push(after as DemoConfigurationRow);
      }
    }
  }
  validateRelations(draft);
  return {
    targetType,
    action,
    targetId: changedId,
    reason,
    before,
    after: clone(after),
  };
}
export async function commitDemoConfiguration(
  expectedVersion: number,
  apply: (draft: DemoConfiguration) => DemoConfigurationHistoryInput[],
): Promise<DemoConfiguration> {
  await initializeDemoConfiguration();
  const db = await openDatabase();
  const tx = db.transaction(["configuration", "history"], "readwrite");
  const done = finished(tx);
  void done.catch(() => {});
  try {
    const previous = validateStored(
      await request(tx.objectStore("configuration").get("state")),
    );
    if (previous.version !== expectedVersion) {
      publish(previous);
      throw new DemoConfigurationError(
        "stale_configuration",
        "Configuration changed in another tab. Refresh the values and try again.",
      );
    }
    const draft = clone(previous);
    const events = apply(draft);
    validateRelations(draft);
    draft.version = previous.version + 1;
    draft.updatedAt = new Date().toISOString();
    tx.objectStore("configuration").put(draft, "state");
    events.forEach((event, index) =>
      tx.objectStore("history").add({
        ...event,
        id: `${draft.version}-${index}`,
        version: draft.version,
        createdAt: draft.updatedAt,
        actorName: "Demo user",
      } satisfies DemoConfigurationHistory),
    );
    await done;
    publish(draft, true);
    return current;
  } catch (error) {
    try {
      tx.abort();
    } catch {}
    await done.catch(() => {});
    if (error instanceof DemoConfigurationError) throw error;
    if (error instanceof ZodError) throw validationError(error);
    if (
      error instanceof Error &&
      error.name !== "QuotaExceededError" &&
      error.name !== "AbortError"
    )
      throw error;
    throw storageError(error);
  }
}
export async function mutateDemoConfiguration(
  mutation: DemoConfigurationMutation,
): Promise<DemoConfiguration> {
  return commitDemoConfiguration(mutation.expectedVersion, (draft) => [
    applyDemoConfigurationMutation(draft, mutation),
  ]);
}
export async function resetDemoDomainConfiguration(
  area: DemoArea,
  scope: "products" | "policy",
  expectedVersion: number,
): Promise<DemoConfiguration> {
  return commitDemoConfiguration(expectedVersion, (draft) => {
    const seed = createDemoConfigurationSeed();
    const prefix = area === "home" ? "" : `${area}_`;
    const productTables: DemoConfigurationTable[] =
      area === "home"
        ? ["product", "product_rate"]
        : area === "personal"
          ? ["personal_loan_product", "personal_loan_product_rate"]
          : ["commercial_loan_product", "commercial_loan_product_rate"];
    const policyTables = TABLES.filter((key) =>
      area === "home"
        ? [
            "margin_setting",
            "approval_rule",
            "pricing_adjustment_rule",
            "profitability_default",
          ].includes(key)
        : key.startsWith(prefix) && !productTables.includes(key),
    );
    const targets =
      scope === "products"
        ? [
            ...productTables,
            ...policyTables.filter((key) => key.includes("margin")),
          ]
        : policyTables;
    const before = Object.fromEntries(
      targets.map((key) => [key, clone(draft.tables[key])]),
    );
    const reason = `Restore fictional ${area} ${scope} defaults`;
    const modelEvents: DemoConfigurationHistoryInput[] = [];
    for (const key of targets) draft.tables[key] = clone(seed.tables[key]);
    if (scope === "policy") {
      const previousModel = clone(draft.scoreModels[area]);
      const previousExpectedLoss = clone(draft.expectedLossPolicies[area]);
      const model = {
        ...clone(seed.scoreModels[area]),
        version: draft.scoreModels[area].version + 1,
        id: Math.max(...AREAS.map((key) => draft.scoreModels[key].id ?? 0)) + 1,
      };
      const expectedLoss = {
        ...clone(seed.expectedLossPolicies[area]),
        version: draft.expectedLossPolicies[area].version + 1,
        id:
          Math.max(
            ...AREAS.map((key) => draft.expectedLossPolicies[key].id ?? 0),
          ) + 1,
        sourceScoreModelVersion: model.version,
        compatibleRiskDefinitionHash: getDemoRiskDefinition(area, model)
          .riskDefinitionHash,
      };
      draft.scoreModels[area] = model;
      draft.expectedLossPolicies[area] = expectedLoss;
      modelEvents.push(
        {
          targetType: "score_model",
          action: "restore_defaults",
          targetId: model.id,
          reason,
          before: previousModel,
          after: clone(model),
        },
        {
          targetType: "expected_loss_policy",
          action: "restore_defaults",
          targetId: expectedLoss.id,
          reason,
          before: previousExpectedLoss,
          after: clone(expectedLoss),
        },
      );
    }
    return [
      {
        targetType: `${area}_${scope}`,
        action: "restore_defaults",
        targetId: null,
        reason,
        before,
        after: Object.fromEntries(
          targets.map((key) => [key, draft.tables[key]]),
        ),
      },
      ...modelEvents,
    ];
  });
}
export async function resetDemoConfiguration(): Promise<DemoConfiguration> {
  const db = await openDatabase();
  const tx = db.transaction(["configuration", "history"], "readwrite");
  const done = finished(tx);
  const previous = await request(tx.objectStore("configuration").get("state"));
  const seed = createDemoConfigurationSeed();
  seed.version =
    Math.max(
      current.version,
      Number.isSafeInteger(previous?.version) ? previous.version : 0,
    ) + 1;
  seed.updatedAt = new Date().toISOString();
  tx.objectStore("configuration").put(seed, "state");
  tx.objectStore("history").clear();
  await done;
  publish(seed, true);
  return current;
}
/** Test-only release of connection; it never removes visitor data. */
export function closeDemoConfiguration() {
  activeDatabase?.close();
  activeDatabase = undefined;
  database = undefined;
  initialized = false;
  current = freeze(createDemoConfigurationSeed());
  channel?.close();
  channel = undefined;
  listening = false;
  listeners.clear();
}
