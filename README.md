# Tasks App: Azure App Service + Cosmos DB

A minimal Tasks application that runs on Azure App Service and uses Cosmos DB for storage. A single Docker image runs unchanged against the Cosmos emulator, Locally, or Azure.

## The App

A minimal REST API backed by a no-build vanilla-JS/HTML frontend. Tasks have a title and completion status, stored in Cosmos DB with a partition key on `/id`.

### API Routes

| Method | Path | Status | Notes |
| --- | --- | --- | --- |
| `GET` | `/api/tasks` | 200 | List all tasks |
| `POST` | `/api/tasks` | 201 / 400 | Create a task; `title` (non-empty string) is required |
| `GET` | `/api/tasks/:id` | 200 / 404 | Fetch a task by id |
| `PATCH` | `/api/tasks/:id` | 200 / 400 / 404 | Update a task; `title` and/or `completed` are optional |
| `DELETE` | `/api/tasks/:id` | 204 / 404 | Delete a task |
| `GET` | `/healthz` | 200 | Health check (returns `{"status":"ok"}`) |
| `GET` | `/` | 200 | Serves `public/index.html` (minimal UI) |

### Task Shape

```json
{
  "id": "uuid-string",
  "title": "Task title",
  "completed": false,
  "createdAt": "2026-09-21T12:00:00.000Z"
}
```

## Configuration

Configuration comes from environment variables.

| Variable | Required | Default | Notes |
| --- | --- | --- | --- |
| `PORT` | No | `3000` | HTTP server port |
| `COSMOS_ENDPOINT` | Yes | (none) | Cosmos account endpoint URL (e.g., `https://my-cosmos.documents.azure.com:443/`) or emulator (e.g., `https://localhost:8081`) |
| `COSMOS_AUTH_MODE` | No | `key` | Auth method: `"key"` (primary key) or `"aad"` (Managed Identity / DefaultAzureCredential) |
| `COSMOS_KEY` | Conditional | (none) | Primary key; **required only if** `COSMOS_AUTH_MODE=key`. In AAD mode, leave empty or omit. ⚠️  The emulator's key is well-known and safe to commit. |
| `COSMOS_DATABASE` | No | `tasksdb` | Database name |
| `COSMOS_CONTAINER` | No | `tasks` | Container name |
| `COSMOS_TLS_INSECURE` | No | `false` | Set to `"true"` **only** for the Cosmos emulator (self-signed cert). **Never set in Azure.** |

## Run Locally (Docker Compose)

Run both the emulator and app in containers:

```bash
docker compose up --build
# open http://localhost:3000
```

**Note:** The Cosmos emulator takes 30–60 seconds to warm up on first start. The app waits for the emulator's healthcheck before starting.

## Run Locally (Node Against the Emulator)

Run the app as a Node process against an emulator started with Docker Compose:

```bash
# Start only the emulator in the background
docker compose up cosmos -d

# Install dependencies
npm install

# Run the app, supplying config inline via the environment
COSMOS_ENDPOINT=https://localhost:8081 COSMOS_KEY=C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw== COSMOS_TLS_INSECURE=true npm run dev
# open http://localhost:3000
```

Ctrl+C to stop. To clean up the emulator:

```bash
docker compose down
```

## Run Tests

### Unit Tests

```bash
npm test
```

All unit tests run without external dependencies.

### Integration Tests (Emulator Required)

```bash
# Ensure the emulator is running (docker compose up cosmos), then:
COSMOS_ENDPOINT=https://localhost:8081 COSMOS_KEY=C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw== COSMOS_TLS_INSECURE=true RUN_INTEGRATION=1 npm test
```

## Building & Publishing the Image

The image is published to Docker Hub as [`tombuildsstuff/app-service-cosmosdb`](https://hub.docker.com/r/tombuildsstuff/app-service-cosmosdb).

Build a multi-arch image — so it runs on both Azure App Service's `linux/amd64` and Apple Silicon's `linux/arm64` — and push it:

```bash
docker buildx build --platform linux/amd64,linux/arm64 \
  -t tombuildsstuff/app-service-cosmosdb:latest --push .
```

## Deploying the Infrastructure

The infrastructure that runs this image — the App Service, Cosmos DB, and supporting resources — lives in a separate repository, [`locallybuild/example-app-service-cosmosdb`](https://github.com/locallybuild/example-app-service-cosmosdb). It provisions everything with Terraform and has App Service pull the published image directly from Docker Hub. See that repository's README for how to deploy it against Locally (or Azure).
