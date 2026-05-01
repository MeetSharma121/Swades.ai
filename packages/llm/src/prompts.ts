import { createHash } from "crypto";
import type { Strategy } from "@healosbench/shared";

const FEW_SHOT_BLOCK = `
Example transcript:
"Patient complains of cough for 4 days. Vitals: BP 122/78, HR 88, temp 99.2 F, SpO2 97%. Medications: albuterol 2 puffs q4h prn inhaled. Assessment: viral URI. Plan: hydration, rest. Follow up in 5 days for breathing check."
Expected extraction:
{"chief_complaint":"cough","vitals":{"bp":"122/78","hr":88,"temp_f":99.2,"spo2":97},"medications":[{"name":"albuterol","dose":"2 puffs","frequency":"q4h prn","route":"inhaled"}],"diagnoses":[{"description":"viral URI","icd10":"J06.9"}],"plan":["hydration","rest"],"follow_up":{"interval_days":5,"reason":"breathing check"}}
`;

export function buildSystemPrompt(strategy: Strategy): string {
  const base =
    "You are a clinical extraction engine. Extract only grounded facts from transcript into the required schema. If not present set nullable fields to null and arrays to empty arrays.";
  if (strategy === "zero_shot") return base;
  if (strategy === "few_shot") return `${base}\n${FEW_SHOT_BLOCK}`;
  return `${base}\nThink through transcript evidence internally before calling the tool. Do not expose chain-of-thought.`;
}

export function hashPrompt(systemPrompt: string): string {
  return createHash("sha256").update(systemPrompt).digest("hex").slice(0, 16);
}
