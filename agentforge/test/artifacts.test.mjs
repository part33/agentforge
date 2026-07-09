import assert from "node:assert/strict";
import test from "node:test";

import {
  extractJsonObject,
  parsePlanArtifactFromText,
  planArtifactToTasks,
  validatePlanArtifact,
} from "../src/artifacts.js";

const validArtifact = {
  goal: "Add priority filtering",
  summary: "Add model support, UI control, and tests.",
  steps: [
    {
      id: "step-1",
      title: "Inspect task model",
      rationale: "Find where task fields are defined.",
      expectedFiles: ["src/tasks.ts"],
      status: "pending",
    },
  ],
  risks: ["Fixtures may need updates."],
  verificationCommands: [{ command: "npm test", reason: "Run tests.", required: true }],
  researchSources: [],
};

test("extractJsonObject reads fenced JSON", () => {
  const result = extractJsonObject(`Plan:\n\n\`\`\`json\n${JSON.stringify(validArtifact)}\n\`\`\``);

  assert.equal(result.ok, true);
  assert.match(result.json, /Add priority filtering/);
});

test("validatePlanArtifact accepts valid plan", () => {
  const result = validatePlanArtifact(validArtifact);

  assert.equal(result.ok, true);
  assert.equal(result.artifact.steps.length, 1);
  assert.equal(result.artifact.verificationCommands[0].required, true);
});

test("validatePlanArtifact rejects missing required fields", () => {
  const result = validatePlanArtifact({ goal: "Missing things" });

  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes("summary")));
  assert.ok(result.errors.some((error) => error.includes("steps")));
});

test("parsePlanArtifactFromText parses model text with fenced JSON", () => {
  const result = parsePlanArtifactFromText(`Here is the plan:\n\`\`\`json\n${JSON.stringify(validArtifact)}\n\`\`\``);

  assert.equal(result.ok, true);
  assert.equal(result.artifact.goal, "Add priority filtering");
});

test("planArtifactToTasks maps steps to executable task records", () => {
  const result = validatePlanArtifact(validArtifact);
  const tasks = planArtifactToTasks(result.artifact);

  assert.equal(tasks.length, 1);
  assert.equal(tasks[0].phase, "execute");
  assert.deepEqual(tasks[0].files, ["src/tasks.ts"]);
});
