import { describe, expect, it, vi } from "vitest";

import { publishStreamEvent } from "../src/app/realtime-stream.js";
import {
  flushPendingRealtimeWrites,
  listRealtimeEventsSince,
  persistRealtimeEvent,
} from "../src/repositories/realtime-event.repository.js";

// A reachable-but-misbehaving database (for example Postgres running without the expected schema):
// writes fail late and reads fail early, so the in-memory fallback is filled after the first read.
vi.mock("../src/bootstrap/db.js", () => ({
  dbPool: {
    query: async (sql: string) => {
      await new Promise((resolve) => setTimeout(resolve, /INSERT/i.test(sql) ? 60 : 5));
      throw new Error('relation "realtime_events" does not exist');
    },
    end: async () => undefined,
  },
}));

function newWorkspace(): string {
  return `ws-${crypto.randomUUID()}`;
}

function publish(workspaceId: string, eventId: string, eventType: "review.created" | "review.updated" | "flow.updated") {
  publishStreamEvent({
    event_id: eventId,
    event_type: eventType,
    workspace_id: workspaceId,
    scope_type: "workspace",
    scope_id: workspaceId,
    object_type: "organization",
    object_id: "org_demo",
    summary: eventType,
    severity: "low",
    trace_id: `trace-${eventId}`,
    payload_minimal: {},
  });
}

describe("realtime events: read-your-writes while the database is slow or unavailable", () => {
  it("shows a just-published event to an immediate replay", async () => {
    const workspaceId = newWorkspace();
    publish(workspaceId, `${workspaceId}-1`, "review.created");

    const events = await listRealtimeEventsSince({
      workspaceId,
      afterEventId: "unknown-event-id",
      limit: 50,
    });

    expect(events.map((event) => event.eventType)).toEqual(["review.created"]);
  });

  it("keeps publish order and replays only events after the checkpoint", async () => {
    const workspaceId = newWorkspace();
    publish(workspaceId, `${workspaceId}-a`, "review.created");
    publish(workspaceId, `${workspaceId}-b`, "review.updated");
    publish(workspaceId, `${workspaceId}-c`, "flow.updated");

    const replay = await listRealtimeEventsSince({
      workspaceId,
      afterEventId: `${workspaceId}-a`,
      limit: 50,
    });

    expect(replay.map((event) => event.eventId)).toEqual([`${workspaceId}-b`, `${workspaceId}-c`]);
  });

  it("flushPendingRealtimeWrites waits for fire-and-forget persists", async () => {
    const workspaceId = newWorkspace();
    void persistRealtimeEvent({
      eventId: `${workspaceId}-x`,
      workspaceId,
      eventType: "flow.updated",
      scopeType: "workspace",
      scopeId: workspaceId,
      objectType: "flow",
      objectId: "flow_1",
      summary: "flow updated",
      severity: "low",
      timestamp: new Date().toISOString(),
      traceId: "trace-x",
      payloadMinimal: {},
    });

    await flushPendingRealtimeWrites();

    const events = await listRealtimeEventsSince({ workspaceId, afterEventId: "unknown-event-id", limit: 10 });
    expect(events.map((event) => event.eventId)).toEqual([`${workspaceId}-x`]);
  });
});
