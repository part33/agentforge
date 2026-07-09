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

Implement structured phase artifacts:

- Define plan artifact schema.
- Parse and validate model output.
- Keep invalid output in planning phase.
- Add reportable workflow events for parse failures.

The goal is to move from deterministic stub transitions to validated medium-control phase progression.
