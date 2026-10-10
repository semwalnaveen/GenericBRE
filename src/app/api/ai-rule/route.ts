import { NextRequest, NextResponse } from "next/server";
import { AI_ACTION_TYPES, AI_OPERATORS, AiRuleDraft, AiRuleRequest, AiRuleResponse, sanitizeDraft } from "@/lib/ai-rule";

// POST /api/ai-rule — plain English → draft rule for the Rule Builder.
//
// The API key stays on the server (ANTHROPIC_API_KEY in .env.local); the
// browser only ever sees the validated draft. Claude is forced to answer via
// a tool call so the output is always JSON matching our schema, never prose.

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5";
const MAX_TEXT = 1000;

const actionSchema = {
  type: "object",
  properties: {
    type: { type: "string", enum: AI_ACTION_TYPES },
    reasonCode: { type: "string", description: "UPPER_SNAKE_CASE code, e.g. AGE_BELOW_MIN" },
    message: { type: "string", description: "Short user-facing reason" },
    outputField: { type: "string", description: "Field key — Assign Value only" },
    outputValue: { type: "string", description: "Value to assign — Assign Value only" },
  },
  required: ["type"],
};

const BUILD_RULE_TOOL = {
  name: "build_rule",
  description: "Return the business rule described by the user, using only the provided field keys.",
  input_schema: {
    type: "object",
    properties: {
      name: { type: "string", description: "Short rule name, Title Case, max 8 words" },
      logic: { type: "string", enum: ["AND", "OR"] },
      conditions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            field: { type: "string", description: "Exact field key from the catalog" },
            operator: { type: "string", enum: AI_OPERATORS },
            value: { type: "string", description: "Plain number (no ₹, commas or units), option text, or comma-separated list for 'in'" },
            value2: { type: "string", description: "Upper bound — 'between' only" },
          },
          required: ["field", "operator", "value"],
        },
      },
      actions: { type: "array", items: actionSchema, description: "THEN — when conditions match" },
      elseActions: { type: "array", items: actionSchema, description: "ELSE — only if the user described an otherwise case" },
      explanation: { type: "string", description: "One sentence restating the rule in plain English" },
      warnings: { type: "array", items: { type: "string" }, description: "Assumptions made or parts that could not be mapped" },
    },
    required: ["name", "logic", "conditions", "actions", "elseActions", "explanation", "warnings"],
  },
};

function systemPrompt(domain: string, fields: AiRuleRequest["fields"]) {
  const catalog = fields
    .map((f) => {
      const extra = [f.unit && `unit ${f.unit}`, f.options?.length && `options: ${f.options.join(" | ")}`].filter(Boolean).join("; ");
      return `- ${f.key} (${f.type}) "${f.label}"${extra ? ` — ${extra}` : ""}`;
    })
    .join("\n");

  return `You convert business rules written in plain English (or Hinglish) into a structured rule for a ${domain} business rules engine.

Available fields — use ONLY these exact keys:
${catalog}

Guidelines:
- Numbers are plain digits. "50 lakh" = 5000000, "1 crore" = 10000000, "50k" = 50000. Strip ₹, commas and units.
- "below/under/less than" → "<", "at most/up to" → "<=", "above/over/more than" → ">", "at least/minimum" → ">=".
- For enum fields, the value must be one of the listed options exactly.
- "Reject/decline/deny" → Reject; "approve/accept" → Approve; "review/refer/manual check" → Flag for Review.
- Give Reject and Flag for Review a reasonCode and a short message.
- Leave elseActions empty unless the user describes what happens otherwise.
- If something cannot be mapped to a field, leave it out and explain in warnings. Never invent field keys.`;
}

export async function POST(req: NextRequest): Promise<NextResponse<AiRuleResponse>> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: "AI is not configured. Add ANTHROPIC_API_KEY to .env.local and restart the dev server." }, { status: 503 });
  }

  let body: AiRuleRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Request body must be valid JSON." }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  const fields = Array.isArray(body.fields) ? body.fields.filter((f) => f && typeof f.key === "string") : [];
  if (!text) return NextResponse.json({ ok: false, error: "Describe the rule first." }, { status: 400 });
  if (text.length > MAX_TEXT) return NextResponse.json({ ok: false, error: `Keep the description under ${MAX_TEXT} characters.` }, { status: 400 });
  if (fields.length === 0) return NextResponse.json({ ok: false, error: "No fields are available for this industry." }, { status: 400 });

  let res: Response;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        system: systemPrompt(String(body.domain ?? ""), fields),
        tools: [BUILD_RULE_TOOL],
        tool_choice: { type: "tool", name: "build_rule" },
        messages: [{ role: "user", content: text }],
      }),
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Couldn't reach the AI service. Check your internet connection." }, { status: 502 });
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("[ai-rule] Anthropic error", res.status, detail);
    const error =
      res.status === 401 ? "The API key was rejected — check ANTHROPIC_API_KEY."
      : res.status === 429 ? "Rate limit reached — wait a moment and try again."
      : res.status === 400 && detail.includes("credit") ? "Your API credit balance is too low."
      : "The AI service returned an error. Try again.";
    return NextResponse.json({ ok: false, error }, { status: 502 });
  }

  const data = await res.json();
  const toolUse = Array.isArray(data.content) ? data.content.find((b: { type: string }) => b.type === "tool_use") : undefined;
  if (!toolUse?.input) {
    return NextResponse.json({ ok: false, error: "The AI didn't return a rule. Try rephrasing." }, { status: 502 });
  }

  const draft = sanitizeDraft(toolUse.input as AiRuleDraft, fields);
  if (draft.conditions.length === 0 && draft.actions.length === 0) {
    return NextResponse.json({ ok: false, error: draft.warnings[0] ?? "Couldn't map that description to any fields." }, { status: 422 });
  }
  return NextResponse.json({ ok: true, draft });
}
