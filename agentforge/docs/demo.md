# AgentForge Demo Script

This demo uses `examples/demo-task-board` as a small, deterministic target repository.

## Goal

```text
Add priority filtering to the task board app.
```

The demo app already supports status, assignee, and tag filtering. It does not yet support priority, so the task is small enough to finish quickly but real enough to show planning, execution, and verification.

## Prepare

From the AgentForge project:

```powershell
cd examples/demo-task-board
npm.cmd test
npm.cmd run build
```

## Run The Workflow

Launch AgentForge from the demo app directory:

```powershell
node ..\..\bin\agentforge.mjs
```

Inside Pi:

```text
/workflow Add priority filtering to the task board app
```

The expected flow:

1. AgentForge creates a workflow run.
2. The model returns a structured JSON plan.
3. AgentForge parses the plan and waits for approval.
4. You approve with `/workflow-approve approve`.
5. The agent edits the task model and tests.
6. You run `/workflow-verify`.
7. You run `/workflow-report`.

## Expected Code Changes

The implementation should normally touch:

- `src/tasks.js`
- `src/task-board.js`
- `test/task-board.test.mjs`
- optionally `README.md`

## Verification

```powershell
npm.cmd test
npm.cmd run build
```

## Portfolio Story

Use this narrative:

```text
I built AgentForge on top of Pi to make coding-agent work auditable. The demo shows a feature request moving through structured planning, human approval, controlled execution, automated verification, and final evidence reports.
```
