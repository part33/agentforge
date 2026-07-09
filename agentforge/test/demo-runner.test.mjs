import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createDemoWorkflowRun, writeDemoReport } from "../src/demo-runner.js";

test("createDemoWorkflowRun builds a report-ready workflow", () => {
  const run = createDemoWorkflowRun();

  assert.equal(run.id, "wf-demo-agentforge");
  assert.equal(run.goal, "Add priority filtering to the task board app");
  assert.equal(run.currentPhase, "done");
  assert.equal(run.status, "done");
  assert.equal(run.verificationResults.length, 2);
  assert.equal(run.sources.length, 1);
  assert.equal(run.policyEvents.length, 1);
});

test("writeDemoReport writes html, markdown, and json", async () => {
  const dir = await mkdtemp(join(tmpdir(), "agentforge-demo-report-"));
  try {
    const { paths } = await writeDemoReport({ cwd: dir });
    const html = await readFile(paths.html, "utf8");
    const markdown = await readFile(paths.markdown, "utf8");
    const metadata = JSON.parse(await readFile(paths.json, "utf8"));

    assert.match(html, /AgentForge Workflow Report/);
    assert.match(markdown, /Add priority filtering/);
    assert.equal(metadata.workflowId, "wf-demo-agentforge");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
