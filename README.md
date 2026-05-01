# HEALOSBENCH

LLM eval harness for structured clinical extraction with:
- Anthropic tool-use extraction + schema retry loop
- Per-field metrics and hallucination checks
- Concurrent run runner with resume + idempotent cache
- Hono API + Next.js dashboard + CLI eval command

## Run

```bash
bun install
cp apps/server/.env.example apps/server/.env
bun run db:push
bun run dev
```

In another terminal:

```bash
bun run eval -- --strategy=zero_shot --model=claude-haiku-4-5-20251001
```

Web:
- Runs: http://localhost:3000
- API: http://localhost:8787/api/v1/runs
