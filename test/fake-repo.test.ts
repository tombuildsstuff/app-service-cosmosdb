import { describe, it, expect } from "vitest";
import { FakeTaskRepository } from "./fake-repo";

describe("FakeTaskRepository", () => {
  it("creates and lists tasks", async () => {
    const repo = new FakeTaskRepository();
    const t = await repo.create({ title: "buy milk" });
    expect(t.id).toBeTruthy();
    expect(t.title).toBe("buy milk");
    expect(t.completed).toBe(false);
    expect(t.createdAt).toBeTruthy();
    expect(await repo.list()).toEqual([t]);
  });

  it("gets by id and returns undefined when missing", async () => {
    const repo = new FakeTaskRepository();
    const t = await repo.create({ title: "a" });
    expect(await repo.get(t.id)).toEqual(t);
    expect(await repo.get("nope")).toBeUndefined();
  });

  it("updates fields and returns undefined when missing", async () => {
    const repo = new FakeTaskRepository();
    const t = await repo.create({ title: "a" });
    const updated = await repo.update(t.id, { completed: true, title: "b" });
    expect(updated).toMatchObject({ id: t.id, title: "b", completed: true });
    expect(await repo.update("nope", { completed: true })).toBeUndefined();
  });

  it("deletes and reports whether it existed", async () => {
    const repo = new FakeTaskRepository();
    const t = await repo.create({ title: "a" });
    expect(await repo.delete(t.id)).toBe(true);
    expect(await repo.delete(t.id)).toBe(false);
    expect(await repo.list()).toEqual([]);
  });
});
