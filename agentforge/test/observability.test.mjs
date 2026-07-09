import assert from "node:assert/strict";
import test from "node:test";

import { createToolCallLog, renderObservabilityMarkdown, summarizeObservability } from "../src/observability.js";

test("createToolCallLog records duration and decision", () => {
  const log = createToolCallLog({
    toolName: "shell",
    toolCallId: "call-1",
    decision: { decision: "allow" },
    startedAt: "2026-07-09T00:00:00.000Z",
    completedAt: "2026-07-09T00:00:00.125Z",
    status: "allowed",
  });

  assert.equal(log.durationMs, 125);
  assert.equal(log.decision, "allow");
});

test("summarizeObservability aggregates workflow events", () => {
  const summary = summarizeObservability({
    id: "wf-test",
    events: [{ type: "workflow.phase_changed", data: { phase: "planning" } }],
    toolCallLogs: [{ toolName: "shell" }],
    policyEvents: [{ decision: "block" }],
    verificationResults: [{ status: "passed" }, { status: "failed" }],
  });

  assert.equal(summary.eventCount, 1);
  assert.equal(summary.phaseCounts.planning, 1);
  assert.equal(summary.toolCallCount, 1);
  assert.equal(summary.blockedToolCallCount, 1);
  assert.equal(summary.failedVerificationCount, 1);
  assert.match(renderObservabilityMarkdown(summary), /Tool calls: 1/);
});
