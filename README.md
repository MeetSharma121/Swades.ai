# 🩺 HEALOSBENCH

> *Turn messy doctor–patient chatter into crisp JSON — then **prove** your prompt actually got better.* 📊

**HEALOSBENCH** is an end-to-end evaluation harness for **structured clinical extraction**: transcripts in, schema-safe JSON out, numbers on the table. No more “vibe checks” when you ship prompt v7. 🚀

---

## ✨ Why this exists

| Without HEALOSBENCH 😬 | With HEALOSBENCH 🎯 |
|------------------------|---------------------|
| “Looks good in the demo” | Per-field scores you can diff |
| Mystery regressions | Compare runs: *who wins on which field?* |
| 429 chaos | Concurrency + backoff that play nice with APIs |
| “Did we pay for that twice?” | Idempotent cache + prompt hash + token/cost rollups |

---

## 🧰 What’s in the box

- **🤖 Extractor** — Anthropic **tool use** (structured output), not “hope the model prints JSON.”
- **🔁 Retry loop** — Schema validation fails? Feed errors back; up to **3** attempts, fully traced.
- **📏 Evaluator** — The *right* metric per field: fuzzy strings, numeric-tolerant vitals, set-F1 for meds/plan/dx, grounding / hallucination flags.
- **🏃 Runner** — Up to **5** cases in flight, resumable runs, SSE progress for the dashboard.
- **🖥️ Dashboard** — Next.js: runs list, drill-down, **compare two runs** with deltas + winner.
- **⌨️ CLI** — One command for CI-friendly evals: `bun run eval -- …`

*All data here is synthetic — no real PHI.* 🧪

---

## 🗺️ Quick links (when dev is up)

| What | Where |
|------|--------|
| 🌐 Web dashboard | [http://localhost:3000](http://localhost:3000) |
| 🔌 API (Hono) | [http://localhost:8787/api/v1/runs](http://localhost:8787/api/v1/runs) |
| ❤️ Health check | [http://localhost:8787/health](http://localhost:8787/health) |

---

## 🏁 Get started (fast path)

```bash
# 1️⃣ Install deps
bun install

# 2️⃣ Env (copy and edit — never commit real keys!)
cp apps/server/.env.example apps/server/.env

# 3️⃣ Database schema
bun run db:push

# 4️⃣ Web + API together
bun run dev
```

**In a second terminal** — kick off an eval (Haiku is the sweet spot for cost vs signal):

```bash
bun run eval -- --strategy=zero_shot --model=claude-haiku-4-5-20251001
```

Want more flavor? Try `few_shot` or `cot` instead of `zero_shot`. 🎨

---

## 📂 File structure

```
healosbench/
├── NOTES.md                              ← Architecture notes + methodology (START HERE) 📖
├── README.md                             ← You are here
├── package.json                          ← Bun workspaces + root scripts (`dev`, `eval`, `db:push`, …)
├── turbo.json
├── tsconfig.json
├── .gitignore
│
├── data/
│   ├── transcripts/case_001.txt–case_050.txt   ← Synthetic doctor–patient chats
│   ├── gold/case_001.json–case_050.json        ← Ground-truth extractions
│   └── schema.json                             ← JSON Schema all outputs must satisfy
│
├── packages/
│   ├── shared/src/
│   │   ├── index.ts                      ← Re-exports
│   │   └── types.ts                      ← Shared types (runs, extractions, traces)
│   │
│   ├── llm/src/
│   │   ├── client.ts                     ← Anthropic tool use + retry loop + cache token fields
│   │   ├── prompts.ts                    ← Strategies: zero_shot / few_shot / cot + prompt hash
│   │   └── index.ts
│   │
│   ├── db/src/
│   │   ├── client.ts                     ← Postgres: runs, run_cases, extraction_cache + migrate
│   │   ├── push.ts                       ← `bun run db:push` entry
│   │   └── index.ts
│   │
│   └── env/src/
│       └── index.ts                      ← Typed env loading (zod)
│
├── apps/
│   ├── server/
│   │   ├── .env.example                  ← ANTHROPIC_API_KEY, DATABASE_URL, PORT
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.ts                  ← Hono server, CORS, `/health`
│   │       ├── routes/
│   │       │   └── runs.route.ts       ← `/api/v1/runs` + SSE stream + resume
│   │       ├── lib/
│   │       │   └── text.ts             ← Normalization + fuzzy / token-set helpers
│   │       └── services/
│   │           ├── extract.service.ts    ← Calls LLM package + schema validation hook
│   │           ├── evaluate.service.ts   ← Per-field metrics, F1, hallucination checks
│   │           ├── runner.service.ts     ← Concurrency, backoff, resumability, idempotency cache
│   │           ├── dataset.service.ts    ← Loads transcripts + gold from `data/`
│   │           └── schema.service.ts     ← Ajv validation against `data/schema.json`
│   │
│   └── web/                              ← Next.js dashboard (runs, detail, compare)
│       ├── next.config.ts
│       ├── next-env.d.ts
│       ├── package.json
│       └── src/app/
│           ├── layout.tsx
│           ├── globals.css
│           ├── page.tsx                  ← Runs list
│           ├── compare/page.tsx          ← Side-by-side run deltas + winner
│           └── runs/[id]/page.tsx      ← Per-case scores + gold vs pred + LLM traces
│
├── scripts/
│   └── eval.ts                           ← CLI eval → POST run, poll until complete, summary table
│
├── tests/
│   └── eval.test.ts                      ← Retry path, fuzzy meds, set-F1, hallucination ±, resume keys, backoff, hash
│
└── results/                              ← Optional: paste CLI / multi-strategy outputs for submission
```

---

## 📝 Notes & writeups

Project notes, methodology, and “what we’d build next” live in **[NOTES.md](./NOTES.md)** — worth a skim if you’re reviewing the submission. 📖

---

## 🤝 Contributing mindset

PRs that make the **compare view** sharper or the **eval metrics** more honest beat cosmetic polish. Still: a little personality in the README never hurt anyone. 😉

---

**Built with:** Bun · Turbo · Hono · Next.js · Postgres · curiosity · ☕
