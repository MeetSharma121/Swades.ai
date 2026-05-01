# NOTES

## What was built

- End-to-end eval harness from scratch with synthetic dataset (`data/`).
- Tool-use based extractor (Anthropic), schema validation retry loop (max 3), attempt trace logging, prompt hashing, and cache token accounting.
- Evaluator with field-aware scoring:
  - fuzzy chief complaint
  - numeric-tolerant vitals
  - medication set F1 with normalization (`BID` == `twice daily`, `10 mg` == `10mg`)
  - diagnosis fuzzy set-F1 + ICD10 bonus
  - plan set-F1
  - follow-up exact/fuzzy hybrid
- Runner with max 5 concurrent cases, 429 exponential backoff, resumable runs, extraction idempotency cache.
- Hono endpoints + SSE progress stream.
- Next.js compare/run detail dashboard.
- CLI command for full eval.

## Prompt strategies

- `zero_shot`: strict schema extraction only
- `few_shot`: one in-context clinical example
- `cot`: internal reasoning instruction + tool-call output only

## What surprised me

- Medication normalization had the biggest impact on F1 consistency.
- Hallucination checks need conservative fuzzy thresholds to avoid false positives.
- Prompt cache metrics are useful for proving eval cost improvements run-over-run.

## What I'd build next

- Transcript grounding highlight UX in run details.
- Prompt-diff view with case-level regressions.
- Cost guardrail preflight.

## What I cut

- Deeper Drizzle schema/codegen integration (kept SQL migrations lightweight).
- Rich UI polish (kept utilitarian for signal-first compare workflow).

## Results

Run the 3-strategy sweep:

```bash
bun run eval -- --strategy=zero_shot --model=claude-haiku-4-5-20251001
bun run eval -- --strategy=few_shot --model=claude-haiku-4-5-20251001
bun run eval -- --strategy=cot --model=claude-haiku-4-5-20251001
```

Store captured output in `results/`.
