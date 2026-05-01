import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { ExtractionSchema } from "@healosbench/shared";
import { getRepoRoot } from "../lib/repo-root";

export interface DatasetCase {
  transcriptId: string;
  transcript: string;
  gold: ExtractionSchema;
}

export async function loadDataset(filter?: string[]): Promise<DatasetCase[]> {
  const base = path.join(getRepoRoot(), "data");
  const txDir = path.join(base, "transcripts");
  const ids = (await readdir(txDir))
    .filter((f) => f.endsWith(".txt"))
    .map((f) => f.replace(".txt", ""))
    .sort();
  const chosen = filter?.length ? ids.filter((id) => filter.includes(id)) : ids;

  const out: DatasetCase[] = [];
  for (const id of chosen) {
    const transcript = await readFile(path.join(base, "transcripts", `${id}.txt`), "utf8");
    const goldRaw = await readFile(path.join(base, "gold", `${id}.json`), "utf8");
    out.push({ transcriptId: id, transcript, gold: JSON.parse(goldRaw) as ExtractionSchema });
  }
  return out;
}
