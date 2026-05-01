"use client";

import { use, useEffect, useMemo, useState } from "react";

const API = "http://localhost:8787/api/v1/runs";

export default function RunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [detail, setDetail] = useState<any>(null);
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    fetch(`${API}/${id}`).then((r) => r.json()).then((d) => {
      setDetail(d);
      setSelected(d.cases?.[0] ?? null);
    });
  }, [id]);

  const transcript = useMemo(() => selected?.transcript_id ?? "", [selected]);

  if (!detail?.run) return <main>Loading...</main>;
  return (
    <main>
      <h1>Run {id}</h1>
      <div className="card">
        <div>Status: {detail.run.status}</div>
        <div>Prompt hash: {detail.run.prompt_hash}</div>
        <div>Cache read tokens: {detail.run.token_usage?.cache_read_input_tokens ?? 0}</div>
      </div>
      <h2>Cases</h2>
      <table>
        <thead>
          <tr>
            <th>Case</th>
            <th>Aggregate</th>
            <th>Hallucinations</th>
          </tr>
        </thead>
        <tbody>
          {detail.cases?.map((c: any) => (
            <tr key={c.transcript_id} onClick={() => setSelected(c)}>
              <td>{c.transcript_id}</td>
              <td>{Number(c.scores?.aggregate_f1 ?? 0).toFixed(3)}</td>
              <td>{c.hallucinations?.length ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {selected ? (
        <>
          <h2>Selected: {transcript}</h2>
          <div className="card">
            <h3>Gold JSON</h3>
            <pre>{JSON.stringify(selected.gold, null, 2)}</pre>
          </div>
          <div className="card">
            <h3>Predicted JSON</h3>
            <pre>{JSON.stringify(selected.prediction, null, 2)}</pre>
          </div>
          <div className="card">
            <h3>LLM Attempts</h3>
            <pre>{JSON.stringify(selected.attempts, null, 2)}</pre>
          </div>
        </>
      ) : null}
    </main>
  );
}
