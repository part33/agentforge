import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

export const WORKFLOW_STATUSES = ["active", "done", "failed", "cancelled"];

export const WORKFLOW_PHASES = [
  "idle",
  "exploring",
  "planning",
  "waiting_approval",
  "executing",
  "verifying",
  "reviewing",
  "reporting",
  "done",
  "failed",
  "cancelled",
];

export function createWorkflowId(date = new Date()) {
  const stamp = date.toISOString().replace(/[-:]/g, "").replace(/\..+$/, "Z");
  return `wf-${stamp}-${randomUUID().slice(0, 8)}`;
}

export function createWorkflowRun(goal, options = {}) {
  const now = new Date().toISOString();
  const id = options.id ?? createWorkflowId();
  return {
    schemaVersion: 1,
    id,
    goal,
    status: "active",
    currentPhase: "idle",
    createdAt: now,
    updatedAt: now,
    phases: [
      {
        phase: "idle",
        status: "done",
        startedAt: now,
        completedAt: now,
        summary: "Workflow run created.",
      },
    ],
    tasks: [],
    sources: [],
    verificationResults: [],
    policyEvents: [],
    toolCallLogs: [],
    subagentAssignments: [],
    mcpBridge: undefined,
    memorySummary: undefined,
    observabilitySummary: undefined,
    events: [
      {
        id: randomUUID(),
        type: "workflow.created",
        timestamp: now,
        message: "Workflow run created.",
        data: { goal },
      },
    ],
    reportPaths: {},
  };
}

export function transitionWorkflow(run, nextPhase, options = {}) {
  if (!WORKFLOW_PHASES.includes(nextPhase)) {
    throw new Error(`Unknown workflow phase: ${nextPhase}`);
  }

  const now = new Date().toISOString();
  const status = options.status ?? (nextPhase === "failed" || nextPhase === "cancelled" ? nextPhase : "active");
  const nextRun = {
    ...run,
    status,
    currentPhase: nextPhase,
    updatedAt: now,
    phases: [
      ...run.phases,
      {
        phase: nextPhase,
        status: options.phaseStatus ?? "running",
        startedAt: now,
        completedAt: options.completed ? now : undefined,
        summary: options.summary,
      },
    ],
    events: [
      ...run.events,
      {
        id: randomUUID(),
        type: "workflow.phase_changed",
        timestamp: now,
        message: options.summary ?? `Moved to ${nextPhase}.`,
        data: { phase: nextPhase },
      },
    ],
  };
  return nextRun;
}

export function appendWorkflowEvent(run, event) {
  const now = new Date().toISOString();
  return {
    ...run,
    updatedAt: now,
    events: [
      ...run.events,
      {
        id: randomUUID(),
        timestamp: now,
        ...event,
      },
    ],
  };
}

export function applyPlanArtifact(run, artifact, tasks) {
  const now = new Date().toISOString();
  return {
    ...run,
    updatedAt: now,
    planArtifact: artifact,
    tasks,
    events: [
      ...run.events,
      {
        id: randomUUID(),
        type: "plan.accepted",
        timestamp: now,
        message: "Structured plan artifact accepted.",
        data: {
          stepCount: artifact.steps.length,
          verificationCommandCount: artifact.verificationCommands.length,
        },
      },
    ],
  };
}

export function applyApprovalDecision(run, decision, options = {}) {
  if (!["approved", "revision_requested", "cancelled"].includes(decision)) {
    throw new Error(`Unknown approval decision: ${decision}`);
  }

  if (run.currentPhase !== "waiting_approval") {
    throw new Error(`Cannot apply approval decision from phase: ${run.currentPhase}`);
  }

  const now = new Date().toISOString();
  const approval = {
    decision,
    decidedAt: now,
    note: options.note,
  };
  const event = {
    id: randomUUID(),
    type: "approval.decided",
    timestamp: now,
    message: options.note ?? `Approval decision: ${decision}.`,
    data: approval,
  };

  return {
    ...run,
    approval,
    updatedAt: now,
    events: [...run.events, event],
  };
}

export function applyVerificationResults(run, results) {
  const now = new Date().toISOString();
  return {
    ...run,
    verificationResults: results,
    updatedAt: now,
    events: [
      ...run.events,
      {
        id: randomUUID(),
        type: "verification.completed",
        timestamp: now,
        message: `Verification completed with ${results.length} command(s).`,
        data: {
          passed: results.filter((result) => result.status === "passed").length,
          failed: results.filter((result) => result.status === "failed").length,
        },
      },
    ],
  };
}

export function applyReportPaths(run, reportPaths) {
  const now = new Date().toISOString();
  return {
    ...run,
    reportPaths,
    updatedAt: now,
    events: [
      ...run.events,
      {
        id: randomUUID(),
        type: "report.generated",
        timestamp: now,
        message: "Workflow report generated.",
        data: reportPaths,
      },
    ],
  };
}

export function appendPolicyEvent(run, policyEvent) {
  const now = new Date().toISOString();
  return {
    ...run,
    policyEvents: [...(run.policyEvents ?? []), { ...policyEvent, timestamp: now }],
    updatedAt: now,
    events: [
      ...run.events,
      {
        id: randomUUID(),
        type: "policy.evaluated",
        timestamp: now,
        message: `${policyEvent.decision}: ${policyEvent.reason}`,
        data: policyEvent,
      },
    ],
  };
}

export function appendToolCallLog(run, toolCallLog) {
  const now = new Date().toISOString();
  return {
    ...run,
    toolCallLogs: [...(run.toolCallLogs ?? []), toolCallLog],
    updatedAt: now,
    events: [
      ...run.events,
      {
        id: randomUUID(),
        type: "tool_call.logged",
        timestamp: now,
        message: `Tool call logged: ${toolCallLog.toolName}.`,
        data: toolCallLog,
      },
    ],
  };
}

export function appendResearchSources(run, sources) {
  const now = new Date().toISOString();
  const existingUrls = new Set((run.sources ?? []).map((source) => source.url));
  const newSources = [];
  for (const source of sources ?? []) {
    if (!source?.url || existingUrls.has(source.url)) continue;
    existingUrls.add(source.url);
    newSources.push(source);
  }

  return {
    ...run,
    sources: [...(run.sources ?? []), ...newSources],
    updatedAt: now,
    events: [
      ...run.events,
      {
        id: randomUUID(),
        type: "research.sources_added",
        timestamp: now,
        message: `Added ${newSources.length} research source(s).`,
        data: { sourceCount: newSources.length },
      },
    ],
  };
}

export function applySubagentAssignments(run, bundle) {
  const now = new Date().toISOString();
  return {
    ...run,
    subagentAssignments: bundle.assignments ?? [],
    subagentRoles: bundle.roles ?? [],
    updatedAt: now,
    events: [
      ...run.events,
      {
        id: randomUUID(),
        type: "subagents.assigned",
        timestamp: now,
        message: `Assigned ${bundle.assignments?.length ?? 0} task(s) to subagents.`,
        data: bundle,
      },
    ],
  };
}

export function applyMcpBridge(run, bridge) {
  const now = new Date().toISOString();
  return {
    ...run,
    mcpBridge: bridge,
    updatedAt: now,
    events: [
      ...run.events,
      {
        id: randomUUID(),
        type: "mcp.bridge_configured",
        timestamp: now,
        message: `Configured ${bridge.tools?.length ?? 0} MCP tool bridge(s).`,
        data: bridge,
      },
    ],
  };
}

export function applyMemorySummary(run, summary) {
  const now = new Date().toISOString();
  return {
    ...run,
    memorySummary: summary,
    updatedAt: now,
    events: [
      ...run.events,
      {
        id: randomUUID(),
        type: "memory.updated",
        timestamp: now,
        message: "Memory summary updated.",
        data: summary,
      },
    ],
  };
}

export function applyObservabilitySummary(run, summary) {
  const now = new Date().toISOString();
  return {
    ...run,
    observabilitySummary: summary,
    updatedAt: now,
    events: [
      ...run.events,
      {
        id: randomUUID(),
        type: "observability.summarized",
        timestamp: now,
        message: "Observability summary generated.",
        data: summary,
      },
    ],
  };
}

export function summarizeWorkflow(run) {
  return {
    id: run.id,
    goal: run.goal,
    status: run.status,
    currentPhase: run.currentPhase,
    taskCount: run.tasks.length,
    sourceCount: run.sources.length,
    verificationCount: run.verificationResults.length,
    toolCallCount: run.toolCallLogs?.length ?? 0,
    approvalDecision: run.approval?.decision,
    updatedAt: run.updatedAt,
  };
}

export class WorkflowStore {
  constructor(cwd) {
    this.cwd = cwd;
    this.rootDir = join(cwd, ".agentforge");
    this.workflowDir = join(this.rootDir, "workflows");
  }

  pathForRun(runId) {
    return join(this.workflowDir, `${runId}.json`);
  }

  async ensureDirs() {
    await mkdir(this.workflowDir, { recursive: true });
  }

  async createRun(goal) {
    const run = createWorkflowRun(goal);
    await this.updateRun(run);
    return run;
  }

  async updateRun(run) {
    await this.ensureDirs();
    const json = `${JSON.stringify(run, null, 2)}\n`;
    await writeFile(this.pathForRun(run.id), json, "utf8");
  }

  async loadRun(runId) {
    const raw = await readFile(this.pathForRun(runId), "utf8");
    return JSON.parse(raw);
  }

  async appendEvent(runId, event) {
    const run = await this.loadRun(runId);
    const now = new Date().toISOString();
    const nextRun = {
      ...run,
      updatedAt: now,
      events: [
        ...run.events,
        {
          id: randomUUID(),
          timestamp: now,
          ...event,
        },
      ],
    };
    await this.updateRun(nextRun);
    return nextRun;
  }

  async listRuns() {
    await this.ensureDirs();
    const files = await readdir(this.workflowDir);
    return files.filter((file) => file.endsWith(".json")).sort();
  }

  async loadLatestRun() {
    const runs = await this.listRuns();
    const latest = runs.at(-1);
    if (!latest) return undefined;
    const raw = await readFile(join(this.workflowDir, latest), "utf8");
    return JSON.parse(raw);
  }
}
