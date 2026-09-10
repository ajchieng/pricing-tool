import {
  applyDemoConfigurationMutation,
  commitDemoConfiguration,
  type DemoConfiguration,
  type DemoConfigurationHistoryInput,
} from "./configuration";

type ProposedMutation = Parameters<typeof applyDemoConfigurationMutation>[1];
export interface DemoConfigurationProposal {
  id: string;
  mutation: ProposedMutation;
  summary: string;
  reason: string;
  status: "pending" | "scheduled" | "approved" | "rejected";
  proposedAt: string;
  proposedByName: string;
  decidedAt: string | null;
  decidedByName: string | null;
  effectiveAt: string | null;
  decisionNotes: string;
  before: unknown;
}

export function demoConfigurationProposals(): DemoConfigurationProposal[] {
  const now = new Date();
  const mutation: ProposedMutation = {
    targetType: "capital_allocation_setting",
    action: "update",
    targetId: 1,
    data: { capitalRatioPct: 12 },
    reason: "Fictional capital sensitivity example for a portfolio review.",
  };
  return [
    {
      id: "example-capital-proposal",
      mutation,
      summary: "Review illustrative capital allocation",
      reason: mutation.reason,
      status: "pending",
      proposedAt: now.toISOString(),
      proposedByName: "Sample adviser",
      decidedAt: null,
      decidedByName: null,
      effectiveAt: null,
      decisionNotes: "",
      before: null,
    },
  ];
}

function proposalEvent(
  proposal: DemoConfigurationProposal,
  action: string,
  before: unknown,
): DemoConfigurationHistoryInput {
  return {
    targetType: "config_change",
    targetId: null,
    action,
    reason: proposal.reason,
    before,
    after: structuredClone(proposal),
  };
}
function validReason(reason: string) {
  if (!reason.trim() || reason.trim().length > 2000)
    throw new Error("Enter a change reason of up to 2,000 characters.");
}
function dateValue(value?: string | null): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.valueOf()))
    throw new Error("Choose a valid effective date.");
  return parsed.toISOString();
}
function decidableProposal(
  draft: DemoConfiguration,
  id: string,
  decision: "approve" | "reject",
) {
  const proposal = draft.proposals.find((item) => item.id === id);
  if (
    !proposal ||
    (proposal.status !== "pending" &&
      !(proposal.status === "scheduled" && decision === "reject"))
  )
    throw new Error(
      "This proposal has already been decided. Reload the queue.",
    );
  return proposal;
}
function applyProposal(
  draft: DemoConfiguration,
  proposal: DemoConfigurationProposal,
) {
  const candidate = structuredClone(draft);
  const validation = applyDemoConfigurationMutation(
    candidate,
    proposal.mutation,
  );
  if (
    proposal.before != null &&
    JSON.stringify(validation.before) !== JSON.stringify(proposal.before)
  ) {
    throw new Error(
      "The target setting changed after this proposal was made. Reject it and submit an updated proposal.",
    );
  }
  return applyDemoConfigurationMutation(draft, proposal.mutation);
}

export async function proposeDemoConfigurationChange(input: {
  expectedVersion: number;
  mutation: ProposedMutation;
  summary: string;
}) {
  validReason(input.mutation.reason);
  return commitDemoConfiguration(input.expectedVersion, (draft) => {
    const candidate = structuredClone(draft);
    const validated = applyDemoConfigurationMutation(candidate, input.mutation);
    const proposal: DemoConfigurationProposal = {
      id: crypto.randomUUID(),
      mutation: structuredClone(input.mutation),
      summary: input.summary.trim(),
      reason: input.mutation.reason.trim(),
      status: "pending",
      proposedAt: new Date().toISOString(),
      proposedByName: "Demo user",
      decidedAt: null,
      decidedByName: null,
      effectiveAt: null,
      decisionNotes: "",
      before: validated.before,
    };
    draft.proposals.push(proposal);
    return [proposalEvent(proposal, "config.proposed", null)];
  });
}
export async function decideDemoConfigurationChange(input: {
  expectedVersion: number;
  id: string;
  decision: "approve" | "reject";
  notes?: string;
  effectiveAt?: string | null;
}) {
  const effectiveAt = dateValue(input.effectiveAt);
  if ((input.notes?.length ?? 0) > 2000)
    throw new Error("Decision notes must be no more than 2,000 characters.");
  return commitDemoConfiguration(input.expectedVersion, (draft) => {
    const proposal = decidableProposal(draft, input.id, input.decision);
    if (proposal.status === "scheduled" && !input.notes?.trim())
      throw new Error("Enter a reason for cancelling this scheduled change.");
    const before = structuredClone(proposal);
    const records: DemoConfigurationHistoryInput[] = [];
    if (input.decision === "reject") proposal.status = "rejected";
    else if (effectiveAt && Date.parse(effectiveAt) > Date.now()) {
      // Validate now, then validate again when publication is due.
      applyProposal(structuredClone(draft), structuredClone(proposal));
      proposal.status = "scheduled";
      proposal.effectiveAt = effectiveAt;
    } else {
      records.push(applyProposal(draft, proposal));
      proposal.status = "approved";
      proposal.effectiveAt = effectiveAt;
    }
    proposal.decidedAt = new Date().toISOString();
    proposal.decidedByName = "Demo user";
    proposal.decisionNotes = input.notes?.trim() ?? "";
    records.push(proposalEvent(proposal, `config.${proposal.status}`, before));
    return records;
  });
}
export async function publishDueDemoConfigurationChanges(
  expectedVersion: number,
) {
  return commitDemoConfiguration(expectedVersion, (draft) => {
    const records: DemoConfigurationHistoryInput[] = [];
    const due = draft.proposals.filter(
      (item) =>
        item.status === "scheduled" &&
        item.effectiveAt &&
        Date.parse(item.effectiveAt) <= Date.now(),
    );
    if (!due.length)
      throw new Error("No scheduled changes are due for publication yet.");
    for (const proposal of due) {
      const before = structuredClone(proposal);
      records.push(applyProposal(draft, proposal));
      proposal.status = "approved";
      proposal.decidedAt = new Date().toISOString();
      records.push(proposalEvent(proposal, "config.published", before));
    }
    return records;
  });
}

/** Record an immediately approved future change without publishing its policy early. */
export async function scheduleDemoConfigurationChange(input: {
  expectedVersion: number;
  mutation: ProposedMutation;
  summary: string;
  effectiveAt: string;
}) {
  validReason(input.mutation.reason);
  const effectiveAt = dateValue(input.effectiveAt);
  if (!effectiveAt || Date.parse(effectiveAt) <= Date.now()) {
    throw new Error("Choose a future effective date for a scheduled change.");
  }
  return commitDemoConfiguration(input.expectedVersion, (draft) => {
    const validated = applyDemoConfigurationMutation(
      structuredClone(draft),
      input.mutation,
    );
    const now = new Date().toISOString();
    const proposal: DemoConfigurationProposal = {
      id: crypto.randomUUID(),
      mutation: structuredClone(input.mutation),
      summary: input.summary.trim(),
      reason: input.mutation.reason.trim(),
      status: "scheduled",
      proposedAt: now,
      proposedByName: "Demo user",
      decidedAt: now,
      decidedByName: "Demo user",
      effectiveAt,
      decisionNotes: "Scheduled from configuration.",
      before: validated.before,
    };
    draft.proposals.push(proposal);
    return [proposalEvent(proposal, "config.scheduled", null)];
  });
}
