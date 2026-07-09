import type { ExtensionAPI, ExtensionCommandContext, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { parsePlanArtifactFromText, planArtifactToTasks } from "../../src/artifacts.js";
import {
  appendWorkflowEvent,
  applyPlanArtifact,
  summarizeWorkflow,
  transitionWorkflow,
  WorkflowStore,
} from "../../src/workflow-store.js";

const ENTRY_TYPE = "agentforge.workflow";
const STATUS_KEY = "agentforge.workflow";

type WorkflowRun = ReturnType<typeof summarizeWorkflow> & {
  schemaVersion?: number;
  phases?: unknown[];
  events?: unknown[];
};

function formatStatus(summary: ReturnType<typeof summarizeWorkflow>): string {
  return `AgentForge | ${summary.currentPhase} | tasks 0/${summary.taskCount} | sources ${summary.sourceCount} | verify ${summary.verificationCount}`;
}

function setWorkflowStatus(ctx: ExtensionContext, run: WorkflowRun) {
  const theme = ctx.ui.theme;
  ctx.ui.setStatus(STATUS_KEY, theme.fg("accent", formatStatus(run)));
}

function mirrorWorkflow(pi: ExtensionAPI, run: WorkflowRun) {
  pi.appendEntry(ENTRY_TYPE, summarizeWorkflow(run));
}

function buildPlanningPrompt(run: WorkflowRun): string {
  return [
    `AgentForge workflow ${run.id} has been created.`,
    "",
    `Goal: ${run.goal}`,
    "",
    "Current phase: planning.",
    "",
    "Produce a structured plan artifact as JSON only. Do not modify files yet.",
    "",
    "Required JSON shape:",
    "```json",
    "{",
    '  "goal": "repeat the user goal",',
    '  "summary": "short implementation strategy",',
    '  "steps": [',
    "    {",
    '      "id": "step-1",',
    '      "title": "Inspect current task model and UI",',
    '      "rationale": "why this step is needed",',
    '      "expectedFiles": ["optional/path.ts"],',
    '      "status": "pending"',
    "    }",
    "  ],",
    '  "risks": ["risk or uncertainty"],',
    '  "verificationCommands": [',
    '    { "command": "npm test", "reason": "run existing test suite", "required": true }',
    "  ],",
    '  "researchSources": []',
    "}",
    "```",
    "",
    "Use status=pending for all proposed steps. If no verification command is known yet, use an empty verificationCommands array.",
  ].join("\n");
}

function extractAssistantText(message: any): string {
  if (!message || message.role !== "assistant") return "";
  const content = message.content;
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .filter((item) => item?.type === "text" && typeof item.text === "string")
    .map((item) => item.text)
    .join("\n")
    .trim();
}

async function startWorkflow(pi: ExtensionAPI, ctx: ExtensionCommandContext, goal: string) {
  const trimmedGoal = goal.trim();
  if (!trimmedGoal) {
    ctx.ui.notify("Usage: /workflow <software engineering goal>", "warning");
    return;
  }

  const store = new WorkflowStore(ctx.cwd);
  let run = await store.createRun(trimmedGoal);
  mirrorWorkflow(pi, run);

  run = transitionWorkflow(run, "exploring", {
    summary: "Initial deterministic exploration phase started.",
  });
  await store.updateRun(run);
  mirrorWorkflow(pi, run);
  setWorkflowStatus(ctx, run);

  run = transitionWorkflow(run, "planning", {
    summary: "Initial deterministic planning phase started.",
  });
  await store.updateRun(run);
  mirrorWorkflow(pi, run);
  setWorkflowStatus(ctx, run);

  ctx.ui.notify(`AgentForge workflow created: ${run.id}`, "info");
  pi.sendUserMessage(buildPlanningPrompt(run));
}

async function showLatestStatus(ctx: ExtensionCommandContext) {
  const store = new WorkflowStore(ctx.cwd);
  const run = await store.loadLatestRun();
  if (!run) {
    ctx.ui.notify("No AgentForge workflow found for this project.", "info");
    return;
  }
  setWorkflowStatus(ctx, run);
  ctx.ui.notify(`${run.id}: ${run.currentPhase} (${run.status})`, "info");
}

async function handlePlanningMessage(pi: ExtensionAPI, ctx: ExtensionContext, message: any) {
  const store = new WorkflowStore(ctx.cwd);
  let run = await store.loadLatestRun();
  if (!run || run.currentPhase !== "planning" || run.planArtifact) {
    return;
  }

  const text = extractAssistantText(message);
  if (!text) {
    return;
  }

  const parsed = parsePlanArtifactFromText(text);
  if (!parsed.ok) {
    run = appendWorkflowEvent(run, {
      type: "plan.invalid",
      message: "Model output did not match the AgentForge plan artifact protocol.",
      data: { errors: parsed.errors },
    });
    await store.updateRun(run);
    mirrorWorkflow(pi, run);
    setWorkflowStatus(ctx, run);
    ctx.ui.notify(`AgentForge plan artifact invalid: ${parsed.errors[0]}`, "warning");
    return;
  }

  const tasks = planArtifactToTasks(parsed.artifact);
  run = applyPlanArtifact(run, parsed.artifact, tasks);
  run = transitionWorkflow(run, "waiting_approval", {
    summary: "Structured plan accepted; waiting for user approval.",
  });
  await store.updateRun(run);
  mirrorWorkflow(pi, run);
  setWorkflowStatus(ctx, run);
  ctx.ui.notify(`AgentForge plan accepted with ${tasks.length} step(s).`, "info");
}

export default function agentForgeWorkflow(pi: ExtensionAPI) {
  pi.registerCommand("workflow", {
    description: "Start an AgentForge software engineering workflow",
    handler: async (args, ctx) => {
      await startWorkflow(pi, ctx, args);
    },
  });

  pi.registerCommand("workflow-status", {
    description: "Show the latest AgentForge workflow status",
    handler: async (_args, ctx) => {
      await showLatestStatus(ctx);
    },
  });

  pi.on("session_start", async (_event, ctx) => {
    const store = new WorkflowStore(ctx.cwd);
    const run = await store.loadLatestRun();
    if (run) {
      setWorkflowStatus(ctx, run);
    }
  });

  pi.on("message_end", async (event, ctx) => {
    await handlePlanningMessage(pi, ctx, event.message);
  });
}
