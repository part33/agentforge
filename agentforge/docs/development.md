# AgentForge Development

## First Slice

The first slice proves the runtime boundary:

```text
agentforge CLI -> Pi launcher -> AgentForge workflow extension -> WorkflowStore
```

Implemented behavior:

- `agentforge --version`
- `agentforge --help`
- Pi launch with `extensions/workflow/index.ts` preloaded
- `/workflow <goal>` command
- deterministic `idle -> exploring -> planning` transitions
- `.agentforge/workflows/<workflow-id>.json`
- Pi session mirror entries via `pi.appendEntry`
- status/footer update for latest workflow phase

## Second Slice

The second slice adds the first medium-control phase protocol:

- plan artifact JSON extraction from assistant output
- plan artifact validation
- conversion from accepted plan steps to workflow tasks
- `plan.accepted` and `plan.invalid` workflow events
- automatic `planning -> waiting_approval` transition when the plan artifact is valid

## Third Slice

The third slice adds the approval gate:

- `/workflow-approve` command
- TUI/RPC `ctx.ui.select()` approval selector
- text fallback: `/workflow-approve approve|revise|cancel`
- approval decisions persisted in workflow state
- approved plans move to `executing`
- revision requests move back to `planning`
- cancelled workflows move to `cancelled`

## Fourth Slice

The fourth slice adds verification execution:

- `detectVerificationCommands(cwd)` reads known scripts from `package.json`
- `runVerificationCommand()` executes commands and captures exit code, duration, stdout/stderr summary, and timeout state
- `/workflow-verify` runs plan-defined verification commands or falls back to detected package scripts
- verification results are persisted in workflow state
- workflow moves from `executing` or `verifying` to `reviewing` after verification completes

## Fifth Slice

The fifth slice adds durable reports:

- `renderMarkdownReport()` builds a human-readable workflow report
- `createReportMetadata()` builds machine-readable report metadata
- `writeWorkflowReport()` writes `.agentforge/reports/*.md` and `.json`
- `/workflow-report` generates reports for the latest workflow
- report paths are persisted in workflow state
- workflow moves to `done` after report generation

## Sixth Slice

The sixth slice adds policy controls:

- `evaluateToolCallPolicy()` classifies tool calls as allow, confirm, or block
- dangerous bash commands are blocked
- git write/package install commands require confirmation
- writes/edits to sensitive paths are blocked
- Pi `tool_call` hook enforces policy decisions
- policy events are persisted and included in reports

## Verification

PowerShell may block `npm.ps1` on Windows. Use `npm.cmd`:

```powershell
npm.cmd test
npm.cmd run smoke
```

Direct commands:

```powershell
node --test
node ./bin/agentforge.mjs --version
node ./bin/agentforge.mjs --help
```

## Next Slice

Implement the demo repository:

- Create `examples/demo-task-board`.
- Add a small app with test/build scripts.
- Add a demo task for priority filtering.
- Use it to exercise `/workflow`, approval, verification, and reports.

The goal is to make the workflow demonstrable without relying on a random external repository.
