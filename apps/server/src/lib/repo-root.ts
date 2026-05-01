import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const marker = path.join("data", "schema.json");

/**
 * Resolves monorepo root so `data/` works whether you start the server from
 * repo root or `apps/server` (e.g. Turbo).
 */
export function getRepoRoot(): string {
  if (process.env.HEALOSBENCH_ROOT) {
    const root = path.resolve(process.env.HEALOSBENCH_ROOT);
    if (!existsSync(path.join(root, marker))) {
      throw new Error(`HEALOSBENCH_ROOT is set but ${path.join(root, marker)} was not found`);
    }
    return root;
  }

  let dir = path.dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 14; i++) {
    if (existsSync(path.join(dir, marker))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  const cwd = process.cwd();
  if (existsSync(path.join(cwd, marker))) return cwd;

  throw new Error(
    `Could not find ${marker}. Clone the full repo (with data/) or set HEALOSBENCH_ROOT to the monorepo root.`
  );
}
