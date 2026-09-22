export type AuthMode = "key" | "aad";

export interface Config {
  port: number;
  cosmos: {
    endpoint: string;
    authMode: AuthMode;
    key?: string;
    database: string;
    container: string;
    tlsInsecure: boolean;
  };
}

function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function parsePort(raw: string | undefined): number {
  if (raw === undefined) return 3000;
  const port = Number(raw);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`PORT must be a positive integer, got: ${raw}`);
  }
  return port;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const authModeRaw = env.COSMOS_AUTH_MODE ?? "key";
  if (authModeRaw !== "key" && authModeRaw !== "aad") {
    throw new Error(`COSMOS_AUTH_MODE must be "key" or "aad", got: ${authModeRaw}`);
  }
  const authMode: AuthMode = authModeRaw;

  const endpoint = required(env, "COSMOS_ENDPOINT");

  let key: string | undefined;
  if (authMode === "key") {
    key = required(env, "COSMOS_KEY");
  }

  return {
    port: parsePort(env.PORT),
    cosmos: {
      endpoint,
      authMode,
      key,
      database: env.COSMOS_DATABASE ?? "tasksdb",
      container: env.COSMOS_CONTAINER ?? "tasks",
      tlsInsecure: env.COSMOS_TLS_INSECURE === "true",
    },
  };
}
