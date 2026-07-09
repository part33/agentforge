import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createReportMetadata, renderMarkdownReport, writeWorkflowReport } from "../src/report-generator.js";
import {
  applyApprovalDecision,
  applyPlanArtifact,
  applyVerificationResults,
  createWorkflowRun,
  transitionWorkflow,
} from "../src/workflow-store.js";

function createReportableRun() {
  let run = createWorkflowRun("Add priority filtering", { id: "wf-test" });
  const artifact = {
    goal: "Add priority filtering",
    summary: "Add model field and UI filter.",
    steps: [{ id: "step-1", title: "Update model", rationale: "Need data field.", status: "pending", expectedFiles: [] }],
    risks: ["Fixtures may need updates."],
    verificationCommands: [{ command: "npm test", reason: "Run tests.", required: true }],
    researchSources: [],
  };
  run = transitionWorkflow(run, "planning");
  run = applyPlanArtifact(run, artifact, [{ id: "step-1", phase: "execute", title: "Update model", status: "done" }]);
  run = transitionWorkflow(run, "waiting_approval");
  run = applyApprovalDecision(run, "approved");
  run = transitionWorkflow(run, "verifying");
  run = applyVerificationResults(run, [
    { command: "npm test", status: "passed", exitCode: 0, summary: "1 test passed", durationMs: 50 },
  ]);
  run.sources = [{ title: "Node Test Runner", url: "https://nodejs.org/api/test.html", summary: "Node test docs." }];
  return run;
}

test("renderMarkdownReport includes core sections", () => {
  const markdown = renderMarkdownReport(createReportableRun());

  assert.match(markdown, /# AgentForge Workflow Report/);
  assert.match(markdown, /## Plan/);
  assert.match(markdown, /npm test/);
  assert.match(markdown, /Fixtures may need updates/);
  assert.match(markdown, /Node Test Runner/);
});

test("createReportMetadata extracts machine-readable fields", () => {
  const metadata = createReportMetadata(createReportableRun(), { markdown: "report.md", json: "report.json" });

  assert.equal(metadata.workflowId, "wf-test");
  assert.equal(metadata.verificationResults.length, 1);
  assert.equal(metadata.reportPaths.markdown, "report.md");
});

test("writeWorkflowReport writes markdown and json reports", async () => {
  const dir = await mkdtemp(join(tmpdir(), "agentforge-report-"));
  try {
    const paths = await writeWorkflowReport(createReportableRun(), dir);
    const markdown = await readFile(paths.markdown, "utf8");
    const metadata = JSON.parse(await readFile(paths.json, "utf8"));

    assert.match(markdown, /Add priority filtering/);
    assert.equal(metadata.workflowId, "wf-test");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
