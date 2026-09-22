import { describe, it, expect } from "vitest";
import { loadConfig } from "../src/config";

const base = {
  COSMOS_ENDPOINT: "https://localhost:8081",
  COSMOS_AUTH_MODE: "key",
  COSMOS_KEY: "abc==",
};

describe("loadConfig", () => {
  it("parses a valid key-mode config with defaults", () => {
    const cfg = loadConfig(base);
    expect(cfg.port).toBe(3000);
    expect(cfg.cosmos.endpoint).toBe("https://localhost:8081");
    expect(cfg.cosmos.authMode).toBe("key");
    expect(cfg.cosmos.key).toBe("abc==");
    expect(cfg.cosmos.database).toBe("tasksdb");
    expect(cfg.cosmos.container).toBe("tasks");
    expect(cfg.cosmos.tlsInsecure).toBe(false);
  });

  it("honours overrides", () => {
    const cfg = loadConfig({
      ...base,
      PORT: "8080",
      COSMOS_DATABASE: "db2",
      COSMOS_CONTAINER: "c2",
      COSMOS_TLS_INSECURE: "true",
    });
    expect(cfg.port).toBe(8080);
    expect(cfg.cosmos.database).toBe("db2");
    expect(cfg.cosmos.container).toBe("c2");
    expect(cfg.cosmos.tlsInsecure).toBe(true);
  });

  it("defaults auth mode to key", () => {
    const cfg = loadConfig({ COSMOS_ENDPOINT: "https://x", COSMOS_KEY: "k" });
    expect(cfg.cosmos.authMode).toBe("key");
  });

  it("allows aad mode without a key", () => {
    const cfg = loadConfig({ COSMOS_ENDPOINT: "https://x", COSMOS_AUTH_MODE: "aad" });
    expect(cfg.cosmos.authMode).toBe("aad");
    expect(cfg.cosmos.key).toBeUndefined();
  });

  it("throws when endpoint is missing", () => {
    expect(() => loadConfig({ COSMOS_AUTH_MODE: "aad" })).toThrow(/COSMOS_ENDPOINT/);
  });

  it("throws when key mode has no key", () => {
    expect(() => loadConfig({ COSMOS_ENDPOINT: "https://x", COSMOS_AUTH_MODE: "key" }))
      .toThrow(/COSMOS_KEY/);
  });

  it("throws on unknown auth mode", () => {
    expect(() => loadConfig({ COSMOS_ENDPOINT: "https://x", COSMOS_AUTH_MODE: "sas" }))
      .toThrow(/COSMOS_AUTH_MODE/);
  });

  it("throws on non-numeric PORT", () => {
    expect(() => loadConfig({ ...base, PORT: "abc" })).toThrow(/PORT/);
  });
});
