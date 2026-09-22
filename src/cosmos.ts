import https from "node:https";
import { CosmosClient, type Container } from "@azure/cosmos";
import { DefaultAzureCredential } from "@azure/identity";
import type { Config } from "./config";

export function createCosmosClient(cfg: Config): CosmosClient {
  const agent = cfg.cosmos.tlsInsecure
    ? new https.Agent({ rejectUnauthorized: false })
    : undefined;

  if (cfg.cosmos.authMode === "aad") {
    return new CosmosClient({
      endpoint: cfg.cosmos.endpoint,
      aadCredentials: new DefaultAzureCredential(),
      agent,
    });
  }

  return new CosmosClient({
    endpoint: cfg.cosmos.endpoint,
    key: cfg.cosmos.key,
    agent,
  });
}

export interface RetryOptions {
  /** Total number of attempts before giving up (default 12). */
  maxAttempts?: number;
  /** Backoff for the first retry, doubled each attempt (default 500ms). */
  initialDelayMs?: number;
  /** Upper bound on any single backoff (default 5000ms). */
  maxDelayMs?: number;
  /** Injectable sleep, so tests don't wait on real backoff. */
  sleep?: (ms: number) => Promise<void>;
  /** Called before each retry; defaults to a console.warn. */
  onRetry?: (err: unknown, attempt: number, delayMs: number) => void;
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

// Transient failures worth retrying at cold start: the dependency (DNS,
// Cosmos, or — under Locally — the injected resolver) may not be ready yet.
// Auth/permission and client errors (401/403/400/404) are NOT here: retrying
// them just delays a failure that will never resolve on its own.
const TRANSIENT_SYSTEM_CODES = new Set([
  "EAI_AGAIN",
  "ENOTFOUND",
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "EPIPE",
  "EHOSTUNREACH",
  "ENETUNREACH",
]);
const TRANSIENT_HTTP_CODES = new Set([408, 429, 500, 502, 503, 504]);

export function isTransientStartupError(err: unknown): boolean {
  const code = (err as { code?: unknown } | null)?.code;
  if (typeof code === "string") return TRANSIENT_SYSTEM_CODES.has(code);
  if (typeof code === "number") return TRANSIENT_HTTP_CODES.has(code);
  return false;
}

/**
 * Establish the database and container, retrying transient failures with
 * exponential backoff. The app connects to Cosmos once at startup; without
 * this, a single momentary DNS/network blip during a cold start (common on
 * Azure App Service, and under Locally while the injected resolver warms up)
 * would kill the process with no chance to recover.
 */
export async function initContainer(
  client: CosmosClient,
  cfg: Config,
  opts: RetryOptions = {},
): Promise<Container> {
  const maxAttempts = opts.maxAttempts ?? 12;
  const initialDelayMs = opts.initialDelayMs ?? 500;
  const maxDelayMs = opts.maxDelayMs ?? 5000;
  const sleep = opts.sleep ?? defaultSleep;
  const onRetry =
    opts.onRetry ??
    ((err, attempt, delayMs) => {
      const reason = (err as { code?: unknown; message?: unknown })?.code ?? (err as Error)?.message;
      console.warn(
        `Cosmos not ready (attempt ${attempt}/${maxAttempts}, ${reason}); retrying in ${delayMs}ms`,
      );
    });

  for (let attempt = 1; ; attempt++) {
    try {
      const { database } = await client.databases.createIfNotExists({ id: cfg.cosmos.database });
      const { container } = await database.containers.createIfNotExists({
        id: cfg.cosmos.container,
        partitionKey: { paths: ["/id"] },
      });
      return container;
    } catch (err) {
      if (attempt >= maxAttempts || !isTransientStartupError(err)) throw err;
      const delayMs = Math.min(maxDelayMs, initialDelayMs * 2 ** (attempt - 1));
      onRetry(err, attempt, delayMs);
      await sleep(delayMs);
    }
  }
}
