import type { WorkspaceRole } from "./auth-guard.js";

export type ComplianceDecision = "allow" | "deny" | "review_required";

export type ComplianceActionClass =
  | "auto_safe"
  | "auto_with_guardrails"
  | "manual_required";

export type EvaluateActionInput = {
  actorId: string;
  actorRole: WorkspaceRole;
  workspaceId: string;
  actionType: string;
  actionClass: ComplianceActionClass;
  targetObjectType: string;
  targetObjectId: string;
  targetRecordConfidence: number;
  targetTraceabilityStatus:
    | "source_backed"
    | "inferred"
    | "conflicting"
    | "stale"
    | "unsupported";
  targetComplianceStatus: "ok" | "limited" | "blocked";
  targetSourceGovernanceState:
    | "allowed"
    | "allowed_with_limits"
    | "metadata_only"
    | "review_required"
    | "blocked";
  reviewStatus: "none" | "pending" | "approved" | "rejected";
  suppressionStatus?: "active" | "inactive";
  deletionPending?: boolean;
  exportSensitivity?: "low" | "medium" | "high";
  traceId: string;
};

export type EvaluateActionResult = {
  decision: ComplianceDecision;
  reasons: string[];
  policyRefs: string[];
  obligations: string[];
  requiredApprovals: number;
  traceId: string;
};

export const CEE_REASON_CODE_CATALOG = [
  {
    code: "deletion_pending",
    category: "data_lifecycle",
    meaning: "Record has a pending deletion workflow.",
  },
  {
    code: "suppression_active",
    category: "compliance",
    meaning: "Record is in suppression list.",
  },
  {
    code: "source_blocked",
    category: "governance",
    meaning: "Source governance blocks this target.",
  },
  {
    code: "record_compliance_blocked",
    category: "compliance",
    meaning: "Record-level compliance state is blocked.",
  },
  {
    code: "traceability_unsupported",
    category: "traceability",
    meaning: "Traceability requirement is not satisfied.",
  },
  {
    code: "review_pending",
    category: "review",
    meaning: "Action is already waiting for manual review.",
  },
  {
    code: "action_class_manual_required",
    category: "policy",
    meaning: "Action class requires manual approval.",
  },
  {
    code: "borderline_confidence_or_inferred",
    category: "trust",
    meaning: "Confidence or traceability requires review.",
  },
  {
    code: "high_sensitivity_or_restricted_source",
    category: "governance",
    meaning: "High sensitivity or restricted source requires review.",
  },
  {
    code: "all_checks_passed",
    category: "allow",
    meaning: "Action passes baseline constitutional checks.",
  },
] as const;

function isPrivilegedRole(role: WorkspaceRole): boolean {
  return role === "owner" || role === "admin" || role === "compliance_admin";
}

export function evaluateComplianceAction(
  input: EvaluateActionInput,
): EvaluateActionResult {
  const reasons: string[] = [];
  const policyRefs: string[] = [];
  const obligations: string[] = [];

  if (input.deletionPending) {
    reasons.push("deletion_pending");
    policyRefs.push("COMPLIANCE.DELETION.PENDING");
    return {
      decision: "deny",
      reasons,
      policyRefs,
      obligations,
      requiredApprovals: 0,
      traceId: input.traceId,
    };
  }

  if (input.suppressionStatus === "active") {
    reasons.push("suppression_active");
    policyRefs.push("COMPLIANCE.SUPPRESSION.ACTIVE");
    return {
      decision: "deny",
      reasons,
      policyRefs,
      obligations,
      requiredApprovals: 0,
      traceId: input.traceId,
    };
  }

  if (input.targetSourceGovernanceState === "blocked") {
    reasons.push("source_blocked");
    policyRefs.push("GOVERNANCE.SOURCE.BLOCKED");
    return {
      decision: "deny",
      reasons,
      policyRefs,
      obligations,
      requiredApprovals: 0,
      traceId: input.traceId,
    };
  }

  if (input.targetComplianceStatus === "blocked") {
    reasons.push("record_compliance_blocked");
    policyRefs.push("COMPLIANCE.RECORD.BLOCKED");
    return {
      decision: "deny",
      reasons,
      policyRefs,
      obligations,
      requiredApprovals: 0,
      traceId: input.traceId,
    };
  }

  if (input.targetTraceabilityStatus === "unsupported") {
    reasons.push("traceability_unsupported");
    policyRefs.push("TRACEABILITY.REQUIRED");
    return {
      decision: "deny",
      reasons,
      policyRefs,
      obligations,
      requiredApprovals: 0,
      traceId: input.traceId,
    };
  }

  if (input.reviewStatus === "pending") {
    reasons.push("review_pending");
    policyRefs.push("REVIEW.REQUIRED.PENDING");
    return {
      decision: "review_required",
      reasons,
      policyRefs,
      obligations,
      requiredApprovals: 1,
      traceId: input.traceId,
    };
  }

  if (input.actionClass === "manual_required") {
    reasons.push("action_class_manual_required");
    policyRefs.push("ACTION_CLASS.MANUAL_REQUIRED");
    obligations.push("create_review_task");
    return {
      decision: "review_required",
      reasons,
      policyRefs,
      obligations,
      requiredApprovals: 1,
      traceId: input.traceId,
    };
  }

  if (
    input.targetRecordConfidence < 60 ||
    input.targetTraceabilityStatus === "inferred"
  ) {
    reasons.push("borderline_confidence_or_inferred");
    policyRefs.push("TRUST.CONFIDENCE.BORDERLINE");
    obligations.push("review_before_sensitive_action");
    return {
      decision: "review_required",
      reasons,
      policyRefs,
      obligations,
      requiredApprovals: 1,
      traceId: input.traceId,
    };
  }

  if (
    input.exportSensitivity === "high" ||
    input.targetSourceGovernanceState === "review_required" ||
    input.targetSourceGovernanceState === "metadata_only"
  ) {
    reasons.push("high_sensitivity_or_restricted_source");
    policyRefs.push("GOVERNANCE.RESTRICTED.REVIEW");
    obligations.push("manager_notification");
    return {
      decision: "review_required",
      reasons,
      policyRefs,
      obligations,
      requiredApprovals: isPrivilegedRole(input.actorRole) ? 1 : 2,
      traceId: input.traceId,
    };
  }

  reasons.push("all_checks_passed");
  policyRefs.push("CEE.ALLOW.BASELINE");
  if (input.actionClass === "auto_with_guardrails") {
    obligations.push("audit_action");
  }

  return {
    decision: "allow",
    reasons,
    policyRefs,
    obligations,
    requiredApprovals: 0,
    traceId: input.traceId,
  };
}
