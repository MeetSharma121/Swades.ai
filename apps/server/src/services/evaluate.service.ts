import type { ExtractionSchema } from "@healosbench/shared";
import { normalizeDose, normalizeFrequency, normalizeText, tokenSetRatio } from "../lib/text";

function exactWithTolerance(a: number | null, b: number | null, tol: number): number {
  if (a === null && b === null) return 1;
  if (a === null || b === null) return 0;
  return Math.abs(a - b) <= tol ? 1 : 0;
}

function setF1(matches: number, predCount: number, goldCount: number): number {
  const p = predCount ? matches / predCount : 1;
  const r = goldCount ? matches / goldCount : 1;
  if (!p && !r) return 0;
  return (2 * p * r) / (p + r);
}

function medicationMatch(a: ExtractionSchema["medications"][number], b: ExtractionSchema["medications"][number]): boolean {
  return (
    tokenSetRatio(a.name, b.name) >= 0.85 &&
    normalizeDose(a.dose) === normalizeDose(b.dose) &&
    normalizeFrequency(a.frequency) === normalizeFrequency(b.frequency)
  );
}

export function findHallucinations(prediction: ExtractionSchema | null, transcript: string): string[] {
  if (!prediction) return [];
  const hay = normalizeText(transcript);
  const values: string[] = [
    prediction.chief_complaint,
    ...(prediction.plan ?? []),
    ...(prediction.medications ?? []).flatMap((m) => [m.name, m.dose, m.frequency, m.route]),
    ...(prediction.diagnoses ?? []).flatMap((d) => [d.description, d.icd10 ?? ""]),
    prediction.follow_up.reason ?? ""
  ].filter(Boolean);
  const misses: string[] = [];
  for (const v of values) {
    const nv = normalizeText(v);
    if (!nv) continue;
    if (hay.includes(nv)) continue;
    if (tokenSetRatio(nv, hay) < 0.4) misses.push(v);
  }
  return misses;
}

export function evaluateCase(pred: ExtractionSchema | null, gold: ExtractionSchema) {
  if (!pred) {
    return {
      chief_complaint: 0,
      vitals: 0,
      medications_f1: 0,
      diagnoses_f1: 0,
      plan_f1: 0,
      follow_up: 0,
      aggregate_f1: 0
    };
  }

  const chief = tokenSetRatio(pred.chief_complaint, gold.chief_complaint);
  const vitals = [
    Number(pred.vitals.bp === gold.vitals.bp),
    exactWithTolerance(pred.vitals.hr, gold.vitals.hr, 0),
    exactWithTolerance(pred.vitals.temp_f, gold.vitals.temp_f, 0.2),
    exactWithTolerance(pred.vitals.spo2, gold.vitals.spo2, 0)
  ].reduce((a, b) => a + b, 0) / 4;

  const medMatches = pred.medications.filter((p) => gold.medications.some((g) => medicationMatch(p, g))).length;
  const medicationsF1 = setF1(medMatches, pred.medications.length, gold.medications.length);

  const dxMatches = pred.diagnoses.reduce((acc, d) => {
    const found = gold.diagnoses.find((g) => tokenSetRatio(d.description, g.description) > 0.85);
    if (!found) return acc;
    const bonus = d.icd10 && found.icd10 && normalizeText(d.icd10) === normalizeText(found.icd10) ? 0.1 : 0;
    return acc + 1 + bonus;
  }, 0);
  const diagnosesF1 = setF1(dxMatches, pred.diagnoses.length, gold.diagnoses.length);

  const planMatches = pred.plan.filter((p) => gold.plan.some((g) => tokenSetRatio(p, g) > 0.8)).length;
  const planF1 = setF1(planMatches, pred.plan.length, gold.plan.length);

  const fuInterval = Number(pred.follow_up.interval_days === gold.follow_up.interval_days);
  const fuReason = tokenSetRatio(pred.follow_up.reason ?? "", gold.follow_up.reason ?? "");
  const followUp = (fuInterval + fuReason) / 2;

  const aggregate = (chief + vitals + medicationsF1 + diagnosesF1 + planF1 + followUp) / 6;
  return {
    chief_complaint: chief,
    vitals,
    medications_f1: medicationsF1,
    diagnoses_f1: diagnosesF1,
    plan_f1: planF1,
    follow_up: followUp,
    aggregate_f1: aggregate
  };
}
