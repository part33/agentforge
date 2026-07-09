# AgentForge Implementation Plan

## Objective

Build AgentForge as a reproducible enhanced distribution on top of Pi. The first release should demonstrate a complete software engineering agent workflow:

```text
Explore -> Plan -> Approve -> Execute -> Verify -> Review -> Report
```

The implementation should prioritize a reliable demo, clear architecture, and explainable engineering decisions over breadth.

## Milestone 1: Project Scaffold and Distribution Entry

Goal: Create the AgentForge package skeleton and make `agentforge` launch a Pi-based session with AgentForge resources loaded.

Tasks:

1. Create `agentforge/` package structure.
2. Add `package.json` with bin entry for `agentforge`.
3. Add initial CLI launcher.
4. Wire the launcher to load AgentForge extensions, skills, prompts, and default settings.
5. Add smoke command such as `agentforge --version`.
6. Document local development commands.

Deliverables:

- `agentforge` command runs locally.
- AgentForge resources can be loaded without manual Pi configuration.
- README includes quick start.

Acceptance:

- Running `agentforge` opens a Pi session with AgentForge startup context.
- Running `agentforge --version` prints the package version.

## Milestone 2: Workflow Orchestrator Skeleton

Goal: Implement the workflow extension and state machine without full phase intelligence.

Tasks:

1. Add `extensions/workflow/`.
2. Register `/workflow <goal>` command.
3. Define workflow phases and state transitions.
4. Define `WorkflowRun`, `WorkflowTask`, `WorkflowEvent`, and status types.
5. Implement `WorkflowStore` with `.agentforge/workflows/<id>.json`.
6. Mirror key workflow state into Pi session entries.
7. Add simple status/footer text for current phase.

Deliverables:

- `/workflow` creates a workflow run.
- Workflow state is persisted to `.agentforge`.
- Session mirror entries are written for key transitions.

Acceptance:

- Starting a workflow creates a JSON file.
- Phase transitions can be exercised with deterministic stub handlers.
- Restarting/resuming can read the latest workflow file.

## Milestone 3: Structured Output Protocol

Goal: Make phase outputs parseable and enforce medium-control workflow behavior.

Tasks:

1. Define schemas for Explore, Plan, Verify, Review, and Report artifacts.
2. Add parser/validator utilities.
3. Add failure handling for invalid structured output.
4. Add retry/revision prompt for invalid phase output.
5. Add unit tests for schema validation.

Deliverables:

- Structured artifacts can be parsed and attached to workflow state.
- Invalid output blocks phase progression with a clear error.

Acceptance:

- A valid plan artifact advances to approval.
- Invalid plan output keeps the workflow in planning state and records an error event.

## Milestone 4: Approval UI

Goal: Add human-in-the-loop approval before execution.

Tasks:

1. Build TUI approval selector.
2. Display goal, plan summary, steps, risks, verification commands, and sources.
3. Support actions: approve and execute, request revision, cancel workflow.
4. Persist approval decision.
5. Add fallback text approval for non-TUI or one-shot mode.

Deliverables:

- Plan approval is interactive in TUI mode.
- Workflow cannot execute before approval.

Acceptance:

- Approve moves workflow to execute.
- Request revision returns to planning.
- Cancel marks workflow as cancelled and writes a report/event.

## Milestone 5: Verification Runner

Goal: Detect and execute verification commands.

Tasks:

1. Detect commands from `package.json`.
2. Add common fallback suggestions: test, lint, typecheck, build.
3. Include detected commands in Explore artifact.
4. Require Plan artifact to choose verification commands.
5. Execute approved verification commands.
6. Capture exit code, duration, output summary, and pass/fail status.

Deliverables:

- Verification commands are discovered, approved, run, and stored.

Acceptance:

- On a demo Node project, AgentForge detects at least one verification command.
- Verify phase records command status and output summary.

## Milestone 6: Report Generator

Goal: Produce durable workflow artifacts.

Tasks:

1. Add report template.
2. Generate Markdown report.
3. Generate JSON metadata report.
4. Include goal, timeline, plan, changed files, sources, verification, review, policy events, and tool stats.
5. Store reports in `.agentforge/reports/`.

Deliverables:

- Every completed, failed, or cancelled workflow produces report artifacts.

Acceptance:

- Report file paths are recorded in `WorkflowRun`.
- Markdown report is readable and includes verification results.
- JSON report can be parsed by tests.

## Milestone 7: Policy Engine

Goal: Control risky tool calls and record policy events.

Tasks:

1. Add policy extension or workflow-integrated policy module.
2. Define rule format for allow, confirm, and block decisions.
3. Protect sensitive paths such as `.env`, `.git/`, and `node_modules/`.
4. Confirm dangerous bash commands and Git write operations.
5. Record policy decisions into workflow state.
6. Add tests for rule matching.

Deliverables:

- Risky operations are intercepted.
- Policy events appear in the final report.

Acceptance:

- Dangerous commands can be blocked or confirmed.
- Sensitive path writes trigger policy logic.

## Milestone 8: Research Connector

Goal: Add external source gathering for software engineering tasks.

Tasks:

1. Define `SearchProvider` and `PageReader` interfaces.
2. Implement one API-backed search provider.
3. Implement manual URL fallback.
4. Implement Jina Reader or HTML reader page extraction.
5. Deduplicate sources by canonical URL.
6. Summarize and attach sources to workflow state.
7. Include sources in approval UI and report.

Deliverables:

- AgentForge can gather and cite external sources.
- Research module works with and without an API key.

Acceptance:

- API mode returns search results when configured.
- Manual URL mode reads supplied pages.
- Reports include source titles, URLs, summaries, and usage notes.

## Milestone 9: Demo Repository

Goal: Create a repeatable demo that proves the full workflow.

Tasks:

1. Create `examples/demo-task-board/`.
2. Implement a small task board app with tests.
3. Add baseline feature set.
4. Add README with test/build commands.
5. Define demo request: add priority filtering.
6. Add expected verification commands.

Deliverables:

- Demo app runs locally.
- Demo app has tests.
- AgentForge can perform a feature-development workflow against it.

Acceptance:

- The demo starts from a clean state.
- The workflow can produce code changes, run tests, and generate report artifacts.

## Milestone 10: Documentation Polish

Goal: Make the project understandable from the repository documentation alone.

Tasks:

1. Write main README.
2. Add architecture document.
3. Add demo guide.
4. Add screenshots or terminal recording plan.
5. Add comparison with vanilla Pi.
6. Add project positioning notes.
7. Add known limitations and future work.

Deliverables:

- Project can be understood from README alone.
- Demo can be reproduced.
- Project positioning notes are ready.

Acceptance:

- README explains what AgentForge adds beyond Pi.
- Demo guide includes exact commands.
- Architecture doc explains runtime boundary between Pi and AgentForge.

## Suggested Timeline

Week 1:

- Milestone 1
- Milestone 2
- Start Milestone 3

Week 2:

- Finish Milestone 3
- Milestone 4
- Milestone 5
- Start Milestone 6

Week 3:

- Finish Milestone 6
- Milestone 7
- Milestone 8

Week 4:

- Milestone 9
- Milestone 10
- Bug fixing and demo rehearsal

## First Implementation Slice

The first coding slice should be small and verifiable:

1. Create package skeleton.
2. Add `agentforge --version`.
3. Add workflow extension with `/workflow`.
4. Create `.agentforge/workflows/<id>.json`.
5. Record initial `idle -> exploring -> planning` transitions.

This slice proves the command entry, extension loading, and workflow persistence before adding model-dependent behavior.

## Testing Priorities

Start with tests around deterministic code:

- State transition reducer
- WorkflowStore file writes
- Structured output parser
- Report generator
- Policy rule matcher
- Research source deduplication

Avoid relying on live model calls for core automated tests. Live workflow runs should be treated as demo/integration checks.

## Scope Guardrails

Do not include these in v1 unless the main workflow is stable:

- Full MCP adapter
- Subagent orchestration
- Full dashboard panel
- Step-level approval editing
- Multiple search API providers
- Independent non-Pi runtime

These are good v2 features, but adding them too early will weaken the demo.
