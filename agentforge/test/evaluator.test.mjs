import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createDemoWorkflowRun } from "../src/demo-runner.js";
import { evaluateWorkflowRun, renderEvaluationMarkdown, writeWorkflowEvaluation } from "../src/evaluator.js";

function createEvaluableRun() {
  const run = createDemoWorkflowRun();
  return {
    ...run,
    reportPaths: {
      markdown: "report.md",
      json: "report.json",
      html: "report.html",
    },
  };
}

test("evaluateWorkflowRun scores a complete workflow", () => {
  const evaluation = evaluateWorkflowRun(createEvaluableRun());

  assert.equal(evaluation.score, 100);
  assert.equal(evaluation.grade, "A");
  assert.equal(evaluation.passed, true);
  assert.equal(evaluation.checks.length, 7);
});

test("evaluateWorkflowRun returns recommendations for missing evidence", () => {
  const run = {
    ...createEvaluableRun(),
    verificationResults: [],
    sources: [],
    policyEvents: [],
    reportPaths: {},
  };

  const evaluation = evaluateWorkflowRun(run);

  assert.equal(evaluation.passed, false);
  assert.ok(evaluation.score < 80);
  assert.ok(evaluation.recommendations.length >= 3);
});

test("renderEvaluationMarkdown includes check table", () => {
  const markdown = renderEvaluationMarkdown(evaluateWorkflowRun(createEvaluableRun()));

  assert.match(markdown, /AgentForge Workflow Evaluation/);
  assert.match(markdown, /结构化计划/);
  assert.match(markdown, /100/);
});

test("writeWorkflowEvaluation writes markdown and json", async () => {
  const dir = await mkdtemp(join(tmpdir(), "agentforge-eval-"));
  try {
    const { evaluation, paths } = await writeWorkflowEvaluation(createEvaluableRun(), dir);
    const markdown = await readFile(paths.markdown, "utf8");
    const json = JSON.parse(await readFile(paths.json, "utf8"));

    assert.equal(evaluation.score, 100);
    assert.match(markdown, /Grade: A/);
    assert.equal(json.workflowId, "wf-demo-agentforge");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
