import { dbPool } from "../bootstrap/db.js";

export type MemberPlan = {
  id: string;
  title: string;
  monthlyUsd: number | null;
  limits: {
    seats: number | null;
    orgRecords: number | null;
    automationsPerDay: number | null;
  };
};

const fallbackPlans: MemberPlan[] = [
  {
    id: "free",
    title: "Free",
    monthlyUsd: 0,
    limits: { seats: 1, orgRecords: 200, automationsPerDay: 20 }
  },
  {
    id: "growth",
    title: "Growth",
    monthlyUsd: 49,
    limits: { seats: 5, orgRecords: 5000, automationsPerDay: 300 }
  },
  {
    id: "scale",
    title: "Scale",
    monthlyUsd: 149,
    limits: { seats: 15, orgRecords: 30000, automationsPerDay: 1500 }
  },
  {
    id: "enterprise",
    title: "Enterprise",
    monthlyUsd: null,
    limits: { seats: null, orgRecords: null, automationsPerDay: null }
  }
];

export async function getMemberPlans(): Promise<MemberPlan[]> {
  try {
    const result = await dbPool.query<{
      plan_code: string;
      title: string;
      monthly_usd: number | null;
      seats_limit: number | null;
      org_records_limit: number | null;
      automations_per_day_limit: number | null;
    }>(
      `
      SELECT
        plan_code,
        title,
        monthly_usd,
        seats_limit,
        org_records_limit,
        automations_per_day_limit
      FROM member_plans
      ORDER BY
        CASE plan_code
          WHEN 'free' THEN 1
          WHEN 'growth' THEN 2
          WHEN 'scale' THEN 3
          WHEN 'enterprise' THEN 4
          ELSE 99
        END
      `
    );
    return result.rows.map((row) => ({
      id: row.plan_code,
      title: row.title,
      monthlyUsd: row.monthly_usd,
      limits: {
        seats: row.seats_limit,
        orgRecords: row.org_records_limit,
        automationsPerDay: row.automations_per_day_limit
      }
    }));
  } catch {
    return fallbackPlans;
  }
}
