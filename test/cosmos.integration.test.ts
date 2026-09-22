import { randomUUID } from "node:crypto";
import { describe, it, expect, beforeAll } from "vitest";
import { loadConfig } from "../src/config";
import { createCosmosClient, initContainer } from "../src/cosmos";
import { CosmosTaskRepository } from "../src/tasks";

const run = process.env.RUN_INTEGRATION === "1";

describe.skipIf(!run)("CosmosTaskRepository (integration)", () => {
  let repo: CosmosTaskRepository;

  beforeAll(async () => {
    const cfg = loadConfig();
    const client = createCosmosClient(cfg);
    const container = await initContainer(client, cfg);
    repo = new CosmosTaskRepository(container);
  });

  it("round-trips a task", async () => {
    const created = await repo.create({ title: "integration" });
    expect(await repo.get(created.id)).toMatchObject({ title: "integration" });

    const updated = await repo.update(created.id, { completed: true });
    expect(updated?.completed).toBe(true);

    expect(await repo.delete(created.id)).toBe(true);
    expect(await repo.get(created.id)).toBeUndefined();
  });

  it("update() on a non-existent id returns undefined", async () => {
    expect(await repo.update(randomUUID(), { completed: true })).toBeUndefined();
  });
});
