# AgentForge

AgentForge is an enhanced Pi distribution for software engineering agent workflows.

It adds an opinionated workflow layer on top of Pi:

```text
Explore -> Plan -> Approve -> Execute -> Verify -> Review -> Report
```

## Current Slice

This first implementation slice includes:

- `agentforge` CLI entry
- `--version` and `--help`
- Pi launcher with AgentForge workflow extension preloaded
- `/workflow <goal>` command skeleton
- `.agentforge/workflows/<id>.json` persistence
- Pi session mirror entries for workflow state

## Usage

From this repository:

```bash
cd agentforge
npm run smoke
```

Launch an interactive Pi session with AgentForge loaded:

```bash
node ./bin/agentforge.mjs
```

Start a workflow directly:

```bash
node ./bin/agentforge.mjs "Add priority filtering to the task board app"
```

If Pi is not installed globally, the launcher tries the local `../pi/pi-test.ps1` or `../pi/pi-test.sh` scripts. You can also override the executable:

```bash
set AGENTFORGE_PI_BIN=pi
node ./bin/agentforge.mjs
```

## Development

```bash
npm test
```
