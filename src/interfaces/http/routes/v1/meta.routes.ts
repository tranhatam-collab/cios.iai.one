import type { FastifyInstance } from "fastify";

import { env } from "../../../../bootstrap/env.js";
import { getReleaseInfo } from "../../../../core/release.js";

export async function registerV1MetaRoutes(app: FastifyInstance): Promise<void> {
  app.get("/meta", async () => {
    const r = getReleaseInfo();
    return {
      ok: true,
      service: env.APP_NAME,
      release: {
        name: r.name,
        version: r.version,
        apiCompat: r.apiCompat,
        commit: r.commit,
        environment: r.environment
      },
      client: {
        webShell: "site/",
        pwaManifest: "/manifest.webmanifest",
        extensionPoints: [
          "/#features",
          "/version.json",
          "/v1/auth/register",
          "/v1/auth/session",
          "/v1/members/plans",
          "/v1/crm/organizations",
          "/v1/compliance/policies",
          "/v1/discovery/sources"
        ]
      },
      capabilities: {
        restPrefix: `/${r.apiCompat}`,
        moduleRegistry: true,
        mobileTarget: "capacitor-or-rn-ready",
        complianceCenter: true,
        authAndMemberPlans: true,
        crmPreview: true,
        sourceDiscoveryGovernance: true
      }
    };
  });
}
