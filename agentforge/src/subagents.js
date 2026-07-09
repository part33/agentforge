export const SUBAGENT_ROLES = [
  {
    id: "scout",
    name: "Scout",
    mission: "Collect repository context, constraints, and relevant files before planning.",
    owns: ["exploring", "research"],
  },
  {
    id: "planner",
    name: "Planner",
    mission: "Turn the goal and scout context into a structured implementation plan.",
    owns: ["planning", "waiting_approval"],
  },
  {
    id: "worker",
    name: "Worker",
    mission: "Apply the approved plan and keep changes scoped to the task.",
    owns: ["executing"],
  },
  {
    id: "reviewer",
    name: "Reviewer",
    mission: "Verify behavior, inspect risks, and prepare review evidence.",
    owns: ["verifying", "reviewing", "reporting"],
  },
];

const ROLE_BY_ID = new Map(SUBAGENT_ROLES.map((role) => [role.id, role]));

export function roleForPhase(phase) {
  return SUBAGENT_ROLES.find((role) => role.owns.includes(phase)) ?? ROLE_BY_ID.get("planner");
}

export function assignSubagents(run) {
  const assignments = [];
  const tasks = run.tasks?.length
    ? run.tasks
    : [
        { id: "explore", title: "Explore repository context", phase: "exploring" },
        { id: "plan", title: "Create implementation plan", phase: "planning" },
        { id: "execute", title: "Execute approved changes", phase: "executing" },
        { id: "verify", title: "Verify and review changes", phase: "verifying" },
      ];

  for (const task of tasks) {
    const role = roleForPhase(task.phase ?? "executing");
    assignments.push({
      taskId: task.id,
      taskTitle: task.title,
      roleId: role.id,
      roleName: role.name,
      mission: role.mission,
      status: task.status ?? "pending",
    });
  }

  return {
    schemaVersion: 1,
    workflowId: run.id,
    assignedAt: new Date().toISOString(),
    roles: SUBAGENT_ROLES,
    assignments,
  };
}

export function renderSubagentBriefing(bundle) {
  const lines = [
    "# AgentForge Subagent Briefing",
    "",
    `Workflow ID: ${bundle.workflowId}`,
    "",
    "## Roles",
    "",
    ...bundle.roles.map((role) => `- ${role.name}: ${role.mission}`),
    "",
    "## Assignments",
    "",
    ...bundle.assignments.map(
      (item) => `- ${item.roleName} -> ${item.taskId}: ${item.taskTitle} [${item.status}]`,
    ),
  ];
  return `${lines.join("\n")}\n`;
}
