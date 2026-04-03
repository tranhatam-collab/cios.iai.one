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
