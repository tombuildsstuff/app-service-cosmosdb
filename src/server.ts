import { loadConfig } from "./config";
import { createCosmosClient, initContainer } from "./cosmos";
import { CosmosTaskRepository } from "./tasks";
import { createApp } from "./app";

async function main(): Promise<void> {
  const cfg = loadConfig();
  const client = createCosmosClient(cfg);
  const container = await initContainer(client, cfg);
  const repo = new CosmosTaskRepository(container);
  const app = createApp(repo);

  app.listen(cfg.port, () => {
    console.log(`Listening on port ${cfg.port} (cosmos auth: ${cfg.cosmos.authMode})`);
  });
}

main().catch((err) => {
  console.error("Failed to start:", err);
  process.exit(1);
});
