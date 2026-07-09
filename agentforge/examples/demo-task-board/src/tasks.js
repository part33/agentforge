export const TASK_STATUSES = ["todo", "doing", "done"];

export function createTask(input) {
  if (!input?.id) throw new Error("Task id is required.");
  if (!input?.title) throw new Error("Task title is required.");
  const status = input.status ?? "todo";
  if (!TASK_STATUSES.includes(status)) {
    throw new Error(`Unsupported task status: ${status}`);
  }
  return {
    id: input.id,
    title: input.title,
    status,
    assignee: input.assignee ?? "unassigned",
    tags: Array.isArray(input.tags) ? input.tags : [],
  };
}

export function groupTasksByStatus(tasks) {
  const board = Object.fromEntries(TASK_STATUSES.map((status) => [status, []]));
  for (const task of tasks) {
    board[task.status].push(task);
  }
  return board;
}

export function filterTasks(tasks, filters = {}) {
  return tasks.filter((task) => {
    if (filters.status && task.status !== filters.status) return false;
    if (filters.assignee && task.assignee !== filters.assignee) return false;
    if (filters.tag && !task.tags.includes(filters.tag)) return false;
    return true;
  });
}
