// app/api/find-funds/route.ts
import OpenAI from "openai";

export const runtime = "nodejs";         // ensure Node runtime
export const dynamic = "force-dynamic";  // don't prerender this route

function corsHeaders(origin?: string) {
  const o = origin || process.env.ALLOW_ORIGIN || "*"; // set to your Pages URL for stricter CORS
  return {
    "Access-Control-Allow-Origin": o,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return new Response(
      JSON.stringify({ error: "Server misconfigured: missing OPENAI_API_KEY" }),
      { status: 500, headers: { ...corsHeaders(), "Content-Type": "application/json" } }
    );
  }

  const criteria = await req.json().catch(() => ({}));

  const {
    country = "IN",
    category = "Large-Cap Index",
    risk = "Low/Medium",
    plan = "Direct",
    max_expense_ratio = 0.8, // %
    min_aum_cr = 500,        // INR Crores
    index = "Nifty 50 TRI",
    max_candidates = 5
  } = criteria || {};

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // JSON schema to force a structured list of funds
  const RESULT_SCHEMA = {
    name: "fund_ranking",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        criteria_echo: { type: "object" },
        funds: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              scheme_name: { type: "string" },
              plan: { type: "string" },
              category: { type: "string" },
              benchmark: { type: "string" },
              expense_ratio: { type: "number" },
              aum_cr: { type: "number" },
              inception_year: { type: "number", nullable: true },
              returns_1y: { type: "number", nullable: true },
              cagr_3y: { type: "number", nullable: true },
              cagr_5y: { type: "number", nullable: true },
              tracking_diff_1y: { type: "number", nullable: true },
              tracking_error_1y: { type: "number", nullable: true },
              manager_tenure_years: { type: "number", nullable: true },
              downside_capture_3y: { type: "number", nullable: true },
              exit_load: { type: "string", nullable: true },
              rationale: { type: "string" },
              citations: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    title: { type: "string", nullable: true },
                    url: { type: "string" }
                  },
                  required: ["url"]
                }
              },
              as_of: { type: "string" }
            },
            required: ["scheme_name","plan","category","benchmark","expense_ratio","aum_cr","rationale","citations","as_of"]
          }
        },
        notes: { type: "array", items: { type: "string" } }
      },
      required: ["funds"]
    }
  };

  const developerInstructions = `
You are a buy-side research assistant for Indian mutual funds.
Return specific schemes in the "${category}" category for "${country}" with citations.

Rules:
- Prefer "${plan}" plan data.
- HARD FILTERS: expense_ratio <= ${max_expense_ratio}% and AUM >= ${min_aum_cr} Cr (if published).
- Index funds: include tracking_diff_1y and tracking_error_1y when available; prioritize lower values. Index: "${index}" if relevant.
- Active funds: prefer manager_tenure >= 3y; good downside_capture_3y (<100% vs benchmark) when available.
- Include >= 2 citations per fund (AMC factsheet/AMFI/exchange/SEBI/reputable research portals). No blogs as sole source.
- If you cannot find enough that pass filters, return fewer and explain in notes.
- Be concise and factual in rationale (no marketing language).
`;

  // Use the Responses API with built-in web_search and structured output
  const resp = await client.responses.create({
    model: "gpt-4o", // or gpt-4o-mini for lower cost
    instructions: developerInstructions,
    input: [
      {
        role: "user",
        content: [
          { type: "input_text", text: `Criteria JSON:\n${JSON.stringify({ country, category, risk, plan, max_expense_ratio, min_aum_cr, index, max_candidates })}` }
        ]
      }
    ],
    tools: [{ type: "web_search" }], // lets the model search and cite
    response_format: { type: "json_schema", json_schema: RESULT_SCHEMA },
    temperature: 0.1
  });

  const text = (resp as any).output_text ?? JSON.stringify((resp as any).output, null, 2);

  let data: any;
  try { data = JSON.parse(text); }
  catch {
    return new Response(JSON.stringify({ error: "Model returned non‑JSON", raw: text }), { status: 502, headers: { ...corsHeaders(), "Content-Type": "application/json" } });
  }

  const disclaimer = "Educational tool — not financial advice. Mutual fund investments are subject to market risks. Consult a SEBI-registered advisor.";

  return Response.json(
    { disclaimer, criteria_echo: { country, category, risk, plan, max_expense_ratio, min_aum_cr, index, max_candidates }, ...data },
    { headers: corsHeaders() }
  );
}
