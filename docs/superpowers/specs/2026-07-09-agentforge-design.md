# AgentForge Design

## Background

AgentForge is an enhanced distribution built on top of the open source Pi agent project. The goal is not to rewrite Pi or copy its example extensions, but to add a software-engineering workflow layer that makes complex coding tasks more controlled, observable, and reproducible.

Pi provides the underlying agent harness: model access, tool calling, sessions, terminal UI, extensions, skills, and prompts. AgentForge adds opinionated workflow orchestration for feature development tasks.

## Goal

AgentForge helps a developer complete a software engineering task through a structured loop:

```text
Explore -> Plan -> Approve -> Execute -> Verify -> Review -> Report
```

The primary demo is a feature-development and review workflow on a prepared demo repository with tests. The user gives a feature request, AgentForge explores the project, proposes a structured plan, asks for approval in the TUI, executes changes through Pi tools, runs verification commands, reviews the result, and writes a report.

## Non-Goals

- Reimplement Pi's model provider layer, TUI renderer, session system, or built-in coding tools.
- Claim to be a better replacement for Pi core.
- Build a general research/reporting product in the first release.
- Build a full MCP bridge or subagent framework in the first release.
- Depend on prompt-only behavior for workflow control.

## Recommended Architecture

AgentForge should be an enhanced distribution package with its own command entry:

```bash
agentforge
```

The command launches Pi with AgentForge's default extensions, skills, prompts, settings, and report paths preloaded. This gives the project an independent product shape while still reusing Pi as the underlying runtime.

Recommended structure:

```text
agentforge/
  bin/
    agentforge
  extensions/
    workflow/
    approval-ui/
    policy/
    research/
    observability/
  skills/
    software-workflow/
    code-review/
  prompts/
    workflow.md
    review.md
  templates/
    report.md
  examples/
    demo-task-board/
  docs/
    architecture.md
    demo.md
```

## Core Modules

### Workflow Orchestrator

The orchestrator is the core AgentForge extension. It owns the workflow state machine and coordinates phase transitions.

States:

```text
idle
exploring
planning
waiting_approval
executing
verifying
reviewing
reporting
done
failed
cancelled
```

Responsibilities:

- Start a workflow from `/workflow <goal>` or the `agentforge "<goal>"` CLI path.
- Create and update a `WorkflowRun`.
- Inject phase-specific prompts.
- Parse structured phase outputs.
- Gate execution until approval.
- Trigger report generation at the end.

### Structured Output Protocol

AgentForge should use a medium-control design. The extension controls workflow phases and validates structured outputs, while the model performs reasoning inside each phase.

Example plan shape:

```ts
type PlanResult = {
  goal: string;
  summary: string;
  steps: Array<{
    id: string;
    title: string;
    rationale: string;
    expectedFiles?: string[];
    status: "pending" | "running" | "done" | "blocked";
  }>;
  risks: string[];
  verificationCommands: Array<{
    command: string;
    reason: string;
    required: boolean;
  }>;
  researchSources?: string[];
};
```

The model must produce structured phase artifacts for plan, verify, review, and report phases. The extension decides whether a phase output is valid enough to proceed.

### Approval UI

After the Plan phase, AgentForge shows a TUI approval screen.

First release actions:

- Approve and execute
- Request revision
- Cancel workflow

The approval UI displays:

- Goal
- Plan summary
- Step list
- Risks
- Verification commands
- External sources used

Step-level enable/disable controls are deferred to a later release.

### Verification Runner

Verification combines automatic project inspection with plan-time confirmation.

Explore phase detects likely commands from:

- `package.json`
- README instructions
- common project conventions

Examples:

```text
npm test
npm run test
npm run lint
npm run typecheck
npm run build
```

Plan phase confirms or adjusts the commands. Verify phase executes the approved commands and stores structured results:

```ts
type VerificationResult = {
  command: string;
  status: "passed" | "failed" | "skipped";
  exitCode: number | null;
  summary: string;
  durationMs: number;
};
```

### Policy Engine

The policy layer controls risky tool calls. It uses Pi's tool-call hooks to apply rules before dangerous operations run.

Policy decisions:

```text
allow
confirm
block
```

Initial rule categories:

- Dangerous bash commands
- Sensitive path writes
- Git write operations
- Package installation
- Network-related commands if not expected by the workflow

Example protected paths:

```text
.env
.git/
node_modules/
package-lock.json
```

The policy engine records `PolicyEvent` entries for the final report.

### Research Connector

Research Connector gives AgentForge external knowledge access for software engineering tasks.

It supports dual mode:

- Primary: configured search API provider
- Fallback: manual URL mode with page reader

Provider interface:

```ts
interface SearchProvider {
  name: string;
  search(query: string, options: SearchOptions): Promise<SearchResult[]>;
}

interface PageReader {
  read(url: string): Promise<PageContent>;
}
```

First release scope:

- One API-backed provider, such as Tavily, Exa, or Brave Search
- Manual URL fallback
- Jina Reader or HTML reader for page extraction
- Source deduplication
- Source summaries
- Source references in workflow report

Research is not the main product. It supports the software engineering workflow by helping with framework docs, error messages, dependency behavior, and external examples.

### Workflow Store

AgentForge uses double-write state persistence.

Pi session stores key workflow state for session continuity. `.agentforge/` stores complete workflow records and reports for replay, audit, and traceability.

Filesystem layout:

```text
.agentforge/
  workflows/
    <workflow-id>.json
  reports/
    <timestamp>-<slug>.md
    <timestamp>-<slug>.json
  sources/
    <workflow-id>.json
```

Store interface:

```ts
interface WorkflowStore {
  createRun(goal: string): Promise<WorkflowRun>;
  updateRun(run: WorkflowRun): Promise<void>;
  appendEvent(runId: string, event: WorkflowEvent): Promise<void>;
  loadRun(id: string): Promise<WorkflowRun>;
}
```

The implementation should keep filesystem writes centralized instead of scattering direct writes across extensions.

### Observability

First release observability is intentionally lightweight:

- Status/footer line during execution
- Final Markdown report
- JSON metadata report

Status examples:

```text
AgentForge | planning | tasks 0/5 | sources 3 | verify pending
AgentForge | executing | tasks 2/5 | sources 3 | verify pending
AgentForge | verifying | tasks 5/5 | sources 3 | npm test running
AgentForge | done | tasks 5/5 | sources 3 | verify passed
```

A full workflow panel is deferred to a later release.

### Report Generator

The final report is a core workflow artifact.

Markdown report sections:

- Goal
- Workflow timeline
- Plan
- Files changed
- Research sources
- Verification results
- Review findings
- Policy events
- Tool activity summary
- Cost/token summary if available
- Follow-up recommendations

JSON metadata includes:

```ts
type WorkflowRun = {
  id: string;
  goal: string;
  status: "done" | "failed" | "cancelled";
  currentPhase: string;
  createdAt: string;
  updatedAt: string;
  phases: WorkflowPhaseRecord[];
  tasks: WorkflowTask[];
  sources: ResearchSource[];
  verificationResults: VerificationResult[];
  policyEvents: PolicyEvent[];
  reportPaths: {
    markdown?: string;
    json?: string;
  };
};
```

## User Flow

Interactive flow:

```text
agentforge
/workflow Add priority filtering to this task board app
```

One-shot flow:

```bash
agentforge "Add priority filtering to this task board app"
```

Expected runtime flow:

1. AgentForge creates a workflow run.
2. Explore scans project structure and detects verification commands.
3. Research Connector gathers external sources if useful.
4. Plan outputs structured steps, risks, and verification commands.
5. Approval UI asks the user to approve, revise, or cancel.
6. Execute performs code changes through Pi tools.
7. Verify runs approved commands and records results.
8. Review checks for risks and gaps.
9. Report writes Markdown and JSON artifacts.

## Demo Project

The demo should use a prepared repository:

```text
examples/demo-task-board/
```

Recommended demo requirement:

```text
Add priority filtering to the task board app.

Requirements:
- Support low, medium, and high priority tasks.
- Add a priority filter control to the UI.
- Filter the task list by selected priority.
- Add or update tests.
- Run verification commands.
- Generate an AgentForge workflow report.
```

The demo project should be small enough to run reliably but realistic enough to show code changes, tests, and report output.

## Implementation Roadmap

### Week 1: Distribution and Workflow Skeleton

- Create `agentforge` package structure.
- Add CLI entry that launches Pi with AgentForge resources.
- Implement `/workflow` command.
- Create initial workflow state machine.
- Add `WorkflowStore` filesystem persistence.
- Add initial docs and architecture diagram.

### Week 2: Core Workflow

- Implement Explore, Plan, Approval, Execute, Verify, Review, Report phases.
- Add structured output parsing and validation.
- Build TUI approval selector.
- Add task state tracking.
- Generate Markdown and JSON reports.

### Week 3: Engineering Enhancements

- Implement Policy Engine.
- Implement Research Connector with API provider and fallback URL mode.
- Add status/footer observability.
- Improve verification command detection.
- Add report source and policy sections.

### Week 4: Documentation and Demo Polish

- Build demo task board repository.
- Add repeatable demo script.
- Write README, architecture docs, and usage docs.
- Add screenshots or terminal recording plan.
- Add basic tests for state transitions, report generation, and policy decisions.
- Write public documentation and project positioning notes.

## Testing Strategy

Unit-level tests:

- Workflow state transitions
- Structured output validation
- Report generation
- Policy decision rules
- Research source deduplication

Integration tests:

- `/workflow` creates a run and persists state
- Approval accepted moves to execution
- Verification command result is stored
- Report files are generated

Demo validation:

- Run full feature-development workflow on `demo-task-board`
- Confirm report includes plan, changed files, verification results, sources, and policy events

## Risks and Mitigations

Risk: Scope grows too large.
Mitigation: Keep subagents, MCP adapter, and full workflow dashboard out of v1.

Risk: Research Connector becomes a separate research product.
Mitigation: Keep research tied to software engineering workflow evidence and sources.

Risk: Workflow depends too much on prompt compliance.
Mitigation: Use structured phase outputs and extension-side validation.

Risk: TUI approval UI delays the core.
Mitigation: Limit first release to approve, revise, and cancel actions.

Risk: Double-write state gets inconsistent.
Mitigation: Centralize writes through `WorkflowStore` and mirror only key state into Pi session.

## Project Positioning

Recommended project description:

```text
AgentForge: Software engineering agent workflow distribution built on Pi.
Designed and implemented an agent workflow layer over Pi Extension System, supporting Explore-Plan-Approve-Execute-Verify-Review-Report phases, structured phase protocols, human-in-the-loop approval, research source tracking, policy-controlled tool execution, verification running, and report archival.
```

Key implementation points:

- Built an enhanced Agent distribution on top of Pi Extension System with a multi-phase software engineering workflow state machine.
- Designed structured phase protocols for planning, verification, review, and reporting to reduce prompt-only control failure.
- Implemented human-in-the-loop approval UI before code execution and policy-based tool-call controls for risky commands and sensitive paths.
- Added Research Connector with pluggable search provider, fallback URL reading, source deduplication, and citation tracking in final reports.
- Implemented workflow persistence and report generation using Pi session mirroring plus `.agentforge` JSON and Markdown artifacts.

## Open Decisions

- Which search API provider to implement first: Tavily, Exa, Brave Search, or another provider.
- Exact CLI launching method for Pi integration.
- Whether v1 should include minimal subagent support after the main workflow is stable.
- Exact test framework for AgentForge's own package.

These decisions do not block the high-level design.
