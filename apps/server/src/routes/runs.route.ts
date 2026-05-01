import { Hono } from "hono";
import { createRun, getRunDetail, listRuns, resumeRun, runEvents } from "../services/runner.service";

export const runsRoute = new Hono();

runsRoute.get("/", async (c) => c.json(await listRuns()));
runsRoute.get("/:id", async (c) => c.json(await getRunDetail(c.req.param("id"))));
runsRoute.post("/", async (c) => {
  const body = await c.req.json();
  return c.json(await createRun(body));
});
runsRoute.post("/:id/resume", async (c) => c.json(await resumeRun(c.req.param("id"))));
runsRoute.get("/:id/stream", async (c) => {
  const id = c.req.param("id");
  const stream = new ReadableStream({
    start(controller) {
      const onMessage = (payload: unknown) => {
        controller.enqueue(`data: ${JSON.stringify(payload)}\n\n`);
      };
      runEvents.on(`run:${id}`, onMessage);
      c.req.raw.signal.addEventListener("abort", () => {
        runEvents.off(`run:${id}`, onMessage);
        controller.close();
      });
    }
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } });
});
