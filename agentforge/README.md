# AgentForge

AgentForge is an enhanced Pi distribution for software engineering agent workflows. It keeps Pi as the runtime and adds a productized workflow layer for planning, approval, verification, source-backed reports, and policy controls.

```text
Explore -> Research -> Plan -> Approve -> Execute -> Verify -> Review -> Report
```

## Why This Project Exists

Most coding agents are impressive in a live session but hard to explain afterward. AgentForge turns the session into a durable workflow:

- A structured plan artifact before code changes.
- A human approval gate before execution.
- Policy checks around risky tool calls.
- Verification commands captured as evidence.
- Markdown and JSON reports for review, demo, and resume storytelling.

## Commands

Launch AgentForge with the workflow extension preloaded:

```powershell
node ./bin/agentforge.mjs
```

Start a one-shot workflow:

```powershell
node ./bin/agentforge.mjs "Add priority filtering to the task board app"
```

Inside Pi:

```text
/workflow <goal>
/workflow-research <query or URL>
/workflow-status
/workflow-approve approve
/workflow-verify
/workflow-report
```

## Demo

The repository includes a prepared demo app at `examples/demo-task-board`.

```powershell
cd examples/demo-task-board
npm.cmd test
npm.cmd run build
```

Suggested demo goal:

```text
Add priority filtering to the task board app.
```

See `docs/demo.md` for a walkthrough.

## Architecture

AgentForge is deliberately layered:

- `bin/agentforge.mjs`: CLI wrapper that launches Pi with the AgentForge extension.
- `extensions/workflow/index.ts`: Pi extension commands and hooks.
- `src/workflow-store.js`: durable workflow state machine.
- `src/artifacts.js`: structured plan artifact parsing and validation.
- `src/research-connector.js`: source collection, page reading, deduplication, summaries.
- `src/policy-engine.js`: deterministic allow/confirm/block policy decisions.
- `src/verification-runner.js`: test/lint/build detection and execution.
- `src/report-generator.js`: Markdown and JSON workflow reports.
- `examples/demo-task-board`: reproducible portfolio demo target.

See `docs/architecture.md` for the deeper explanation.

## Development

PowerShell may block `npm.ps1` on Windows. Use `npm.cmd`:

```powershell
npm.cmd test
npm.cmd run smoke
```

## Resume Positioning

Possible resume bullet:

```text
Built AgentForge, a Pi-based software engineering agent workflow distribution with structured planning, approval gates, tool policy enforcement, automated verification, research source capture, and durable Markdown/JSON execution reports.
```
