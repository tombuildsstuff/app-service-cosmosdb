import { randomUUID } from "node:crypto";
import type { Container } from "@azure/cosmos";

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
}

export interface NewTask {
  title: string;
}

export interface TaskUpdate {
  title?: string;
  completed?: boolean;
}

export interface TaskRepository {
  list(): Promise<Task[]>;
  get(id: string): Promise<Task | undefined>;
  create(input: NewTask): Promise<Task>;
  update(id: string, patch: TaskUpdate): Promise<Task | undefined>;
  delete(id: string): Promise<boolean>;
}

export class CosmosTaskRepository implements TaskRepository {
  constructor(private readonly container: Container) {}

  async list(): Promise<Task[]> {
    const { resources } = await this.container.items
      .query<Task>("SELECT c.id, c.title, c.completed, c.createdAt FROM c")
      .fetchAll();
    return resources;
  }

  async get(id: string): Promise<Task | undefined> {
    try {
      const { resource } = await this.container.item(id, id).read<Task>();
      return resource ?? undefined;
    } catch (err) {
      if ((err as { code?: number }).code === 404) return undefined;
      throw err;
    }
  }

  async create(input: NewTask): Promise<Task> {
    const task: Task = {
      id: randomUUID(),
      title: input.title,
      completed: false,
      createdAt: new Date().toISOString(),
    };
    const { resource } = await this.container.items.create(task);
    return resource ?? task;
  }

  async update(id: string, patch: TaskUpdate): Promise<Task | undefined> {
    const existing = await this.get(id);
    if (!existing) return undefined;
    const updated: Task = {
      ...existing,
      title: patch.title ?? existing.title,
      completed: patch.completed ?? existing.completed,
    };
    try {
      const { resource } = await this.container.item(id, id).replace(updated);
      return resource ?? updated;
    } catch (err) {
      if ((err as { code?: number }).code === 404) return undefined;
      throw err;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.container.item(id, id).delete();
      return true;
    } catch (err) {
      if ((err as { code?: number }).code === 404) return false;
      throw err;
    }
  }
}
