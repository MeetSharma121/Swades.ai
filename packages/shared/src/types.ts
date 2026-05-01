export type Strategy = "zero_shot" | "few_shot" | "cot";

export interface Medication {
  name: string;
  dose: string;
  frequency: string;
  route: string;
}

export interface Diagnosis {
  description: string;
  icd10?: string | null;
}

export interface ExtractionSchema {
  chief_complaint: string;
  vitals: {
    bp: string | null;
    hr: number | null;
    temp_f: number | null;
    spo2: number | null;
  };
  medications: Medication[];
  diagnoses: Diagnosis[];
  plan: string[];
  follow_up: {
    interval_days: number | null;
    reason: string | null;
  };
}

export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens: number;
  cache_creation_input_tokens: number;
}

export interface AttemptTrace {
  attempt: number;
  promptHash: string;
  request: {
    strategy: Strategy;
    transcriptId: string;
  };
  response: unknown;
  validationErrors: string[];
  usage: TokenUsage;
}

export interface CaseResult {
  transcriptId: string;
  prediction: ExtractionSchema | null;
  scores: Record<string, number>;
  hallucinations: string[];
  schemaFailed: boolean;
  attempts: AttemptTrace[];
  wallTimeMs: number;
}

export interface RunSummary {
  id: string;
  strategy: Strategy;
  model: string;
  status: "queued" | "running" | "completed" | "failed";
  aggregate: Record<string, number>;
  costUsd: number;
  durationMs: number;
  schemaFailureCount: number;
  hallucinationCount: number;
  tokenUsage: TokenUsage;
  promptHash: string;
}
