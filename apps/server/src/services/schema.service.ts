import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import { readFileSync } from "node:fs";
import path from "node:path";
import { getRepoRoot } from "../lib/repo-root";

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const schemaPath = path.join(getRepoRoot(), "data", "schema.json");
const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
const validateFn = ajv.compile(schema);

export function validateExtraction(candidate: unknown): { ok: boolean; errors: string[] } {
  const ok = validateFn(candidate);
  if (ok) return { ok: true, errors: [] };
  return { ok: false, errors: (validateFn.errors ?? []).map((e) => `${e.instancePath} ${e.message}`.trim()) };
}
