import type { Strategy } from "@healosbench/shared";
import { extractStructured } from "@healosbench/llm";
import { validateExtraction } from "./schema.service";

export async function extractService(args: {
  transcript: string;
  transcriptId: string;
  strategy: Strategy;
  model: string;
}) {
  return extractStructured({
    transcript: args.transcript,
    transcriptId: args.transcriptId,
    strategy: args.strategy,
    model: args.model,
    validate: validateExtraction
  });
}

export function simulateRetryValidation(candidates: unknown[]): { successAt: number; errors: string[][] } {
  const errors: string[][] = [];
  for (let i = 0; i < Math.min(3, candidates.length); i++) {
    const result = validateExtraction(candidates[i]);
    errors.push(result.errors);
    if (result.ok) return { successAt: i + 1, errors };
  }
  return { successAt: -1, errors };
}
