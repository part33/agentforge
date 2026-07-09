import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export function createEmptyMemory() {
  return {
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    projectKnowledge: [],
    userPreferences: [],
    rules: [],
  };
}

function normalizeEntry(entry, type) {
  if (typeof entry === "string") {
    return {
      id: `${type}-${Date.now()}`,
      text: entry.trim(),
      tags: [],
      createdAt: new Date().toISOString(),
    };
  }
  return {
    id: entry.id ?? `${type}-${Date.now()}`,
    text: String(entry.text ?? "").trim(),
    tags: entry.tags ?? [],
    createdAt: entry.createdAt ?? new Date().toISOString(),
  };
}

export class MemoryStore {
  constructor(cwd) {
    this.cwd = cwd;
    this.rootDir = join(cwd, ".agentforge");
    this.memoryPath = join(this.rootDir, "memory.json");
  }

  async load() {
    try {
      return JSON.parse(await readFile(this.memoryPath, "utf8"));
    } catch (error) {
      if (error?.code === "ENOENT") return createEmptyMemory();
      throw error;
    }
  }

  async save(memory) {
    await mkdir(this.rootDir, { recursive: true });
    const nextMemory = { ...memory, updatedAt: new Date().toISOString() };
    await writeFile(this.memoryPath, `${JSON.stringify(nextMemory, null, 2)}\n`, "utf8");
    return nextMemory;
  }

  async add(type, entry) {
    if (!["projectKnowledge", "userPreferences", "rules"].includes(type)) {
      throw new Error(`Unknown memory type: ${type}`);
    }
    const memory = await this.load();
    const normalized = normalizeEntry(entry, type);
    if (!normalized.text) {
      throw new Error("Memory entry text is required.");
    }
    const nextMemory = {
      ...memory,
      [type]: [...(memory[type] ?? []), normalized],
    };
    return await this.save(nextMemory);
  }

  async summarize() {
    const memory = await this.load();
    return {
      projectKnowledge: memory.projectKnowledge?.length ?? 0,
      userPreferences: memory.userPreferences?.length ?? 0,
      rules: memory.rules?.length ?? 0,
      updatedAt: memory.updatedAt,
    };
  }
}

export function renderMemoryMarkdown(memory) {
  const section = (title, entries) => [
    `## ${title}`,
    "",
    ...(entries?.length ? entries.map((entry) => `- ${entry.text}`) : ["None recorded."]),
    "",
  ];
  return [
    "# AgentForge Memory",
    "",
    ...section("Project Knowledge", memory.projectKnowledge),
    ...section("User Preferences", memory.userPreferences),
    ...section("Rules", memory.rules),
  ].join("\n");
}
