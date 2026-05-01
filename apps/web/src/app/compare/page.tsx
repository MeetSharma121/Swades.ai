"use client";

import { useEffect, useMemo, useState } from "react";

const API = "http://localhost:8787/api/v1/runs";

export default function ComparePage() {
  const [runs, setRuns] = useState<any[]>([]);
  const [a, setA] = useState("");
  const [b, setB] = useState("");

  useEffect(() => {
    fetch(API).then((r) => r.json()).then((rs) => {
      setRuns(rs);
      setA(rs[0]?.id ?? "");
      setB(rs[1]?.id ?? "");
    });
  }, []);

  const ra = runs.find((r) => r.id === a);
  const rb = runs.find((r) => r.id === b);
  const fields = ["chief_complaint", "vitals", "medications_f1", "diagnoses_f1", "plan_f1", "follow_up", "aggregate_f1"];
  const deltas = useMemo(
    () =>
      fields.map((f) => {
        const av = Number(ra?.aggregate?.[f] ?? 0);
        const bv = Number(rb?.aggregate?.[f] ?? 0);
        return { field: f, a: av, b: bv, delta: bv - av, winner: bv > av ? "Run B" : av > bv ? "Run A" : "Tie" };
      }),
    [ra, rb]
  );

  return (
    <main>
      <h1>Compare Runs</h1>
      <div className="card">
        <label>Run A </label>
        <select value={a} onChange={(e) => setA(e.target.value)}>
          {runs.map((r) => (
            <option key={r.id} value={r.id}>
              {r.strategy} · {r.id.slice(0, 8)}
            </option>
          ))}
        </select>
        <label> Run B </label>
        <select value={b} onChange={(e) => setB(e.target.value)}>
          {runs.map((r) => (
            <option key={r.id} value={r.id}>
              {r.strategy} · {r.id.slice(0, 8)}
            </option>
          ))}
        </select>
      </div>
      <table>
        <thead>
          <tr>
            <th>Field</th>
            <th>Run A</th>
            <th>Run B</th>
            <th>Delta (B-A)</th>
            <th>Winner</th>
          </tr>
        </thead>
        <tbody>
          {deltas.map((d) => (
            <tr key={d.field}>
              <td>{d.field}</td>
              <td>{d.a.toFixed(3)}</td>
              <td>{d.b.toFixed(3)}</td>
              <td>{d.delta.toFixed(3)}</td>
              <td>{d.winner}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
