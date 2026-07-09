# AgentForge Architecture

AgentForge is built as an enhanced distribution around Pi instead of a fork of Pi core. That keeps the project focused: Pi owns the agent runtime, tool execution, and TUI; AgentForge owns the software engineering workflow product layer.

## Runtime Boundary

```text
agentforge CLI
  -> Pi executable
    -> AgentForge workflow extension
      -> workflow state, policy, verification, reports
```

The CLI resolves a Pi executable from `AGENTFORGE_PI_BIN`, the local cloned Pi scripts, or a global `pi` command. It passes the AgentForge extension through Pi's extension loading mechanism.

## Workflow State

`WorkflowStore` writes workflow runs to `.agentforge/workflows/*.json`. A run records:

- lifecycle phase and status
- structured plan artifact
- task list derived from plan steps
- research sources
- approval decision
- verification results
- policy events
- final report paths
- timeline events

The state machine is intentionally explicit so a workflow can be inspected, resumed, reported, or tested without a live agent session.

## Extension Commands

The Pi extension exposes:

- `/workflow <goal>`: creates a run and asks the model for a JSON plan artifact.
- `/workflow-research <query or URL>`: collects and attaches source evidence.
- `/workflow-status`: restores and displays current state.
- `/workflow-approve approve|revise|cancel`: records human approval.
- `/workflow-verify`: runs plan-defined or detected verification commands.
- `/workflow-report`: writes Markdown and JSON evidence reports.

## Hooks

AgentForge uses Pi hooks for workflow automation:

- `session_start`: restore the latest workflow status.
- `message_end`: parse the assistant's planning artifact and transition to approval.
- `tool_call`: evaluate risky tool calls through the policy engine.

## Research Connector

The research connector is provider-based. The default provider extracts manual URLs from the query, while the interface can later be backed by search APIs. Page reading and fetch are injectable, so tests do not require network access.

Returned sources use a stable shape:

```json
{
  "id": "src-...",
  "title": "Source title",
  "url": "https://example.com",
  "snippet": "Short extracted text",
  "summary": "Report-ready summary",
  "usedFor": "Research for: goal",
  "fetchedAt": "2026-07-09T00:00:00.000Z"
}
```

## Report Output

Reports are written under `.agentforge/reports`:

- Markdown for humans and portfolio demos.
- JSON metadata for automation and evaluation.

This is the main portfolio differentiator: the agent does not just modify code; it leaves a reviewable execution record.
