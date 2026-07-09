import assert from "node:assert/strict";
import test from "node:test";

import { assignSubagents, renderSubagentBriefing, roleForPhase } from "../src/subagents.js";

test("roleForPhase maps phases to expected roles", () => {
  assert.equal(roleForPhase("exploring").id, "scout");
  assert.equal(roleForPhase("planning").id, "planner");
  assert.equal(roleForPhase("executing").id, "worker");
  assert.equal(roleForPhase("verifying").id, "reviewer");
});

test("assignSubagents assigns workflow tasks", () => {
  const bundle = assignSubagents({
    id: "wf-test",
    tasks: [{ id: "step-1", title: "Implement feature", phase: "executing", status: "pending" }],
  });

  assert.equal(bundle.workflowId, "wf-test");
  assert.equal(bundle.assignments.length, 1);
  assert.equal(bundle.assignments[0].roleId, "worker");
});

test("renderSubagentBriefing produces readable markdown", () => {
  const markdown = renderSubagentBriefing(assignSubagents({ id: "wf-test", tasks: [] }));

  assert.match(markdown, /Scout/);
  assert.match(markdown, /Assignments/);
});
