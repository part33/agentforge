import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

function slugify(text) {
  const slug = String(text ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return slug || "workflow";
}

function createCheck(id, title, passed, points, maxPoints, details, recommendation) {
  return {
    id,
    title,
    passed,
    points: passed ? points : 0,
    maxPoints,
    details,
    recommendation: passed ? undefined : recommendation,
  };
}

function gradeForScore(score) {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

export function evaluateWorkflowRun(run, options = {}) {
  const minSources = options.minSources ?? 1;
  const checks = [];
  const plan = run.planArtifact;
  const verificationResults = run.verificationResults ?? [];
  const failedVerifications = verificationResults.filter((result) => result.status !== "passed");
  const reportPaths = run.reportPaths ?? {};

  checks.push(
    createCheck(
      "workflow.done",
      "工作流完成状态",
      run.status === "done" && run.currentPhase === "done",
      15,
      15,
      `status=${run.status}, currentPhase=${run.currentPhase}`,
      "让 workflow 正常走到 done 阶段后再评估。",
    ),
  );

  checks.push(
    createCheck(
      "plan.structured",
      "结构化计划",
      Boolean(plan?.summary && Array.isArray(plan.steps) && plan.steps.length > 0),
      15,
      15,
      plan ? `steps=${plan.steps?.length ?? 0}` : "没有记录 planArtifact",
      "要求模型先输出符合 AgentForge 协议的 JSON plan artifact。",
    ),
  );

  checks.push(
    createCheck(
      "approval.recorded",
      "人工审批记录",
      run.approval?.decision === "approved",
      10,
      10,
      run.approval ? `decision=${run.approval.decision}` : "没有审批记录",
      "执行前使用 /workflow-approve approve 记录人工确认。",
    ),
  );

  checks.push(
    createCheck(
      "verification.passed",
      "自动化验证通过",
      verificationResults.length > 0 && failedVerifications.length === 0,
      25,
      25,
      `total=${verificationResults.length}, failed=${failedVerifications.length}`,
      "至少运行一次测试或构建命令，并确保所有 required 验证通过。",
    ),
  );

  checks.push(
    createCheck(
      "research.sources",
      "调研来源记录",
      (run.sources ?? []).length >= minSources,
      10,
      10,
      `sources=${run.sources?.length ?? 0}, required=${minSources}`,
      "使用 /workflow-research 或 plan artifact 记录至少一个外部/项目来源。",
    ),
  );

  checks.push(
    createCheck(
      "policy.audit",
      "策略审计事件",
      (run.policyEvents ?? []).length > 0,
      10,
      10,
      `policyEvents=${run.policyEvents?.length ?? 0}`,
      "让工具调用经过 policy engine，并在报告中留下 allow/confirm/block 记录。",
    ),
  );

  checks.push(
    createCheck(
      "reports.generated",
      "报告产物完整",
      Boolean(reportPaths.markdown && reportPaths.json && reportPaths.html),
      15,
      15,
      `markdown=${Boolean(reportPaths.markdown)}, json=${Boolean(reportPaths.json)}, html=${Boolean(reportPaths.html)}`,
      "运行 /workflow-report 或 demo:report，生成 Markdown、JSON 和 HTML 报告。",
    ),
  );

  checks.push(
    createCheck(
      "subagents.assigned",
      "Subagent 任务派发",
      (run.subagentAssignments ?? []).length > 0,
      10,
      10,
      `assignments=${run.subagentAssignments?.length ?? 0}`,
      "运行 /workflow-subagents，把任务派给 scout/planner/worker/reviewer。",
    ),
  );

  checks.push(
    createCheck(
      "mcp.bridge",
      "MCP 工具桥接",
      (run.mcpBridge?.tools ?? []).length > 0,
      10,
      10,
      `tools=${run.mcpBridge?.tools?.length ?? 0}`,
      "运行 /workflow-mcp <server.tool>，记录 MCP 到 Pi 的工具桥接配置。",
    ),
  );

  checks.push(
    createCheck(
      "memory.summary",
      "项目记忆沉淀",
      Boolean(run.memorySummary),
      10,
      10,
      run.memorySummary
        ? `knowledge=${run.memorySummary.projectKnowledge ?? 0}, preferences=${run.memorySummary.userPreferences ?? 0}, rules=${run.memorySummary.rules ?? 0}`
        : "没有 memorySummary",
      "运行 /workflow-memory knowledge|preference|rule <text>，沉淀项目知识、用户偏好或规则。",
    ),
  );

  checks.push(
    createCheck(
      "observability.summary",
      "可观测性摘要",
      Boolean(run.observabilitySummary),
      10,
      10,
      run.observabilitySummary
        ? `events=${run.observabilitySummary.eventCount}, toolCalls=${run.observabilitySummary.toolCallCount}`
        : "没有 observabilitySummary",
      "运行 /workflow-observe，生成工具调用、阶段和验证的观测摘要。",
    ),
  );

  const maxScore = checks.reduce((sum, check) => sum + check.maxPoints, 0);
  const score = checks.reduce((sum, check) => sum + check.points, 0);
  const normalizedScore = Math.round((score / maxScore) * 100);

  return {
    schemaVersion: 1,
    workflowId: run.id,
    goal: run.goal,
    evaluatedAt: new Date().toISOString(),
    score: normalizedScore,
    grade: gradeForScore(normalizedScore),
    passed: normalizedScore >= (options.passScore ?? 80),
    checks,
    summary: `${checks.filter((check) => check.passed).length}/${checks.length} checks passed`,
    recommendations: checks.filter((check) => !check.passed).map((check) => check.recommendation),
  };
}

export function renderEvaluationMarkdown(evaluation) {
  const lines = [
    "# AgentForge Workflow Evaluation",
    "",
    `- Workflow ID: \`${evaluation.workflowId}\``,
    `- Goal: ${evaluation.goal}`,
    `- Score: ${evaluation.score}`,
    `- Grade: ${evaluation.grade}`,
    `- Passed: ${evaluation.passed ? "yes" : "no"}`,
    `- Summary: ${evaluation.summary}`,
    `- Evaluated at: ${evaluation.evaluatedAt}`,
    "",
    "## Checks",
    "",
    "| Check | Result | Points | Details |",
    "| --- | --- | --- | --- |",
  ];

  for (const check of evaluation.checks) {
    lines.push(
      `| ${check.title} | ${check.passed ? "pass" : "fail"} | ${check.points}/${check.maxPoints} | ${String(check.details ?? "").replace(/\n/g, "<br>")} |`,
    );
  }

  lines.push("", "## Recommendations", "");
  if (evaluation.recommendations.length === 0) {
    lines.push("No recommendations. This workflow is ready to present.");
  } else {
    lines.push(...evaluation.recommendations.map((item) => `- ${item}`));
  }

  return `${lines.join("\n")}\n`;
}

export async function writeWorkflowEvaluation(run, cwd, options = {}) {
  const evaluationsDir = join(cwd, ".agentforge", "evaluations");
  await mkdir(evaluationsDir, { recursive: true });
  const evaluation = evaluateWorkflowRun(run, options);
  const timestamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+$/, "Z");
  const baseName = `${timestamp}-${slugify(run.goal)}`;
  const markdownPath = join(evaluationsDir, `${baseName}.md`);
  const jsonPath = join(evaluationsDir, `${baseName}.json`);
  const paths = { markdown: markdownPath, json: jsonPath };

  await writeFile(markdownPath, renderEvaluationMarkdown(evaluation), "utf8");
  await writeFile(jsonPath, `${JSON.stringify({ ...evaluation, paths }, null, 2)}\n`, "utf8");

  return { evaluation, paths };
}
