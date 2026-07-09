const REQUIRED_PLAN_FIELDS = ["goal", "summary", "steps", "risks", "verificationCommands"];
const STEP_STATUSES = new Set(["pending", "running", "done", "blocked"]);

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeStringArray(value, fieldName, errors) {
  if (!Array.isArray(value)) {
    errors.push(`${fieldName} must be an array.`);
    return [];
  }
  const result = [];
  for (const [index, item] of value.entries()) {
    if (typeof item !== "string" || item.trim() === "") {
      errors.push(`${fieldName}[${index}] must be a non-empty string.`);
      continue;
    }
    result.push(item.trim());
  }
  return result;
}

function validateSteps(value, errors) {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push("steps must be a non-empty array.");
    return [];
  }

  const ids = new Set();
  const steps = [];
  for (const [index, step] of value.entries()) {
    if (!isPlainObject(step)) {
      errors.push(`steps[${index}] must be an object.`);
      continue;
    }
    const id = typeof step.id === "string" && step.id.trim() ? step.id.trim() : `step-${index + 1}`;
    const title = typeof step.title === "string" ? step.title.trim() : "";
    const rationale = typeof step.rationale === "string" ? step.rationale.trim() : "";
    const status = typeof step.status === "string" ? step.status.trim() : "pending";

    if (ids.has(id)) {
      errors.push(`steps[${index}].id duplicates "${id}".`);
    }
    ids.add(id);
    if (!title) {
      errors.push(`steps[${index}].title must be a non-empty string.`);
    }
    if (!rationale) {
      errors.push(`steps[${index}].rationale must be a non-empty string.`);
    }
    if (!STEP_STATUSES.has(status)) {
      errors.push(`steps[${index}].status must be one of pending, running, done, blocked.`);
    }

    steps.push({
      id,
      title,
      rationale,
      expectedFiles: normalizeStringArray(step.expectedFiles ?? [], `steps[${index}].expectedFiles`, errors),
      status: STEP_STATUSES.has(status) ? status : "pending",
    });
  }
  return steps;
}

function validateVerificationCommands(value, errors) {
  if (!Array.isArray(value)) {
    errors.push("verificationCommands must be an array.");
    return [];
  }

  const commands = [];
  for (const [index, item] of value.entries()) {
    if (!isPlainObject(item)) {
      errors.push(`verificationCommands[${index}] must be an object.`);
      continue;
    }
    const command = typeof item.command === "string" ? item.command.trim() : "";
    const reason = typeof item.reason === "string" ? item.reason.trim() : "";
    if (!command) {
      errors.push(`verificationCommands[${index}].command must be a non-empty string.`);
    }
    if (!reason) {
      errors.push(`verificationCommands[${index}].reason must be a non-empty string.`);
    }
    commands.push({
      command,
      reason,
      required: item.required !== false,
    });
  }
  return commands;
}

export function extractJsonObject(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : text.trim();
  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return { ok: false, error: "No JSON object found in model output." };
  }
  return { ok: true, json: candidate.slice(firstBrace, lastBrace + 1) };
}

export function validatePlanArtifact(value) {
  const errors = [];
  if (!isPlainObject(value)) {
    return { ok: false, errors: ["Plan artifact must be a JSON object."] };
  }

  for (const field of REQUIRED_PLAN_FIELDS) {
    if (!(field in value)) {
      errors.push(`Missing required field: ${field}.`);
    }
  }

  const goal = typeof value.goal === "string" ? value.goal.trim() : "";
  const summary = typeof value.summary === "string" ? value.summary.trim() : "";
  if (!goal) errors.push("goal must be a non-empty string.");
  if (!summary) errors.push("summary must be a non-empty string.");

  const artifact = {
    goal,
    summary,
    steps: validateSteps(value.steps, errors),
    risks: normalizeStringArray(value.risks, "risks", errors),
    verificationCommands: validateVerificationCommands(value.verificationCommands, errors),
    researchSources: normalizeStringArray(value.researchSources ?? [], "researchSources", errors),
  };

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, artifact };
}

export function parsePlanArtifactFromText(text) {
  const extracted = extractJsonObject(text);
  if (!extracted.ok) {
    return { ok: false, errors: [extracted.error] };
  }

  try {
    const parsed = JSON.parse(extracted.json);
    return validatePlanArtifact(parsed);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, errors: [`Invalid JSON: ${message}`] };
  }
}

export function planArtifactToTasks(artifact) {
  return artifact.steps.map((step) => ({
    id: step.id,
    phase: "execute",
    title: step.title,
    rationale: step.rationale,
    status: step.status,
    files: step.expectedFiles,
    evidence: [],
  }));
}
