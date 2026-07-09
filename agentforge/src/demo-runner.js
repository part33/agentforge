import { resolve } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { writeWorkflowReport } from "./report-generator.js";
import { createMcpServerManifest, createPiToolBridge } from "./mcp-adapter.js";
import { createToolCallLog, summarizeObservability } from "./observability.js";
import { assignSubagents } from "./subagents.js";
import {
  applyApprovalDecision,
  applyMcpBridge,
  applyMemorySummary,
  applyObservabilitySummary,
  applyPlanArtifact,
  applyReportPaths,
  applyVerificationResults,
  appendPolicyEvent,
  appendResearchSources,
  appendToolCallLog,
  applySubagentAssignments,
  createWorkflowRun,
  transitionWorkflow,
} from "./workflow-store.js";

export function createDemoWorkflowRun(options = {}) {
  const runId = options.id ?? "wf-demo-agentforge";
  let run = createWorkflowRun("Add priority filtering to the task board app", { id: runId });
  const artifact = {
    goal: run.goal,
    summary: "为任务模型增加 priority 字段，扩展过滤逻辑，并补充测试验证高优先级任务筛选。",
    steps: [
      {
        id: "step-1",
        title: "扩展任务模型",
        rationale: "任务需要携带 priority 字段，过滤逻辑才能基于优先级工作。",
        expectedFiles: ["src/tasks.js"],
        status: "done",
      },
      {
        id: "step-2",
        title: "增加 priority 过滤条件",
        rationale: "filterTasks 需要识别 filters.priority。",
        expectedFiles: ["src/tasks.js", "src/task-board.js"],
        status: "done",
      },
      {
        id: "step-3",
        title: "补充测试和演示数据",
        rationale: "用自动化测试证明新增过滤行为稳定。",
        expectedFiles: ["test/task-board.test.mjs"],
        status: "done",
      },
    ],
    risks: ["已有调用方如果没有 priority 字段，需要保持默认值兼容。"],
    verificationCommands: [
      { command: "npm.cmd test", reason: "运行 demo app 测试", required: true },
      { command: "npm.cmd run build", reason: "确认 demo app 能正常输出任务看板", required: true },
    ],
    researchSources: ["examples/demo-task-board/README.md"],
  };

  run = transitionWorkflow(run, "exploring", { summary: "检查 demo app 的任务模型和过滤能力。" });
  run = transitionWorkflow(run, "planning", { summary: "生成结构化执行计划。" });
  run = applyPlanArtifact(
    run,
    artifact,
    artifact.steps.map((step) => ({
      id: step.id,
      phase: "execute",
      title: step.title,
      rationale: step.rationale,
      status: step.status,
      files: step.expectedFiles,
      evidence: [],
    })),
  );
  run = transitionWorkflow(run, "waiting_approval", { summary: "等待人工审批计划。" });
  run = applyApprovalDecision(run, "approved", { note: "演示流程中批准该计划。" });
  run = transitionWorkflow(run, "executing", { summary: "根据计划修改任务模型、过滤逻辑和测试。" });
  run = applySubagentAssignments(run, assignSubagents(run));
  run = applyMemorySummary(run, {
    projectKnowledge: 1,
    userPreferences: 1,
    rules: 1,
    updatedAt: "2026-07-09T00:00:00.000Z",
  });
  run = applyMcpBridge(
    run,
    createPiToolBridge(
      createMcpServerManifest({
        servers: [
          {
            id: "repo",
            name: "Repository MCP",
            command: "configured-externally",
            tools: [{ name: "search", description: "Search repository context." }],
          },
        ],
      }),
    ),
  );
  run = appendResearchSources(run, [
    {
      id: "src-demo-readme",
      title: "AgentForge Demo Task Board README",
      url: "https://example.local/agentforge/examples/demo-task-board",
      snippet: "Demo app supports status, assignee, and tag filtering.",
      summary: "演示项目说明了当前任务看板已有过滤能力，以及 priority filtering 的预期实现方向。",
      usedFor: "确认 demo app 的功能边界和目标需求。",
      fetchedAt: "2026-07-09T00:00:00.000Z",
    },
  ]);
  run = appendPolicyEvent(run, {
    toolName: "shell",
    toolCallId: "demo-policy-1",
    decision: "allow",
    reason: "允许读取和测试 demo app 文件。",
  });
  run = appendToolCallLog(
    run,
    createToolCallLog({
      toolName: "shell",
      toolCallId: "demo-policy-1",
      input: { command: "npm.cmd test" },
      decision: { decision: "allow" },
      status: "allowed",
      startedAt: "2026-07-09T00:00:01.000Z",
      completedAt: "2026-07-09T00:00:01.210Z",
    }),
  );
  run = transitionWorkflow(run, "verifying", { summary: "运行测试和构建命令。" });
  run = applyVerificationResults(run, [
    { command: "npm.cmd test", status: "passed", exitCode: 0, summary: "5 tests passed", durationMs: 210 },
    { command: "npm.cmd run build", status: "passed", exitCode: 0, summary: "Task board rendered successfully", durationMs: 120 },
  ]);
  run = transitionWorkflow(run, "reviewing", { summary: "验证通过，进入复盘阶段。" });
  run = transitionWorkflow(run, "reporting", { summary: "生成演示报告。" });
  run = transitionWorkflow(run, "done", {
    status: "done",
    phaseStatus: "done",
    completed: true,
    summary: "演示报告生成完成。",
  });
  run = applyObservabilitySummary(run, summarizeObservability(run));
  return run;
}

export async function writeDemoReport(options = {}) {
  const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const cwd =
    options.cwd ??
    resolve(packageRoot, "examples", "demo-task-board");
  let run = createDemoWorkflowRun(options);
  const paths = await writeWorkflowReport(run, cwd);
  run = applyReportPaths(run, paths);
  return { run, paths };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { paths } = await writeDemoReport({ cwd: process.cwd() });
  console.log(`AgentForge demo report written: ${paths.html}`);
}
