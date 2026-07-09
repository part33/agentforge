import { createTask, filterTasks, groupTasksByStatus } from "./tasks.js";
import { pathToFileURL } from "node:url";

export const sampleTasks = [
  createTask({ id: "task-1", title: "Design workflow state", status: "done", assignee: "Ada", tags: ["agent"] }),
  createTask({ id: "task-2", title: "Add approval gate", status: "doing", assignee: "Lin", tags: ["agent", "ux"] }),
  createTask({ id: "task-3", title: "Write report generator", status: "todo", assignee: "Ada", tags: ["docs"] }),
];

export function createTaskBoard(tasks = sampleTasks, filters = {}) {
  const visibleTasks = filterTasks(tasks, filters);
  const columns = groupTasksByStatus(visibleTasks);
  return {
    filters,
    total: visibleTasks.length,
    columns,
  };
}

export function renderBoard(board) {
  return Object.entries(board.columns)
    .map(([status, tasks]) => {
      const titles = tasks.map((task) => task.title).join(", ") || "empty";
      return `${status.toUpperCase()}: ${titles}`;
    })
    .join("\n");
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(renderBoard(createTaskBoard()));
}
