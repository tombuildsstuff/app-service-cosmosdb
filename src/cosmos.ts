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

export async function initContainer(client: CosmosClient, cfg: Config): Promise<Container> {
  const { database } = await client.databases.createIfNotExists({ id: cfg.cosmos.database });
  const { container } = await database.containers.createIfNotExists({
    id: cfg.cosmos.container,
    partitionKey: { paths: ["/id"] },
  });
  return container;
}
