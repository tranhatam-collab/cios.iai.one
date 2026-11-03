import { dbPool } from "../bootstrap/db.js";

async function seed() {
  // Ensure demo workspace exists
  const wsRes = await dbPool.query<{ id: string }>(
    `INSERT INTO workspaces (name, slug, plan, code) VALUES ('Demo Workspace','demo','free','demo')
     ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`
  );
  const workspaceId = wsRes.rows[0].id;

  const companies = [
    { name: "Helio Dynamics", domain: "helio-dynamics.com", industry: "Energy", fit: 88, intent: 72 },
    { name: "Vertex AI Labs", domain: "vertexailabs.io", industry: "Artificial Intelligence", fit: 94, intent: 85 },
    { name: "Nexa Systems", domain: "nexasys.co", industry: "SaaS", fit: 76, intent: 60 },
    { name: "Stratus Cloud", domain: "stratuscloud.net", industry: "Cloud Infrastructure", fit: 81, intent: 55 },
    { name: "Lumen Health", domain: "lumenhealth.com", industry: "Healthcare", fit: 69, intent: 48 },
    { name: "Atlas Robotics", domain: "atlasrobotics.tech", industry: "Robotics", fit: 92, intent: 80 },
    { name: "Kairo Finance", domain: "kairo.finance", industry: "Fintech", fit: 78, intent: 63 },
    { name: "Pioneer Agri", domain: "pioneeragri.org", industry: "Agriculture", fit: 65, intent: 42 },
    { name: "Orion Security", domain: "orionsec.io", industry: "Cybersecurity", fit: 87, intent: 74 },
    { name: "Tam Commerce", domain: "tamcommerce.vn", industry: "Ecommerce Enablement", fit: 91, intent: 78 },
    { name: "Sao Biotech", domain: "saobiotech.com", industry: "Biotech", fit: 75, intent: 51 },
    { name: "IAI Logistics", domain: "iai-logistics.vn", industry: "Logistics", fit: 82, intent: 64 },
    { name: "Nova EdTech", domain: "novaedtech.com", industry: "Education", fit: 71, intent: 58 },
    { name: "Echo Media", domain: "echomedia.tv", industry: "Media", fit: 60, intent: 45 },
    { name: "Flux Energy", domain: "fluxenergy.io", industry: "Renewable Energy", fit: 84, intent: 66 },
    { name: "Cipher Data", domain: "cipherdata.co", industry: "Data Analytics", fit: 79, intent: 61 },
    { name: "Zenith Retail", domain: "zenithretail.com", industry: "Retail", fit: 73, intent: 50 },
    { name: "Apex Manufacturing", domain: "apex-mfg.com", industry: "Manufacturing", fit: 66, intent: 44 },
    { name: "Prism Consulting", domain: "prismconsulting.net", industry: "Consulting", fit: 80, intent: 57 },
    { name: "Solara Telecom", domain: "solaratelecom.com", industry: "Telecommunications", fit: 70, intent: 53 },
    { name: "Titan Gaming", domain: "titangaming.gg", industry: "Gaming", fit: 62, intent: 40 },
    { name: "Vanta Insurance", domain: "vantainsure.com", industry: "Insurance", fit: 77, intent: 59 },
    { name: "Drift Mobility", domain: "driftmobility.co", industry: "Transportation", fit: 83, intent: 67 },
    { name: "Clarity Legal", domain: "claritylegal.io", industry: "Legal Tech", fit: 68, intent: 46 },
    { name: "Pulse Biotech", domain: "pulsebiotech.com", industry: "Biotech", fit: 86, intent: 70 },
  ];

  for (const c of companies) {
    await dbPool.query(
      `INSERT INTO organizations (workspace_id, name, domain, industry, fit_score, intent_score, stage)
       VALUES ($1, $2, $3, $4, $5, $6, 'new')
       ON CONFLICT (workspace_id, domain) DO UPDATE SET
         name = EXCLUDED.name,
         industry = EXCLUDED.industry,
         fit_score = EXCLUDED.fit_score,
         intent_score = EXCLUDED.intent_score,
         updated_at = NOW()`,
      [workspaceId, c.name, c.domain, c.industry, c.fit, c.intent]
    );
  }
  console.log(`Seeded ${companies.length} organizations`);

  const signalTypes = [
    "hiring", "new_product", "website_update", "content_increase",
    "market_expansion", "sales_growth_hint", "tech_stack_change", "other"
  ];
  const sources = [
    "https://example-jobs.com/helio","https://example-news.com/vertex",
    "https://example-jobs.com/nexa","https://example-news.com/stratus",
    "https://example-jobs.com/lumen","https://example-news.com/atlas",
    "https://example-jobs.com/kairo","https://example-news.com/pioneer",
    "https://example-jobs.com/orion","https://example-news.com/tam",
  ];

  let signalCount = 0;
  for (let i = 0; i < 80; i++) {
    const companyIdx = i % companies.length;
    const type = signalTypes[i % signalTypes.length];
    const sourceUrl = sources[i % sources.length] + `?sig=${i}`;
    const confidence = 50 + (i % 45);
    const riskLevel = i % 5 === 0 ? "high" : i % 3 === 0 ? "medium" : "low";
    await dbPool.query(
      `INSERT INTO discovery_sources
       (workspace_id, candidate_type, source_url, source_type, discovery_method,
        preliminary_confidence, governance_state, review_status, workspace_relevance,
        geo_hints, language_hints, risk_level, eligibility)
       VALUES ($1, 'source_candidate', $2, $3, 'seed_domain', $4, 'allowed_with_limits',
               'none', 'high', ARRAY['VN'], ARRAY['vi','en'], $5, 'allow_limited')
       ON CONFLICT DO NOTHING`,
      [workspaceId, sourceUrl, type, confidence, riskLevel]
    );
    signalCount++;
  }
  console.log(`Seeded ${signalCount} discovery sources`);

  const auditTypes = [
    "company_created", "csv_imported", "score_generated", "action_completed", "risk_checked"
  ];
  for (let i = 0; i < 25; i++) {
    await dbPool.query(
      `INSERT INTO compliance_audit_logs (workspace_id, event_type, message, actor, created_at)
       VALUES ($1, $2, $3, $4, NOW() - ($5 || ' minutes')::interval)`,
      [workspaceId, auditTypes[i % auditTypes.length], `Demo audit event #${i + 1}`, "seed-script", String(i * 30)]
    );
  }
  console.log("Seeded 25 audit logs");

  console.log("Demo seed complete.");
  await dbPool.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
