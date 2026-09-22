import path from "node:path";
import express, { type Express, type NextFunction, type Request, type Response } from "express";
import type { TaskRepository } from "./tasks";
import { tasksRouter } from "./routes";

export function createApp(repo: TaskRepository): Express {
  const app = express();
  app.use(express.json());

  app.get("/healthz", (_req, res) => res.json({ status: "ok" }));
  app.use("/api/tasks", tasksRouter(repo));
  app.use(express.static(path.join(__dirname, "..", "public")));

  // Centralised error handler: log detail, return a non-leaking message.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "internal server error" });
  });

  return app;
}
