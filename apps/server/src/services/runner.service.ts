import { randomUUID } from "node:crypto";
import { EventEmitter } from "node:events";
import { db } from "@healosbench/db";
import type { Strategy, TokenUsage } from "@healosbench/shared";
import { loadDataset } from "./dataset.service";
import { evaluateCase, findHallucinations } from "./evaluate.service";
import { extractService } from "./extract.service";

export const runEvents = new EventEmitter();
export const makeCacheKey = (strategy: string, model: string, transcriptId: string) =>
  `${strategy}:${model}:${transcriptId}`;
export const resumablePending = <T extends { status: string }>(rows: T[]) => rows.filter((r) => r.status !== "completed");

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function withBackoff<T>(fn: () => Promise<T>, retries = 4): Promise<T> {
  let delay = 500;
  let lastErr: unknown;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e: any) {
      lastErr = e;
      if (!String(e?.message ?? "").includes("429")) throw e;
      await wait(delay);
      delay *= 2;
    }
  }
  throw lastErr;
}

export async function runLimited<T>(items: T[], limit: number, worker: (item: T) => Promise<void>) {
  let idx = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }).map(async () => {
    while (idx < items.length) {
      const cur = items[idx++];
      await worker(cur);
    }
  });
  await Promise.all(runners);
}

export async function createRun(params: { strategy: Strategy; model: string; dataset_filter?: string[] }) {
  const sql = db();
  const id = randomUUID();
  await sql`
    insert into runs (id, strategy, model, status, prompt_hash, aggregate, token_usage)
    values (${id}, ${params.strategy}, ${params.model}, 'queued', '', '{}'::jsonb, '{}'::jsonb)
  `;
  await sql.end();
  void executeRun(id, params, false);
  return { id };
}

export async function resumeRun(id: string) {
  const sql = db();
  const [run] = await sql`select * from runs where id=${id}`;
  await sql.end();
  if (!run) throw new Error("Run not found");
  void executeRun(id, { strategy: run.strategy, model: run.model }, true);
  return { id };
}

async function executeRun(id: string, params: { strategy: Strategy; model: string; dataset_filter?: string[] }, resume: boolean) {
  const sql = db();
  const startedAt = Date.now();
  await sql`update runs set status='running', updated_at=now() where id=${id}`;
  try {
    const dataset = await loadDataset(params.dataset_filter);

    if (!resume) {
      for (const c of dataset) {
        await sql`
        insert into run_cases (id, run_id, transcript_id, status, gold)
        values (${randomUUID()}, ${id}, ${c.transcriptId}, 'pending', ${JSON.stringify(c.gold)}::jsonb)
        on conflict (run_id, transcript_id) do nothing
      `;
      }
    }

    const pending = await sql`select * from run_cases where run_id=${id} and status != 'completed'`;
    let usage: TokenUsage = { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 };
    let hallucinations = 0;
    let schemaFailureCount = 0;

    await runLimited(pending, 5, async (row: any) => {
      const sample = dataset.find((d) => d.transcriptId === row.transcript_id);
      if (!sample) return;
      const key = makeCacheKey(params.strategy, params.model, sample.transcriptId);
      const [cached] = await sql`select * from extraction_cache where key=${key}`;
      const begun = Date.now();
      let output: any = null;
      let attempts: any[] = [];
      let promptHash = "";
      if (cached) {
        output = cached.prediction;
        attempts = cached.attempts ?? [];
        promptHash = cached.prompt_hash;
      } else {
        const extract = await withBackoff(() =>
          extractService({
            transcript: sample.transcript,
            transcriptId: sample.transcriptId,
            strategy: params.strategy,
            model: params.model
          })
        );
        output = extract.output;
        attempts = extract.attempts;
        promptHash = extract.promptHash;
        await sql`
          insert into extraction_cache (key, transcript_id, strategy, model, prediction, attempts, prompt_hash)
          values (${key}, ${sample.transcriptId}, ${params.strategy}, ${params.model}, ${JSON.stringify(output)}::jsonb, ${JSON.stringify(
            attempts
          )}::jsonb, ${promptHash})
          on conflict (key) do nothing
        `;
      }

      const scores = evaluateCase(output, sample.gold);
      const halluc = findHallucinations(output, sample.transcript);
      const schemaFailed = output === null;
      hallucinations += halluc.length;
      if (schemaFailed) schemaFailureCount++;
      for (const a of attempts) {
        usage.input_tokens += a.usage?.input_tokens ?? 0;
        usage.output_tokens += a.usage?.output_tokens ?? 0;
        usage.cache_read_input_tokens += a.usage?.cache_read_input_tokens ?? 0;
        usage.cache_creation_input_tokens += a.usage?.cache_creation_input_tokens ?? 0;
      }

      await sql`
        update run_cases
        set status='completed',
            prediction=${JSON.stringify(output)}::jsonb,
            scores=${JSON.stringify(scores)}::jsonb,
            hallucinations=${JSON.stringify(halluc)}::jsonb,
            schema_failed=${schemaFailed},
            attempts=${JSON.stringify(attempts)}::jsonb,
            wall_time_ms=${Date.now() - begun}
        where run_id=${id} and transcript_id=${sample.transcriptId}
      `;
      runEvents.emit(`run:${id}`, { transcriptId: sample.transcriptId, scores, done: false });
      await sql`update runs set prompt_hash=${promptHash} where id=${id}`;
    });

    const cases = await sql`select scores from run_cases where run_id=${id}`;
    const agg: Record<string, number> = {};
    for (const r of cases as any[]) {
      const s = r.scores as Record<string, number>;
      for (const [k, v] of Object.entries(s)) agg[k] = (agg[k] ?? 0) + v;
    }
    for (const k of Object.keys(agg)) agg[k] = agg[k] / (cases.length || 1);
    const durationMs = Date.now() - startedAt;
    const costUsd = usage.input_tokens * 0.0000008 + usage.output_tokens * 0.000004 + usage.cache_creation_input_tokens * 0.0000008;
    await sql`
    update runs
    set status='completed',
        aggregate=${JSON.stringify(agg)}::jsonb,
        token_usage=${JSON.stringify(usage)}::jsonb,
        cost_usd=${costUsd},
        duration_ms=${durationMs},
        schema_failure_count=${schemaFailureCount},
        hallucination_count=${hallucinations},
        updated_at=now()
    where id=${id}
  `;
    runEvents.emit(`run:${id}`, { done: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await sql`
      update runs
      set status='failed', aggregate=${JSON.stringify({ error: message })}::jsonb, updated_at=now()
      where id=${id}
    `;
    runEvents.emit(`run:${id}`, { done: true, error: message });
    console.error(`run ${id} failed:`, e);
  } finally {
    await sql.end();
  }
}

export async function listRuns() {
  const sql = db();
  const rows = await sql`select * from runs order by created_at desc`;
  await sql.end();
  return rows;
}

export async function getRunDetail(id: string) {
  const sql = db();
  const [run] = await sql`select * from runs where id=${id}`;
  const cases = await sql`select * from run_cases where run_id=${id} order by transcript_id asc`;
  await sql.end();
  return { run, cases };
}
