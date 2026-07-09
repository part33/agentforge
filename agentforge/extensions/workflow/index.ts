import type { ExtensionAPI, ExtensionCommandContext, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { summarizeWorkflow, transitionWorkflow, WorkflowStore } from "../../src/workflow-store.js";

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
    "For this first implementation slice, acknowledge the workflow and produce a brief exploration-and-plan outline.",
    "Do not modify files yet. Focus on what should be inspected next and what a real plan artifact should contain.",
  ].join("\n");
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
}
