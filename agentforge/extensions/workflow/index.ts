import type { ExtensionAPI, ExtensionCommandContext, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { parsePlanArtifactFromText, planArtifactToTasks } from "../../src/artifacts.js";
import { detectVerificationCommands, runVerificationCommands } from "../../src/verification-runner.js";
import {
  applyApprovalDecision,
  applyVerificationResults,
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
  const approval = summary.approvalDecision ? ` | approval ${summary.approvalDecision}` : "";
  return `AgentForge | ${summary.currentPhase} | tasks 0/${summary.taskCount} | sources ${summary.sourceCount} | verify ${summary.verificationCount}${approval}`;
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

function formatApprovalSummary(run: any): string {
  const plan = run.planArtifact;
  const lines = [
    `Goal: ${run.goal}`,
    "",
    `Plan: ${plan?.summary ?? "No plan summary."}`,
    "",
    "Steps:",
    ...(plan?.steps ?? []).map((step: any, index: number) => `${index + 1}. ${step.title}`),
  ];

  if (plan?.risks?.length) {
    lines.push("", "Risks:", ...plan.risks.map((risk: string) => `- ${risk}`));
  }

  if (plan?.verificationCommands?.length) {
    lines.push(
      "",
      "Verification:",
      ...plan.verificationCommands.map((item: any) => `- ${item.command}: ${item.reason}`),
    );
  }

  return lines.join("\n");
}

async function applyAndPersistApproval(
  pi: ExtensionAPI,
  ctx: ExtensionContext,
  run: any,
  decision: "approved" | "revision_requested" | "cancelled",
  note: string,
) {
  const store = new WorkflowStore(ctx.cwd);
  let nextRun = applyApprovalDecision(run, decision, { note });

  if (decision === "approved") {
    nextRun = transitionWorkflow(nextRun, "executing", {
      summary: "Plan approved; execution phase started.",
    });
  } else if (decision === "revision_requested") {
    nextRun = transitionWorkflow(nextRun, "planning", {
      summary: "User requested plan revision.",
    });
  } else {
    nextRun = transitionWorkflow(nextRun, "cancelled", {
      status: "cancelled",
      phaseStatus: "done",
      completed: true,
      summary: "Workflow cancelled during approval.",
    });
  }

  await store.updateRun(nextRun);
  mirrorWorkflow(pi, nextRun);
  setWorkflowStatus(ctx, nextRun);
  return nextRun;
}

async function approveLatestWorkflow(pi: ExtensionAPI, ctx: ExtensionCommandContext) {
  const store = new WorkflowStore(ctx.cwd);
  const run = await store.loadLatestRun();
  if (!run) {
    ctx.ui.notify("No AgentForge workflow found for this project.", "warning");
    return;
  }
  if (run.currentPhase !== "waiting_approval") {
    ctx.ui.notify(`Latest workflow is in ${run.currentPhase}, not waiting_approval.`, "warning");
    return;
  }

  const summary = formatApprovalSummary(run);
  const options = ["Approve and execute", "Request revision", "Cancel workflow"];
  let choice: string | undefined;

  if (ctx.hasUI) {
    choice = await ctx.ui.select(`AgentForge Plan Approval\n\n${summary}`, options);
  } else {
    ctx.ui.notify("UI unavailable; use /workflow-approve approve|revise|cancel.", "warning");
    return;
  }

  if (!choice) {
    ctx.ui.notify("Approval selection cancelled.", "info");
    return;
  }

  if (choice === "Approve and execute") {
    await applyAndPersistApproval(pi, ctx, run, "approved", "User approved the plan.");
    ctx.ui.notify("AgentForge plan approved. Execution phase is ready.", "info");
    return;
  }

  if (choice === "Request revision") {
    const nextRun = await applyAndPersistApproval(pi, ctx, run, "revision_requested", "User requested plan revision.");
    ctx.ui.notify("AgentForge plan revision requested.", "info");
    pi.sendUserMessage([
      { type: "text", text: buildPlanningPrompt(nextRun) },
      { type: "text", text: "\nRevise the previous plan based on the approval feedback. Return JSON only." },
    ]);
    return;
  }

  await applyAndPersistApproval(pi, ctx, run, "cancelled", "User cancelled the workflow.");
  ctx.ui.notify("AgentForge workflow cancelled.", "info");
}

async function approveLatestWorkflowFromText(pi: ExtensionAPI, ctx: ExtensionCommandContext, args: string) {
  const normalized = args.trim().toLowerCase();
  if (!normalized) {
    await approveLatestWorkflow(pi, ctx);
    return;
  }

  const decisionMap: Record<string, "approved" | "revision_requested" | "cancelled"> = {
    approve: "approved",
    approved: "approved",
    revise: "revision_requested",
    revision: "revision_requested",
    cancel: "cancelled",
    cancelled: "cancelled",
  };
  const decision = decisionMap[normalized];
  if (!decision) {
    ctx.ui.notify("Usage: /workflow-approve [approve|revise|cancel]", "warning");
    return;
  }

  const store = new WorkflowStore(ctx.cwd);
  const run = await store.loadLatestRun();
  if (!run) {
    ctx.ui.notify("No AgentForge workflow found for this project.", "warning");
    return;
  }
  if (run.currentPhase !== "waiting_approval") {
    ctx.ui.notify(`Latest workflow is in ${run.currentPhase}, not waiting_approval.`, "warning");
    return;
  }
  await applyAndPersistApproval(pi, ctx, run, decision, `Text approval decision: ${decision}.`);
  ctx.ui.notify(`AgentForge approval decision recorded: ${decision}.`, "info");
}

async function verifyLatestWorkflow(pi: ExtensionAPI, ctx: ExtensionCommandContext) {
  const store = new WorkflowStore(ctx.cwd);
  let run = await store.loadLatestRun();
  if (!run) {
    ctx.ui.notify("No AgentForge workflow found for this project.", "warning");
    return;
  }
  if (!["executing", "verifying"].includes(run.currentPhase)) {
    ctx.ui.notify(`Latest workflow is in ${run.currentPhase}; expected executing or verifying.`, "warning");
    return;
  }

  let commands = run.planArtifact?.verificationCommands ?? [];
  if (!Array.isArray(commands) || commands.length === 0) {
    commands = await detectVerificationCommands(ctx.cwd);
  }

  if (!commands.length) {
    run = appendWorkflowEvent(run, {
      type: "verification.skipped",
      message: "No verification commands were found.",
      data: {},
    });
    await store.updateRun(run);
    mirrorWorkflow(pi, run);
    setWorkflowStatus(ctx, run);
    ctx.ui.notify("No verification commands found.", "warning");
    return;
  }

  run = transitionWorkflow(run, "verifying", {
    summary: `Running ${commands.length} verification command(s).`,
  });
  await store.updateRun(run);
  mirrorWorkflow(pi, run);
  setWorkflowStatus(ctx, run);

  ctx.ui.notify(`AgentForge running verification: ${commands.map((item: any) => item.command).join(", ")}`, "info");
  const results = await runVerificationCommands(commands, { cwd: ctx.cwd });
  run = await store.loadRun(run.id);
  run = applyVerificationResults(run, results);
  run = transitionWorkflow(run, "reviewing", {
    summary: "Verification completed; review phase started.",
  });
  await store.updateRun(run);
  mirrorWorkflow(pi, run);
  setWorkflowStatus(ctx, run);

  const failed = results.filter((result: any) => result.status === "failed").length;
  ctx.ui.notify(
    failed ? `Verification completed with ${failed} failure(s).` : "Verification passed.",
    failed ? "warning" : "info",
  );
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

  pi.registerCommand("workflow-approve", {
    description: "Approve, revise, or cancel the latest AgentForge plan",
    handler: async (args, ctx) => {
      await approveLatestWorkflowFromText(pi, ctx, args);
    },
  });

  pi.registerCommand("workflow-verify", {
    description: "Run verification commands for the latest AgentForge workflow",
    handler: async (_args, ctx) => {
      await verifyLatestWorkflow(pi, ctx);
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
