import postgres from "postgres";

export function db() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");
  return postgres(url, { max: 10 });
}

export async function migrate() {
  const sql = db();
  await sql`
    create table if not exists runs (
      id text primary key,
      strategy text not null,
      model text not null,
      status text not null,
      prompt_hash text not null,
      aggregate jsonb not null default '{}'::jsonb,
      token_usage jsonb not null default '{}'::jsonb,
      cost_usd double precision not null default 0,
      duration_ms integer not null default 0,
      schema_failure_count integer not null default 0,
      hallucination_count integer not null default 0,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `;
  await sql`
    create table if not exists run_cases (
      id text primary key,
      run_id text not null references runs(id) on delete cascade,
      transcript_id text not null,
      status text not null,
      prediction jsonb,
      gold jsonb,
      scores jsonb not null default '{}'::jsonb,
      hallucinations jsonb not null default '[]'::jsonb,
      schema_failed boolean not null default false,
      attempts jsonb not null default '[]'::jsonb,
      wall_time_ms integer not null default 0,
      unique (run_id, transcript_id)
    );
  `;
  await sql`
    create table if not exists extraction_cache (
      key text primary key,
      transcript_id text not null,
      strategy text not null,
      model text not null,
      prediction jsonb,
      attempts jsonb not null default '[]'::jsonb,
      prompt_hash text not null,
      created_at timestamptz not null default now()
    );
  `;
  await sql.end();
}
