import { Router, type Request, type Response, type NextFunction, type RequestHandler } from "express";
import type { TaskRepository, TaskUpdate } from "./tasks";

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

// Wrapper to forward async handler rejections to error middleware.
// Express 4 doesn't auto-forward rejected promises, so we manually forward via next(err).
const wrap = (fn: RequestHandler): RequestHandler => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export function tasksRouter(repo: TaskRepository): Router {
  const router = Router();

  router.get("/", wrap(async (_req: Request, res: Response) => {
    res.json(await repo.list());
  }));

  router.post("/", wrap(async (req: Request, res: Response) => {
    const { title } = req.body ?? {};
    if (!isNonEmptyString(title)) {
      return res.status(400).json({ error: "title is required and must be a non-empty string" });
    }
    const task = await repo.create({ title: title.trim() });
    res.status(201).json(task);
  }));

  router.get("/:id", wrap(async (req: Request, res: Response) => {
    const task = await repo.get(req.params.id);
    if (!task) return res.status(404).json({ error: "task not found" });
    res.json(task);
  }));

  router.patch("/:id", wrap(async (req: Request, res: Response) => {
    const body = req.body ?? {};
    const patch: TaskUpdate = {};

    if ("title" in body) {
      if (!isNonEmptyString(body.title)) {
        return res.status(400).json({ error: "title must be a non-empty string" });
      }
      patch.title = body.title.trim();
    }
    if ("completed" in body) {
      if (typeof body.completed !== "boolean") {
        return res.status(400).json({ error: "completed must be a boolean" });
      }
      patch.completed = body.completed;
    }

    const updated = await repo.update(req.params.id, patch);
    if (!updated) return res.status(404).json({ error: "task not found" });
    res.json(updated);
  }));

  router.delete("/:id", wrap(async (req: Request, res: Response) => {
    const existed = await repo.delete(req.params.id);
    if (!existed) return res.status(404).json({ error: "task not found" });
    res.status(204).end();
  }));

  return router;
}
