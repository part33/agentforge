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

Implement the verification runner:

- Detect verification commands from `package.json`.
- Store suggested commands during Explore/Plan.
- Execute approved commands.
- Capture exit code, duration, and output summary.

The goal is to prove that AgentForge can verify changes instead of only claiming completion.
