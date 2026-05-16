import { fail } from "./envelope";

type ParsedBody<T> = { value: T } | { response: Response };

function parseNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export function validateSimulationRunPayload(
  payload: Record<string, unknown>,
  traceId: string
): ParsedBody<{
  scenarioName: string;
  baseStateRef: string;
  inputParameters: Record<string, unknown>;
  timeHorizon: string;
  assumptions?: Record<string, unknown>;
}> {
  const scenarioName = typeof payload.scenario_name === "string" ? payload.scenario_name.trim() : "";
  const baseStateRef = typeof payload.base_state_ref === "string" ? payload.base_state_ref.trim() : "";
  const timeHorizon = typeof payload.time_horizon === "string" ? payload.time_horizon.trim() : "";
  const inputParameters =
    payload.input_parameters && typeof payload.input_parameters === "object" && !Array.isArray(payload.input_parameters)
      ? (payload.input_parameters as Record<string, unknown>)
      : null;

  if (!scenarioName || !baseStateRef || !timeHorizon || !inputParameters) {
    return {
      response: fail(
        400,
        "VALIDATION_FAILED",
        "Invalid simulation payload.",
        {
          required: ["scenario_name", "base_state_ref", "input_parameters", "time_horizon"]
        },
        traceId
      )
    };
  }

  const assumptions =
    payload.assumptions && typeof payload.assumptions === "object" && !Array.isArray(payload.assumptions)
      ? (payload.assumptions as Record<string, unknown>)
      : undefined;

  return {
    value: {
      scenarioName,
      baseStateRef,
      inputParameters,
      timeHorizon,
      assumptions
    }
  };
}

export function validateGovernanceApprovalPayload(
  payload: Record<string, unknown>,
  traceId: string
): ParsedBody<{
  requestId: string;
  decision: "approve" | "reject";
  reason: string;
  evidenceRefs: string[];
}> {
  const requestId = typeof payload.request_id === "string" ? payload.request_id.trim() : "";
  const decision = payload.decision === "approve" || payload.decision === "reject" ? payload.decision : null;
  const reason = typeof payload.reason === "string" ? payload.reason.trim() : "";
  const evidenceRefs = Array.isArray(payload.evidence_refs)
    ? payload.evidence_refs.filter((x): x is string => typeof x === "string")
    : [];

  if (!requestId || !decision || !reason) {
    return {
      response: fail(
        400,
        "VALIDATION_FAILED",
        "Invalid governance approval payload.",
        {
          required: ["request_id", "decision(approve|reject)", "reason"]
        },
        traceId
      )
    };
  }

  return {
    value: {
      requestId,
      decision,
      reason,
      evidenceRefs
    }
  };
}

export function validateFlowDispatchPayload(
  payload: Record<string, unknown>,
  traceId: string
): ParsedBody<{
  triggerName: string;
  sourceDecisionId: string;
  sourceSimulationId: string | null;
  priority: "low" | "medium" | "high" | "critical";
  expectedCallback: string;
  requestedBy: string;
  approvedBy: string | null;
  payload: Record<string, unknown>;
}> {
  const triggerName = typeof payload.trigger_name === "string" ? payload.trigger_name.trim() : "";
  const sourceDecisionId = typeof payload.source_decision_id === "string" ? payload.source_decision_id.trim() : "";
  const sourceSimulationId =
    typeof payload.source_simulation_id === "string" && payload.source_simulation_id.trim() !== ""
      ? payload.source_simulation_id.trim()
      : null;
  const priorityRaw = typeof payload.priority === "string" ? payload.priority.toLowerCase() : "";
  const priority =
    priorityRaw === "low" || priorityRaw === "medium" || priorityRaw === "high" || priorityRaw === "critical"
      ? priorityRaw
      : null;
  const expectedCallback = typeof payload.expected_callback === "string" ? payload.expected_callback.trim() : "";
  const requestedBy = typeof payload.requested_by === "string" ? payload.requested_by.trim() : "";
  const approvedBy = typeof payload.approved_by === "string" ? payload.approved_by.trim() : null;
  const bodyPayload =
    payload.payload && typeof payload.payload === "object" && !Array.isArray(payload.payload)
      ? (payload.payload as Record<string, unknown>)
      : null;

  if (!triggerName || !sourceDecisionId || !priority || !expectedCallback || !requestedBy || !bodyPayload) {
    return {
      response: fail(
        400,
        "VALIDATION_FAILED",
        "Invalid flow dispatch payload.",
        {
          required: [
            "trigger_name",
            "source_decision_id",
            "payload",
            "priority(low|medium|high|critical)",
            "expected_callback",
            "requested_by"
          ]
        },
        traceId
      )
    };
  }

  if ((priority === "high" || priority === "critical") && !approvedBy) {
    return {
      response: fail(
        400,
        "VALIDATION_FAILED",
        "approved_by is required for high/critical flow dispatch.",
        undefined,
        traceId
      )
    };
  }

  return {
    value: {
      triggerName,
      sourceDecisionId,
      sourceSimulationId,
      priority,
      expectedCallback,
      requestedBy,
      approvedBy,
      payload: bodyPayload
    }
  };
}

export function validateFlowCallbackPayload(
  payload: Record<string, unknown>,
  traceId: string
): ParsedBody<{
  flowRunId: string;
  triggerName: string;
  status: "queued" | "running" | "success" | "failed" | "cancelled";
  completedAt: string;
  callbackTraceId: string;
  result?: Record<string, unknown>;
  error?: Record<string, unknown>;
}> {
  const flowRunId = typeof payload.flow_run_id === "string" ? payload.flow_run_id.trim() : "";
  const triggerName = typeof payload.trigger_name === "string" ? payload.trigger_name.trim() : "";
  const statusRaw = typeof payload.status === "string" ? payload.status.toLowerCase() : "";
  const status =
    statusRaw === "queued" ||
    statusRaw === "running" ||
    statusRaw === "success" ||
    statusRaw === "failed" ||
    statusRaw === "cancelled"
      ? statusRaw
      : null;
  const completedAt = typeof payload.completed_at === "string" ? payload.completed_at.trim() : "";
  const callbackTraceId = typeof payload.trace_id === "string" ? payload.trace_id.trim() : "";
  const result =
    payload.result && typeof payload.result === "object" && !Array.isArray(payload.result)
      ? (payload.result as Record<string, unknown>)
      : undefined;
  const error =
    payload.error && typeof payload.error === "object" && !Array.isArray(payload.error)
      ? (payload.error as Record<string, unknown>)
      : undefined;

  if (!flowRunId || !triggerName || !status || !completedAt || !callbackTraceId) {
    return {
      response: fail(
        400,
        "VALIDATION_FAILED",
        "Invalid flow callback payload.",
        {
          required: ["flow_run_id", "trigger_name", "status", "completed_at", "trace_id"]
        },
        traceId
      )
    };
  }

  return {
    value: {
      flowRunId,
      triggerName,
      status,
      completedAt,
      callbackTraceId,
      result,
      error
    }
  };
}

export function validateIngestPayload(
  payload: Record<string, unknown>,
  traceId: string
): ParsedBody<{
  source: string;
  eventType: string;
  occurredAt: string;
  payload: Record<string, unknown>;
  entityRefs: string[];
}> {
  const source = typeof payload.source === "string" ? payload.source.trim() : "";
  const eventType = typeof payload.event_type === "string" ? payload.event_type.trim() : "";
  const occurredAt = typeof payload.occurred_at === "string" ? payload.occurred_at.trim() : "";
  const bodyPayload =
    payload.payload && typeof payload.payload === "object" && !Array.isArray(payload.payload)
      ? (payload.payload as Record<string, unknown>)
      : null;
  const entityRefs = Array.isArray(payload.entity_refs)
    ? payload.entity_refs.filter((x): x is string => typeof x === "string")
    : [];

  if (!source || !eventType || !occurredAt || !bodyPayload) {
    return {
      response: fail(
        400,
        "VALIDATION_FAILED",
        "Invalid event ingest payload.",
        {
          required: ["source", "event_type", "occurred_at", "payload"]
        },
        traceId
      )
    };
  }

  return {
    value: {
      source,
      eventType,
      occurredAt,
      payload: bodyPayload,
      entityRefs
    }
  };
}

export function validateEventSearchFilters(query: {
  text: string | null;
  source: string | null;
  eventType: string | null;
  from: string | null;
  to: string | null;
}): {
  text: string | null;
  source: string | null;
  eventType: string | null;
  from: string | null;
  to: string | null;
} {
  return {
    text: query.text?.trim() || null,
    source: query.source?.trim() || null,
    eventType: query.eventType?.trim() || null,
    from: query.from?.trim() || null,
    to: query.to?.trim() || null
  };
}

export function validateDataQueryPayload(
  payload: Record<string, unknown>,
  traceId: string
): ParsedBody<{
  dimensions: string[];
  filters: {
    source?: string;
    event_type?: string;
    risk_level?: string;
    from?: string;
    to?: string;
  };
  metrics: string[];
  timeSlice: "hour" | "day";
  limit: number;
}> {
  const dimensions = Array.isArray(payload.dimensions)
    ? payload.dimensions.filter((x): x is string => typeof x === "string")
    : [];
  const metrics = Array.isArray(payload.metrics)
    ? payload.metrics.filter((x): x is string => typeof x === "string")
    : [];
  const filters =
    payload.filters && typeof payload.filters === "object" && !Array.isArray(payload.filters)
      ? (payload.filters as Record<string, unknown>)
      : {};
  const timeSliceRaw = typeof payload.time_slice === "string" ? payload.time_slice : "hour";
  const timeSlice = timeSliceRaw === "day" ? "day" : "hour";
  const limitRaw = parseNumber(payload.limit);
  const limit = Math.max(1, Math.min(limitRaw ?? 100, 500));

  if (dimensions.length === 0 || metrics.length === 0) {
    return {
      response: fail(
        400,
        "VALIDATION_FAILED",
        "data/query requires non-empty dimensions and metrics.",
        { required: ["dimensions[]", "metrics[]"] },
        traceId
      )
    };
  }

  return {
    value: {
      dimensions,
      filters: {
        source: typeof filters.source === "string" ? filters.source : undefined,
        event_type: typeof filters.event_type === "string" ? filters.event_type : undefined,
        risk_level: typeof filters.risk_level === "string" ? filters.risk_level : undefined,
        from: typeof filters.from === "string" ? filters.from : undefined,
        to: typeof filters.to === "string" ? filters.to : undefined
      },
      metrics,
      timeSlice,
      limit
    }
  };
}
