import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { runsRoute } from "./routes/runs.route";

const app = new Hono();
app.use("*", cors());
app.get("/health", (c) => c.json({ ok: true }));
app.route("/api/v1/runs", runsRoute);

const port = Number(process.env.PORT ?? 8787);
serve({ fetch: app.fetch, port });
console.log(`server listening on ${port}`);
