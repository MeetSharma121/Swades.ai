const arg = process.argv.slice(2).join(" ");
const strategy = (arg.match(/--strategy=([a-z_]+)/)?.[1] ?? "zero_shot") as string;
const model = arg.match(/--model=([^ ]+)/)?.[1] ?? "claude-haiku-4-5-20251001";

const base = "http://localhost:8787/api/v1/runs";
const create = await fetch(base, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ strategy, model })
});
const createBody = (await create.json()) as { id?: string; error?: string };
if (!create.ok) {
  console.error("Failed to start run:", create.status, createBody);
  process.exit(1);
}
const id = createBody.id;
if (!id) {
  console.error("No run id in response:", createBody);
  process.exit(1);
}
console.log(`run started: ${id}`);

let done = false;
while (!done) {
  await new Promise((r) => setTimeout(r, 1500));
  const r = await fetch(`${base}/${id}`);
  const detail = (await r.json()) as {
    run?: {
      status?: string;
      id?: string;
      strategy?: string;
      model?: string;
      aggregate?: Record<string, number>;
      duration_ms?: number;
      cost_usd?: number;
    };
    cases?: unknown[];
  };
  if (!r.ok) {
    console.error("Poll failed:", r.status, detail);
    process.exit(1);
  }
  if (detail.run?.status === "failed") {
    console.error("Run failed:", detail.run.aggregate);
    process.exit(1);
  }
  done = detail.run?.status === "completed";
  if (done) {
    console.log("\n=== Eval Summary ===");
    console.table([
      {
        run_id: detail.run.id,
        strategy: detail.run.strategy,
        model: detail.run.model,
        aggregate_f1: Number(detail.run.aggregate?.aggregate_f1 ?? 0).toFixed(3),
        chief: Number(detail.run.aggregate?.chief_complaint ?? 0).toFixed(3),
        vitals: Number(detail.run.aggregate?.vitals ?? 0).toFixed(3),
        meds: Number(detail.run.aggregate?.medications_f1 ?? 0).toFixed(3),
        dx: Number(detail.run.aggregate?.diagnoses_f1 ?? 0).toFixed(3),
        plan: Number(detail.run.aggregate?.plan_f1 ?? 0).toFixed(3),
        follow_up: Number(detail.run.aggregate?.follow_up ?? 0).toFixed(3),
        cost_usd: Number(detail.run.cost_usd).toFixed(4),
        duration_ms: detail.run.duration_ms
      }
    ]);
    break;
  }
}
