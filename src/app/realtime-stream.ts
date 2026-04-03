import { randomUUID } from "node:crypto";

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { Logger } from "pino";

import { envelopeOk } from "../interfaces/http/response-envelope.js";
import {
  listRealtimeEventsSince,
  persistRealtimeEvent,
} from "../repositories/realtime-event.repository.js";
import { ACTIONS, requireAction } from "./permissions.js";

type AppInstance = FastifyInstance<
  import("http").Server,
  import("http").IncomingMessage,
  import("http").ServerResponse,
  Logger
>;

export type StreamEventType =
  | "review.created"
  | "review.updated"
  | "flow.updated"
  | "compliance.updated";

export type StreamEvent = {
  event_id: string;
  event_type: StreamEventType;
  workspace_id: string;
  scope_type: "workspace";
  scope_id: string;
  object_type: string;
  object_id: string;
  summary: string;
  severity: "low" | "medium" | "high";
  timestamp: string;
  trace_id: string;
  payload_minimal: Record<string, unknown>;
};

type Subscriber = {
  workspaceId: string;
  reply: FastifyReply;
};

const subscribers = new Set<Subscriber>();
const EVENT_BUFFER_LIMIT = 200;
const eventBuffer: StreamEvent[] = [];

function appendEventToBuffer(event: StreamEvent): void {
  eventBuffer.push(event);
  if (eventBuffer.length > EVENT_BUFFER_LIMIT) {
    eventBuffer.splice(0, eventBuffer.length - EVENT_BUFFER_LIMIT);
  }
}

export function publishStreamEvent(
  input: Omit<StreamEvent, "event_id" | "timestamp"> & {
    event_id?: string;
    timestamp?: string;
  },
): void {
  const event: StreamEvent = {
    ...input,
    event_id: input.event_id ?? randomUUID(),
    timestamp: input.timestamp ?? new Date().toISOString(),
  };
  appendEventToBuffer(event);

  void persistRealtimeEvent({
    eventId: event.event_id,
    workspaceId: event.workspace_id,
    eventType: event.event_type,
    scopeType: event.scope_type,
    scopeId: event.scope_id,
    objectType: event.object_type,
    objectId: event.object_id,
    summary: event.summary,
    severity: event.severity,
    timestamp: event.timestamp,
    traceId: event.trace_id,
    payloadMinimal: event.payload_minimal,
  });

  const packet = `id: ${event.event_id}\nevent: ${event.event_type}\ndata: ${JSON.stringify(event)}\n\n`;
  for (const sub of subscribers) {
    if (sub.workspaceId !== event.workspace_id) continue;
    sub.reply.raw.write(packet);
  }
}

async function replayFromLastEventId(
  lastEventId: string | undefined,
  workspaceId: string,
  reply: FastifyReply,
): Promise<void> {
  const persisted = await listRealtimeEventsSince({
    workspaceId,
    afterEventId: lastEventId,
    limit: 500,
  });

  if (persisted.length > 0) {
    for (const event of persisted) {
      reply.raw.write(
        `id: ${event.eventId}\nevent: ${event.eventType}\ndata: ${JSON.stringify(
          {
            event_id: event.eventId,
            event_type: event.eventType,
            workspace_id: event.workspaceId,
            scope_type: event.scopeType,
            scope_id: event.scopeId,
            object_type: event.objectType,
            object_id: event.objectId,
            summary: event.summary,
            severity: event.severity,
            timestamp: event.timestamp,
            trace_id: event.traceId,
            payload_minimal: event.payloadMinimal,
          },
        )}\n\n`,
      );
    }
    return;
  }

  if (!lastEventId) return;
  const idx = eventBuffer.findIndex((event) => event.event_id === lastEventId);
  if (idx < 0) return;
  for (let i = idx + 1; i < eventBuffer.length; i += 1) {
    const event = eventBuffer[i];
    if (event.workspace_id !== workspaceId) continue;
    reply.raw.write(
      `id: ${event.event_id}\nevent: ${event.event_type}\ndata: ${JSON.stringify(event)}\n\n`,
    );
  }
}

export async function registerRealtimeStreamRoute(
  app: AppInstance,
): Promise<void> {
  app.get(
    "/realtime/events/since/:eventId",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = await requireAction(
        request,
        reply,
        ACTIONS.realtimeStreamRead,
      );
      if (!user) return;

      const { eventId } = request.params as { eventId: string };
      const events = await listRealtimeEventsSince({
        workspaceId: user.workspaceId,
        afterEventId: eventId,
        limit: 500,
      });

      return envelopeOk(request, {
        total: events.length,
        events: events.map((event) => ({
          event_id: event.eventId,
          event_type: event.eventType,
          workspace_id: event.workspaceId,
          scope_type: event.scopeType,
          scope_id: event.scopeId,
          object_type: event.objectType,
          object_id: event.objectId,
          summary: event.summary,
          severity: event.severity,
          timestamp: event.timestamp,
          trace_id: event.traceId,
          payload_minimal: event.payloadMinimal,
        })),
      });
    },
  );

  app.get(
    "/realtime/stream",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = await requireAction(
        request,
        reply,
        ACTIONS.realtimeStreamRead,
      );
      if (!user) return;

      reply.raw.setHeader("Content-Type", "text/event-stream");
      reply.raw.setHeader("Cache-Control", "no-cache, no-transform");
      reply.raw.setHeader("Connection", "keep-alive");

      const lastEventIdHeader = request.headers["last-event-id"];
      const lastEventId =
        typeof lastEventIdHeader === "string" ? lastEventIdHeader : undefined;

      const subscriber: Subscriber = { workspaceId: user.workspaceId, reply };
      subscribers.add(subscriber);

      reply.raw.write(
        `event: connected\ndata: ${JSON.stringify({
          ok: true,
          workspace_id: user.workspaceId,
          timestamp: new Date().toISOString(),
          replay_supported: true,
          last_event_id: lastEventId ?? null,
        })}\n\n`,
      );

      await replayFromLastEventId(lastEventId, user.workspaceId, reply);

      const heartbeat = setInterval(() => {
        reply.raw.write(
          `event: heartbeat\ndata: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`,
        );
      }, 20000);

      request.raw.on("close", () => {
        clearInterval(heartbeat);
        subscribers.delete(subscriber);
      });
    },
  );
}
