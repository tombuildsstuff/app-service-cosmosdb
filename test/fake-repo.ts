import { randomUUID } from "node:crypto";
import type { NewTask, Task, TaskRepository, TaskUpdate } from "../src/tasks";

export class FakeTaskRepository implements TaskRepository {
  private tasks = new Map<string, Task>();

  async list(): Promise<Task[]> {
    return [...this.tasks.values()];
  }

  async get(id: string): Promise<Task | undefined> {
    return this.tasks.get(id);
  }

  async create(input: NewTask): Promise<Task> {
    const task: Task = {
      id: randomUUID(),
      title: input.title,
      completed: false,
      createdAt: new Date().toISOString(),
    };
    this.tasks.set(task.id, task);
    return task;
  }

  async update(id: string, patch: TaskUpdate): Promise<Task | undefined> {
    const existing = this.tasks.get(id);
    if (!existing) return undefined;
    const updated: Task = {
      ...existing,
      title: patch.title ?? existing.title,
      completed: patch.completed ?? existing.completed,
    };
    this.tasks.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.tasks.delete(id);
  }
}
