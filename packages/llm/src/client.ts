import Anthropic from "@anthropic-ai/sdk";
import type { ExtractionSchema, Strategy, AttemptTrace } from "@healosbench/shared";
import { buildSystemPrompt, hashPrompt } from "./prompts";

export interface ExtractInput {
  transcript: string;
  transcriptId: string;
  strategy: Strategy;
  model: string;
  validate: (candidate: unknown) => { ok: boolean; errors: string[] };
}

export interface ExtractResult {
  output: ExtractionSchema | null;
  attempts: AttemptTrace[];
  promptHash: string;
}

const toolDef = {
  name: "submit_extraction",
  description: "Submit structured extraction output",
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: ["chief_complaint", "vitals", "medications", "diagnoses", "plan", "follow_up"],
    properties: {
      chief_complaint: { type: "string" },
      vitals: {
        type: "object",
        required: ["bp", "hr", "temp_f", "spo2"],
        properties: {
          bp: { type: ["string", "null"] },
          hr: { type: ["number", "null"] },
          temp_f: { type: ["number", "null"] },
          spo2: { type: ["number", "null"] }
        }
      },
      medications: {
        type: "array",
        items: {
          type: "object",
          required: ["name", "dose", "frequency", "route"],
          properties: {
            name: { type: "string" },
            dose: { type: "string" },
            frequency: { type: "string" },
            route: { type: "string" }
          }
        }
      },
      diagnoses: {
        type: "array",
        items: {
          type: "object",
          required: ["description"],
          properties: { description: { type: "string" }, icd10: { type: ["string", "null"] } }
        }
      },
      plan: { type: "array", items: { type: "string" } },
      follow_up: {
        type: "object",
        required: ["interval_days", "reason"],
        properties: {
          interval_days: { type: ["integer", "null"] },
          reason: { type: ["string", "null"] }
        }
      }
    }
  }
} as const;

export async function extractStructured(input: ExtractInput): Promise<ExtractResult> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const systemPrompt = buildSystemPrompt(input.strategy);
  const promptHash = hashPrompt(systemPrompt);
  const attempts: AttemptTrace[] = [];
  let feedback = "";

  for (let i = 1; i <= 3; i++) {
    const msg = await anthropic.messages.create({
      model: input.model,
      max_tokens: 1200,
      system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
      tools: [toolDef],
      messages: [
        {
          role: "user",
          content: `Transcript (${input.transcriptId}):\n${input.transcript}\n${feedback}\nReturn by calling submit_extraction.`
        }
      ]
    });

    const toolUse = msg.content.find((c) => c.type === "tool_use");
    const candidate = toolUse?.type === "tool_use" ? toolUse.input : null;
    const validation = input.validate(candidate);
    attempts.push({
      attempt: i,
      promptHash,
      request: { strategy: input.strategy, transcriptId: input.transcriptId },
      response: candidate,
      validationErrors: validation.errors,
      usage: {
        input_tokens: msg.usage.input_tokens,
        output_tokens: msg.usage.output_tokens,
        cache_read_input_tokens: msg.usage.cache_read_input_tokens ?? 0,
        cache_creation_input_tokens: msg.usage.cache_creation_input_tokens ?? 0
      }
    });
    if (validation.ok) return { output: candidate as ExtractionSchema, attempts, promptHash };
    feedback = `Validation errors from previous attempt:\n${validation.errors.join("\n")}\nFix and call tool again.`;
  }
  return { output: null, attempts, promptHash };
}
