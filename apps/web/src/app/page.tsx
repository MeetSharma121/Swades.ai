"use client";

import { useEffect, useState } from "react";

const API = "http://localhost:8787/api/v1/runs";

export default function HomePage() {
  const [runs, setRuns] = useState<any[]>([]);

  useEffect(() => {
    fetch(API).then((r) => r.json()).then(setRuns);
  }, []);

  return (
    <main>
      <h1>HEALOSBENCH Runs</h1>
      <p>
        <a href="/compare">Compare two runs</a>
      </p>
      {runs.map((run) => (
        <div className="card" key={run.id}>
          <div>
            <b>{run.strategy}</b> · <code>{run.model}</code> · {run.status}
          </div>
          <div>Aggregate F1: {Number(run.aggregate?.aggregate_f1 ?? 0).toFixed(3)}</div>
          <div>Cost: ${Number(run.cost_usd ?? 0).toFixed(4)}</div>
          <div>Duration: {run.duration_ms} ms</div>
          <a href={`/runs/${run.id}`}>Open run</a>
        </div>
      ))}
    </main>
  );
}
