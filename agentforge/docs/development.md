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

Implement the approval gate:

- Render an approval selector in TUI mode.
- Support approve, revise, and cancel.
- Persist the approval decision.
- Keep text fallback for non-TUI modes.

The goal is to prevent execution until a structured plan has been explicitly approved.
