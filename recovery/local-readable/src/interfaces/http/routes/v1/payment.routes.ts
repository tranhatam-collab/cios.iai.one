import type { FastifyInstance } from "fastify";
import { env } from "../../../../bootstrap/env.js";
import { ERROR_CODES } from "../../../../app/error-codes.js";
import { ACTIONS, requireAction } from "../../../../app/permissions.js";
import { envelopeError, envelopeOk } from "../../response-envelope.js";
import { dbPool } from "../../../../bootstrap/db.js";
import { recordAuthAudit } from "../../../../repositories/auth-audit.repository.js";

const PLAN_PRICES: Record<string, { monthly: number; yearly: number }> = {
  free: { monthly: 0, yearly: 0 },
  starter: { monthly: 29000, yearly: 290000 },
  pro: { monthly: 149000, yearly: 1490000 },
  enterprise: { monthly: 0, yearly: 0 },
};

export async function registerV1PaymentRoutes(app: FastifyInstance): Promise<void> {
  // GET /payment/plans — public
  app.get("/payment/plans", async (request, reply) => {
    return envelopeOk(request, {
      plans: [
        { code: "free", name: "Free", monthlyUsd: 0, yearlyUsd: 0, companies: 100, signals: "basic", ai: false },
        { code: "starter", name: "Starter", monthlyUsd: 29, yearlyUsd: 290, companies: 1000, signals: "daily", ai: false },
        { code: "pro", name: "Pro", monthlyUsd: 149, yearlyUsd: 1490, companies: 5000, signals: "advanced", ai: true },
        { code: "enterprise", name: "Enterprise", monthlyUsd: 0, yearlyUsd: 0, companies: null, signals: "custom", ai: true, contactSales: true },
      ],
      currency: "USD",
    });
  });

  // GET /payment/subscription — requires auth
  app.get("/payment/subscription", async (request, reply) => {
    const user = await requireAction(request, reply, ACTIONS.memberPlansRead);
    if (!user) return;

    try {
      const result = await dbPool.query<{
        plan: string;
        status: string;
        current_period_end: string;
        cancel_at_period_end: boolean;
      }>(
        `SELECT plan, status, current_period_end, cancel_at_period_end
         FROM subscriptions
         WHERE workspace_id = $1
         ORDER BY created_at DESC
         LIMIT 1`,
        [user.workspaceId],
      );
      const sub = result.rows[0];
      if (!sub) {
        return envelopeOk(request, {
          plan: user.plan || "free",
          status: "active",
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
        });
      }
      return envelopeOk(request, {
        plan: sub.plan,
        status: sub.status,
        currentPeriodEnd: sub.current_period_end,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
      });
    } catch {
      return envelopeOk(request, {
        plan: user.plan || "free",
        status: "active",
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      });
    }
  });

  // POST /payment/checkout — requires auth
  app.post("/payment/checkout", async (request, reply) => {
    const user = await requireAction(request, reply, ACTIONS.memberPlansRead);
    if (!user) return;

    const body = request.body as { plan: string; billingCycle?: "monthly" | "yearly" };
    if (!body?.plan || !PLAN_PRICES[body.plan]) {
      return reply.status(400).send(
        envelopeError(request, { code: ERROR_CODES.validationFailed, message: "Invalid plan." }),
      );
    }

    // For MVP without Stripe: create a pending subscription record
    try {
      await dbPool.query(
        `INSERT INTO subscriptions (workspace_id, plan, status, billing_cycle, amount)
         VALUES ($1, $2, 'pending', $3, $4)
         ON CONFLICT (workspace_id, plan) DO UPDATE SET
           status = EXCLUDED.status,
           billing_cycle = EXCLUDED.billing_cycle,
           amount = EXCLUDED.amount,
           updated_at = NOW()`,
        [user.workspaceId, body.plan, body.billingCycle || "monthly", PLAN_PRICES[body.plan][body.billingCycle || "monthly"]],
      );
    } catch {
      // If subscriptions table doesn't exist, just return ok
    }

    await recordAuthAudit({
      workspaceCode: user.workspaceCode,
      userId: user.userId,
      email: user.email,
      role: user.role,
      event: "checkout_initiated",
      result: "success",
      ip: request.ip,
      userAgent: request.headers["user-agent"],
    });

    return envelopeOk(request, {
      checkoutUrl: `${env.FRONTEND_URL}/app/settings/?checkout=success&plan=${body.plan}`,
      plan: body.plan,
      billingCycle: body.billingCycle || "monthly",
    });
  });

  // POST /payment/webhook — public (Stripe webhook)
  app.post("/payment/webhook", async (request, reply) => {
    // In MVP: accept the webhook and log it
    const sig = request.headers["stripe-signature"] as string | undefined;
    const body = request.body as Record<string, unknown>;

    await recordAuthAudit({
      event: "payment_webhook",
      result: "success",
      reason: body.type as string || "unknown",
      ip: request.ip,
      userAgent: request.headers["user-agent"],
    });

    return envelopeOk(request, { received: true });
  });

  // POST /payment/cancel — requires auth
  app.post("/payment/cancel", async (request, reply) => {
    const user = await requireAction(request, reply, ACTIONS.memberPlansRead);
    if (!user) return;

    try {
      await dbPool.query(
        `UPDATE subscriptions SET cancel_at_period_end = true, updated_at = NOW()
         WHERE workspace_id = $1 AND status = 'active'`,
        [user.workspaceId],
      );
    } catch {
      // no-op if table missing
    }

    await recordAuthAudit({
      workspaceCode: user.workspaceCode,
      userId: user.userId,
      email: user.email,
      role: user.role,
      event: "subscription_cancel",
      result: "success",
      ip: request.ip,
      userAgent: request.headers["user-agent"],
    });

    return envelopeOk(request, { cancelled: true });
  });
}
