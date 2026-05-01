import { describe, expect, test } from "bun:test";
import { evaluateCase, findHallucinations } from "../apps/server/src/services/evaluate.service";
import { simulateRetryValidation } from "../apps/server/src/services/extract.service";
import { makeCacheKey, resumablePending, withBackoff } from "../apps/server/src/services/runner.service";
import { hashPrompt } from "../packages/llm/src/prompts";

const gold = {
  chief_complaint: "headache",
  vitals: { bp: "120/80", hr: 80, temp_f: 98.6, spo2: 98 },
  medications: [{ name: "ibuprofen", dose: "10 mg", frequency: "twice daily", route: "oral" }],
  diagnoses: [{ description: "migraine", icd10: "G43.909" }],
  plan: ["rest", "hydration"],
  follow_up: { interval_days: 7, reason: "symptom review" }
};

describe("eval harness", () => {
  test("set-f1 tiny synthetic correctness", () => {
    const pred = { ...gold, plan: ["rest"] };
    const s = evaluateCase(pred as any, gold as any);
    expect(s.plan_f1).toBeGreaterThan(0.6);
    expect(s.plan_f1).toBeLessThan(0.8);
  });

  test("fuzzy med matching bid twice daily", () => {
    const pred = { ...gold, medications: [{ ...gold.medications[0], frequency: "BID", dose: "10mg" }] };
    const s = evaluateCase(pred as any, gold as any);
    expect(s.medications_f1).toBe(1);
  });

  test("hallucination detector positive", () => {
    const pred = { ...gold, plan: ["start chemotherapy"] };
    const h = findHallucinations(pred as any, "patient has headache and will rest");
    expect(h.length).toBeGreaterThan(0);
  });

  test("hallucination detector negative", () => {
    const h = findHallucinations(gold as any, "headache 120/80 80 98.6 98 ibuprofen 10 mg twice daily oral migraine rest hydration symptom review");
    expect(h.length).toBe(0);
  });

  test("schema-validation retry path succeeds second", () => {
    const bad = { chief_complaint: "x" };
    const ok = gold;
    const r = simulateRetryValidation([bad, ok]);
    expect(r.successAt).toBe(2);
  });

  test("idempotency key stable", () => {
    expect(makeCacheKey("cot", "m", "case_001")).toBe(makeCacheKey("cot", "m", "case_001"));
  });

  test("resumability pending excludes completed", () => {
    const rows = [{ status: "completed" }, { status: "pending" }, { status: "running" }];
    expect(resumablePending(rows).length).toBe(2);
  });

  test("rate-limit backoff retries then succeeds", async () => {
    let count = 0;
    const value = await withBackoff(async () => {
      count++;
      if (count < 3) throw new Error("429 too many requests");
      return 42;
    }, 5);
    expect(value).toBe(42);
    expect(count).toBe(3);
  });

  test("prompt hash stability", () => {
    expect(hashPrompt("abc")).toBe(hashPrompt("abc"));
    expect(hashPrompt("abc")).not.toBe(hashPrompt("abd"));
  });
});
