import assert from "node:assert/strict";
import test from "node:test";

import { createPolicyEvent, evaluateToolCallPolicy } from "../src/policy-engine.js";

test("evaluateToolCallPolicy blocks recursive deletion", () => {
  const decision = evaluateToolCallPolicy({ toolName: "bash", input: { command: "rm -rf dist" } });

  assert.equal(decision.decision, "block");
  assert.equal(decision.category, "dangerous_command");
});

test("evaluateToolCallPolicy confirms git push", () => {
  const decision = evaluateToolCallPolicy({ toolName: "bash", input: { command: "git push origin main" } });

  assert.equal(decision.decision, "confirm");
  assert.equal(decision.category, "confirm_command");
});

test("evaluateToolCallPolicy blocks sensitive path writes", () => {
  const decision = evaluateToolCallPolicy({ toolName: "write", input: { path: ".env" } });

  assert.equal(decision.decision, "block");
  assert.equal(decision.category, "protected_path");
});

test("evaluateToolCallPolicy allows ordinary reads", () => {
  const decision = evaluateToolCallPolicy({ toolName: "read", input: { path: "README.md" } });

  assert.equal(decision.decision, "allow");
  assert.equal(decision.category, "default_allow");
});

test("createPolicyEvent preserves tool context", () => {
  const decision = evaluateToolCallPolicy({ toolName: "bash", input: { command: "git commit -m test" } });
  const event = createPolicyEvent({
    toolName: "bash",
    toolCallId: "call-1",
    input: { command: "git commit -m test" },
    decision,
  });

  assert.equal(event.toolCallId, "call-1");
  assert.equal(event.decision, "confirm");
  assert.equal(event.input.command, "git commit -m test");
});
