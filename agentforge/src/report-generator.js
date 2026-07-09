import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

function slugify(text) {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return slug || "workflow";
}

function tableRow(cells) {
  return `| ${cells.map((cell) => String(cell ?? "").replace(/\n/g, "<br>")).join(" | ")} |`;
}

function renderList(items, emptyText = "None recorded.") {
  if (!Array.isArray(items) || items.length === 0) {
    return emptyText;
  }
  return items.map((item) => `- ${item}`).join("\n");
}

function renderPlan(run) {
  const plan = run.planArtifact;
  if (!plan) {
    return "No structured plan artifact recorded.";
  }

  const lines = [`Summary: ${plan.summary}`, "", "Steps:"];
  for (const step of plan.steps ?? []) {
    lines.push(`- [${step.status ?? "pending"}] ${step.id}: ${step.title}`);
    if (step.rationale) lines.push(`  - Rationale: ${step.rationale}`);
    if (step.expectedFiles?.length) lines.push(`  - Expected files: ${step.expectedFiles.join(", ")}`);
  }
  lines.push("", "Risks:", renderList(plan.risks));
  lines.push("", "Verification commands:");
  if (plan.verificationCommands?.length) {
    for (const command of plan.verificationCommands) {
      lines.push(`- \`${command.command}\` (${command.required === false ? "optional" : "required"}): ${command.reason}`);
    }
  } else {
    lines.push("None recorded.");
  }
  return lines.join("\n");
}

function renderVerification(run) {
  const results = run.verificationResults ?? [];
  if (!results.length) {
    return "No verification results recorded.";
  }

  const lines = [
    tableRow(["Command", "Status", "Exit Code", "Duration", "Summary"]),
    tableRow(["---", "---", "---", "---", "---"]),
  ];
  for (const result of results) {
    lines.push(
      tableRow([
        `\`${result.command}\``,
        result.status,
        result.exitCode ?? "n/a",
        `${result.durationMs}ms`,
        result.summary,
      ]),
    );
  }
  return lines.join("\n");
}

function renderEvents(run) {
  const events = run.events ?? [];
  if (!events.length) {
    return "No events recorded.";
  }

  return events
    .map((event) => `- ${event.timestamp} - ${event.type}: ${event.message ?? ""}`.trim())
    .join("\n");
}

function renderSources(run) {
  const sources = run.sources ?? [];
  if (!sources.length) {
    return "No external sources recorded.";
  }

  return sources.map((source) => `- [${source.title ?? source.url}](${source.url}) - ${source.summary ?? ""}`).join("\n");
}

export function renderMarkdownReport(run) {
  return [
    `# AgentForge Workflow Report`,
    "",
    `## Goal`,
    "",
    run.goal,
    "",
    `## Status`,
    "",
    `- Workflow ID: \`${run.id}\``,
    `- Status: ${run.status}`,
    `- Current phase: ${run.currentPhase}`,
    `- Created: ${run.createdAt}`,
    `- Updated: ${run.updatedAt}`,
    "",
    `## Approval`,
    "",
    run.approval
      ? `- Decision: ${run.approval.decision}\n- Decided at: ${run.approval.decidedAt}\n- Note: ${run.approval.note ?? ""}`
      : "No approval decision recorded.",
    "",
    `## Plan`,
    "",
    renderPlan(run),
    "",
    `## Tasks`,
    "",
    renderList((run.tasks ?? []).map((task) => `[${task.status}] ${task.id}: ${task.title}`)),
    "",
    `## Verification`,
    "",
    renderVerification(run),
    "",
    `## External Sources`,
    "",
    renderSources(run),
    "",
    `## Policy Events`,
    "",
    renderList((run.policyEvents ?? []).map((event) => `${event.decision}: ${event.reason ?? event.command ?? ""}`)),
    "",
    `## Timeline`,
    "",
    renderEvents(run),
    "",
  ].join("\n");
}

export function createReportMetadata(run, paths = {}) {
  return {
    schemaVersion: 1,
    workflowId: run.id,
    goal: run.goal,
    status: run.status,
    currentPhase: run.currentPhase,
    createdAt: run.createdAt,
    updatedAt: run.updatedAt,
    approval: run.approval,
    planArtifact: run.planArtifact,
    tasks: run.tasks ?? [],
    sources: run.sources ?? [],
    verificationResults: run.verificationResults ?? [],
    policyEvents: run.policyEvents ?? [],
    eventCount: run.events?.length ?? 0,
    reportPaths: paths,
  };
}

export async function writeWorkflowReport(run, cwd) {
  const reportsDir = join(cwd, ".agentforge", "reports");
  await mkdir(reportsDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+$/, "Z");
  const baseName = `${timestamp}-${slugify(run.goal)}`;
  const markdownPath = join(reportsDir, `${baseName}.md`);
  const jsonPath = join(reportsDir, `${baseName}.json`);
  const paths = { markdown: markdownPath, json: jsonPath };

  await writeFile(markdownPath, renderMarkdownReport(run), "utf8");
  await writeFile(jsonPath, `${JSON.stringify(createReportMetadata(run, paths), null, 2)}\n`, "utf8");

  return paths;
}
