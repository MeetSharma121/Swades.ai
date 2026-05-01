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

## 🧱 Repo layout (bird’s-eye)

```
apps/server   →  Hono API, eval runner, extraction + scoring
apps/web      →  Next.js dashboard (runs, detail, compare)
packages/llm  →  Anthropic client, prompts, tool schema, retries
packages/db   →  Postgres helpers + migrations bootstrap
packages/shared → Types shared across server + web
data/         →  Synthetic transcripts, gold JSON, schema.json
tests/        →  The stuff that actually breaks (retries, F1, resume, etc.)
```

---

## 📝 Notes & writeups

Project notes, methodology, and “what we’d build next” live in **[NOTES.md](./NOTES.md)** — worth a skim if you’re reviewing the submission. 📖

---

## 🤝 Contributing mindset

PRs that make the **compare view** sharper or the **eval metrics** more honest beat cosmetic polish. Still: a little personality in the README never hurt anyone. 😉

---

**Built with:** Bun · Turbo · Hono · Next.js · Postgres · curiosity · ☕
