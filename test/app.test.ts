import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { FakeTaskRepository } from "./fake-repo";

function app() {
  return createApp(new FakeTaskRepository());
}

describe("app", () => {
  let server: ReturnType<typeof app>;
  beforeEach(() => {
    server = app();
  });

  it("GET /healthz returns 200", async () => {
    const res = await request(server).get("/healthz");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("GET /api/tasks starts empty", async () => {
    const res = await request(server).get("/api/tasks");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("POST /api/tasks creates a task", async () => {
    const res = await request(server).post("/api/tasks").send({ title: "hello" });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ title: "hello", completed: false });
    expect(res.body.id).toBeTruthy();
  });

  it("POST /api/tasks rejects an empty title", async () => {
    const res = await request(server).post("/api/tasks").send({ title: "" });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("POST /api/tasks rejects a missing title", async () => {
    const res = await request(server).post("/api/tasks").send({});
    expect(res.status).toBe(400);
  });

  it("GET /api/tasks/:id returns 404 when missing", async () => {
    const res = await request(server).get("/api/tasks/nope");
    expect(res.status).toBe(404);
  });

  it("full lifecycle: create, get, patch, delete", async () => {
    const created = await request(server).post("/api/tasks").send({ title: "a" });
    const id = created.body.id;

    const got = await request(server).get(`/api/tasks/${id}`);
    expect(got.status).toBe(200);
    expect(got.body.title).toBe("a");

    const patched = await request(server)
      .patch(`/api/tasks/${id}`)
      .send({ completed: true });
    expect(patched.status).toBe(200);
    expect(patched.body.completed).toBe(true);

    const deleted = await request(server).delete(`/api/tasks/${id}`);
    expect(deleted.status).toBe(204);

    const gone = await request(server).get(`/api/tasks/${id}`);
    expect(gone.status).toBe(404);
  });

  it("PATCH /api/tasks/:id returns 404 when missing", async () => {
    const res = await request(server).patch("/api/tasks/nope").send({ completed: true });
    expect(res.status).toBe(404);
  });

  it("PATCH /api/tasks/:id rejects an invalid completed type", async () => {
    const created = await request(server).post("/api/tasks").send({ title: "a" });
    const res = await request(server)
      .patch(`/api/tasks/${created.body.id}`)
      .send({ completed: "yes" });
    expect(res.status).toBe(400);
  });

  it("DELETE /api/tasks/:id returns 404 when missing", async () => {
    const res = await request(server).delete("/api/tasks/nope");
    expect(res.status).toBe(404);
  });

  it("repository error is forwarded to error handler and returns 500", async () => {
    // Stub repository that rejects on list()
    const throwingRepo = {
      list: async () => {
        throw new Error("Cosmos connection failed");
      },
    };
    const errorApp = createApp(throwingRepo as any);
    const res = await request(errorApp).get("/api/tasks");
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "internal server error" });
  });
});
