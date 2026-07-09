import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  applyPlanArtifact,
  createWorkflowRun,
  summarizeWorkflow,
  transitionWorkflow,
  WorkflowStore,
} from "../src/workflow-store.js";

test("createWorkflowRun initializes idle active run", () => {
  const run = createWorkflowRun("Add priority filtering", { id: "wf-test" });

  assert.equal(run.id, "wf-test");
  assert.equal(run.goal, "Add priority filtering");
  assert.equal(run.status, "active");
  assert.equal(run.currentPhase, "idle");
  assert.equal(run.phases[0].phase, "idle");
});

test("transitionWorkflow moves phases and records event", () => {
  const run = createWorkflowRun("Add priority filtering", { id: "wf-test" });
  const next = transitionWorkflow(run, "planning", { summary: "Planning started." });

  assert.equal(next.currentPhase, "planning");
  assert.equal(next.phases.at(-1).phase, "planning");
  assert.equal(next.events.at(-1).type, "workflow.phase_changed");
});

test("WorkflowStore persists and loads runs", async () => {
  const dir = await mkdtemp(join(tmpdir(), "agentforge-"));
  try {
    const store = new WorkflowStore(dir);
    const run = await store.createRun("Add priority filtering");
    const updated = transitionWorkflow(run, "exploring", { summary: "Explore." });
    await store.updateRun(updated);

    const loaded = await store.loadRun(run.id);
    assert.equal(loaded.currentPhase, "exploring");

    const latest = await store.loadLatestRun();
    assert.equal(latest.id, run.id);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("summarizeWorkflow returns session-safe state", () => {
  const run = transitionWorkflow(createWorkflowRun("Goal", { id: "wf-test" }), "planning");
  const summary = summarizeWorkflow(run);

  assert.deepEqual(Object.keys(summary).sort(), [
    "currentPhase",
    "goal",
    "id",
    "sourceCount",
    "status",
    "taskCount",
    "updatedAt",
    "verificationCount",
  ]);
});

test("applyPlanArtifact stores plan and task state", () => {
  const run = transitionWorkflow(createWorkflowRun("Goal", { id: "wf-test" }), "planning");
  const artifact = {
    goal: "Goal",
    summary: "Plan.",
    steps: [{ id: "step-1", title: "Do thing", rationale: "Needed.", status: "pending", expectedFiles: [] }],
    risks: [],
    verificationCommands: [],
    researchSources: [],
  };
  const tasks = [{ id: "step-1", phase: "execute", title: "Do thing", status: "pending" }];

  const next = applyPlanArtifact(run, artifact, tasks);

  assert.equal(next.planArtifact.summary, "Plan.");
  assert.equal(next.tasks.length, 1);
  assert.equal(next.events.at(-1).type, "plan.accepted");
});
