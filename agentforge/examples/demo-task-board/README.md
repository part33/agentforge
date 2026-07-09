# AgentForge Demo Task Board

This small Node app is the prepared demo target for AgentForge.

## Baseline Behavior

- Creates tasks with status, assignee, and tags.
- Groups tasks into `todo`, `doing`, and `done` columns.
- Filters tasks by status, assignee, or tag.
- Runs with built-in Node test tooling.

## Demo Task

Ask AgentForge to implement:

```text
Add priority filtering to the task board app.
```

Expected implementation shape:

- Add a `priority` field to tasks.
- Validate supported priority values such as `low`, `medium`, and `high`.
- Allow `filterTasks(tasks, { priority: "high" })`.
- Update sample data and tests.

## Commands

```powershell
npm.cmd test
npm.cmd run build
```
