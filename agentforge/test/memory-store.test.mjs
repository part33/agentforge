import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { MemoryStore, renderMemoryMarkdown } from "../src/memory-store.js";

test("MemoryStore stores project knowledge, preferences, and rules", async () => {
  const dir = await mkdtemp(join(tmpdir(), "agentforge-memory-"));
  try {
    const store = new MemoryStore(dir);
    await store.add("projectKnowledge", "Use Node test runner.");
    await store.add("userPreferences", "Prefer Chinese docs.");
    await store.add("rules", "Do not edit Pi core.");

    const summary = await store.summarize();
    const memory = await store.load();

    assert.equal(summary.projectKnowledge, 1);
    assert.equal(summary.userPreferences, 1);
    assert.equal(summary.rules, 1);
    assert.match(renderMemoryMarkdown(memory), /Use Node test runner/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
