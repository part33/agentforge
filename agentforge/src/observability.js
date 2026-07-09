export function createToolCallLog({ toolName, toolCallId, input, decision, startedAt, completedAt, status = "unknown" }) {
  const start = startedAt ? new Date(startedAt) : new Date();
  const end = completedAt ? new Date(completedAt) : new Date();
  return {
    toolName,
    toolCallId,
    input,
    decision: decision?.decision ?? decision,
    status,
    startedAt: start.toISOString(),
    completedAt: end.toISOString(),
    durationMs: Math.max(0, end.getTime() - start.getTime()),
  };
}

export function summarizeObservability(run) {
  const events = run.events ?? [];
  const toolCalls = run.toolCallLogs ?? [];
  const verificationResults = run.verificationResults ?? [];
  const phaseCounts = {};
  for (const event of events) {
    if (event.type === "workflow.phase_changed") {
      const phase = event.data?.phase ?? "unknown";
      phaseCounts[phase] = (phaseCounts[phase] ?? 0) + 1;
    }
  }

  const estimatedTokens = run.usage?.totalTokens ?? 0;
  const estimatedCostUsd = run.usage?.estimatedCostUsd ?? 0;

  return {
    schemaVersion: 1,
    workflowId: run.id,
    generatedAt: new Date().toISOString(),
    eventCount: events.length,
    phaseCounts,
    toolCallCount: toolCalls.length,
    blockedToolCallCount: (run.policyEvents ?? []).filter((event) => event.decision === "block").length,
    verificationCount: verificationResults.length,
    failedVerificationCount: verificationResults.filter((result) => result.status !== "passed").length,
    estimatedTokens,
    estimatedCostUsd,
  };
}

export function renderObservabilityMarkdown(summary) {
  return [
    "# AgentForge Observability Summary",
    "",
    `- Workflow ID: ${summary.workflowId}`,
    `- Events: ${summary.eventCount}`,
    `- Tool calls: ${summary.toolCallCount}`,
    `- Blocked tool calls: ${summary.blockedToolCallCount}`,
    `- Verification commands: ${summary.verificationCount}`,
    `- Failed verification commands: ${summary.failedVerificationCount}`,
    `- Estimated tokens: ${summary.estimatedTokens}`,
    `- Estimated cost USD: ${summary.estimatedCostUsd}`,
    "",
    "## Phase Counts",
    "",
    ...Object.entries(summary.phaseCounts).map(([phase, count]) => `- ${phase}: ${count}`),
    "",
  ].join("\n");
}
