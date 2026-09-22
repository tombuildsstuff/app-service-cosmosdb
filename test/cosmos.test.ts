import { describe, it, expect } from "vitest";
import type { CosmosClient, Container } from "@azure/cosmos";
import type { Config } from "../src/config";
import { initContainer } from "../src/cosmos";

const cfg: Config = {
  port: 3000,
  cosmos: {
    endpoint: "https://x",
    authMode: "aad",
    database: "tasksdb",
    container: "tasks",
    tlsInsecure: false,
  },
};

// Inject an instant sleep so retry tests don't wait on real backoff.
const noSleep = () => Promise.resolve();

// A fake CosmosClient whose database creation throws each supplied error in
// turn, then succeeds. Everything downstream (container creation) succeeds.
function clientThatFails(failures: unknown[]) {
  let attempts = 0;
  const container = { id: "tasks" } as unknown as Container;
  const database = {
    containers: { createIfNotExists: async () => ({ container }) },
  };
  const client = {
    databases: {
      createIfNotExists: async () => {
        const i = attempts++;
        if (i < failures.length) throw failures[i];
        return { database };
      },
    },
  } as unknown as CosmosClient;
  return { client, container, attempts: () => attempts };
}

const transient = (code: string | number, message = String(code)) =>
  Object.assign(new Error(message), { code });

describe("initContainer retry", () => {
  it("retries a transient DNS failure and then succeeds", async () => {
    const err = transient("EAI_AGAIN", "getaddrinfo EAI_AGAIN cosmos.locally");
    const { client, container, attempts } = clientThatFails([err, err]);

    const result = await initContainer(client, cfg, { sleep: noSleep });

    expect(result).toBe(container);
    expect(attempts()).toBe(3);
  });

  it("gives up after maxAttempts and throws the last error", async () => {
    const err = transient("EAI_AGAIN");
    const { client, attempts } = clientThatFails([err, err, err, err, err]);

    await expect(
      initContainer(client, cfg, { sleep: noSleep, maxAttempts: 3 }),
    ).rejects.toThrow(/EAI_AGAIN/);
    expect(attempts()).toBe(3);
  });

  it("retries a 403 under managed identity while the RBAC grant propagates", async () => {
    // At cold start the Cosmos data-plane role assignment can lag the app: the
    // grant is created after the web app and Azure takes time to propagate it,
    // so an initial Forbidden clears itself once the role lands.
    const err = transient(403, "Forbidden");
    const { client, container, attempts } = clientThatFails([err, err]);

    const result = await initContainer(client, cfg, { sleep: noSleep });

    expect(result).toBe(container);
    expect(attempts()).toBe(3);
  });

  it("does not retry a 403 when authenticating with a key", async () => {
    // With a key there is no role assignment to propagate, so a Forbidden is a
    // real permission error; retrying only delays the inevitable failure.
    const keyCfg: Config = {
      ...cfg,
      cosmos: { ...cfg.cosmos, authMode: "key", key: "secret" },
    };
    const err = transient(403, "Forbidden");
    const { client, attempts } = clientThatFails([err, err]);

    await expect(
      initContainer(client, keyCfg, { sleep: noSleep }),
    ).rejects.toThrow(/Forbidden/);
    expect(attempts()).toBe(1);
  });
});
