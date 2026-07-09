import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

function slugify(text) {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return slug || "workflow";
}

function tableRow(cells) {
  return `| ${cells.map((cell) => String(cell ?? "").replace(/\n/g, "<br>")).join(" | ")} |`;
}

function renderList(items, emptyText = "None recorded.") {
  if (!Array.isArray(items) || items.length === 0) {
    return emptyText;
  }
  return items.map((item) => `- ${item}`).join("\n");
}

function renderPlan(run) {
  const plan = run.planArtifact;
  if (!plan) {
    return "No structured plan artifact recorded.";
  }

  const lines = [`Summary: ${plan.summary}`, "", "Steps:"];
  for (const step of plan.steps ?? []) {
    lines.push(`- [${step.status ?? "pending"}] ${step.id}: ${step.title}`);
    if (step.rationale) lines.push(`  - Rationale: ${step.rationale}`);
    if (step.expectedFiles?.length) lines.push(`  - Expected files: ${step.expectedFiles.join(", ")}`);
  }
  lines.push("", "Risks:", renderList(plan.risks));
  lines.push("", "Verification commands:");
  if (plan.verificationCommands?.length) {
    for (const command of plan.verificationCommands) {
      lines.push(`- \`${command.command}\` (${command.required === false ? "optional" : "required"}): ${command.reason}`);
    }
  } else {
    lines.push("None recorded.");
  }
  return lines.join("\n");
}

function renderVerification(run) {
  const results = run.verificationResults ?? [];
  if (!results.length) {
    return "No verification results recorded.";
  }

  const lines = [
    tableRow(["Command", "Status", "Exit Code", "Duration", "Summary"]),
    tableRow(["---", "---", "---", "---", "---"]),
  ];
  for (const result of results) {
    lines.push(
      tableRow([
        `\`${result.command}\``,
        result.status,
        result.exitCode ?? "n/a",
        `${result.durationMs}ms`,
        result.summary,
      ]),
    );
  }
  return lines.join("\n");
}

function renderEvents(run) {
  const events = run.events ?? [];
  if (!events.length) {
    return "No events recorded.";
  }

  return events
    .map((event) => `- ${event.timestamp} - ${event.type}: ${event.message ?? ""}`.trim())
    .join("\n");
}

function renderSources(run) {
  const sources = run.sources ?? [];
  if (!sources.length) {
    return "No external sources recorded.";
  }

  return sources.map((source) => `- [${source.title ?? source.url}](${source.url}) - ${source.summary ?? ""}`).join("\n");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function statusClass(status) {
  if (["passed", "done", "approved", "active"].includes(status)) return "good";
  if (["failed", "blocked", "cancelled"].includes(status)) return "bad";
  return "neutral";
}

function renderHtmlList(items, renderItem, emptyText = "暂无记录") {
  if (!Array.isArray(items) || items.length === 0) {
    return `<p class="empty">${escapeHtml(emptyText)}</p>`;
  }
  return `<ul>${items.map((item) => `<li>${renderItem(item)}</li>`).join("")}</ul>`;
}

function renderHtmlVerification(results) {
  if (!Array.isArray(results) || results.length === 0) {
    return `<p class="empty">暂无验证结果</p>`;
  }
  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>命令</th><th>状态</th><th>退出码</th><th>耗时</th><th>摘要</th></tr>
        </thead>
        <tbody>
          ${results
            .map(
              (result) => `
                <tr>
                  <td><code>${escapeHtml(result.command)}</code></td>
                  <td><span class="pill ${statusClass(result.status)}">${escapeHtml(result.status)}</span></td>
                  <td>${escapeHtml(result.exitCode ?? "n/a")}</td>
                  <td>${escapeHtml(result.durationMs)}ms</td>
                  <td>${escapeHtml(result.summary)}</td>
                </tr>
              `,
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderHtmlTimeline(events) {
  if (!Array.isArray(events) || events.length === 0) {
    return `<p class="empty">暂无时间线事件</p>`;
  }
  return `
    <ol class="timeline">
      ${events
        .map(
          (event) => `
            <li>
              <time>${escapeHtml(event.timestamp)}</time>
              <strong>${escapeHtml(event.type)}</strong>
              <span>${escapeHtml(event.message ?? "")}</span>
            </li>
          `,
        )
        .join("")}
    </ol>
  `;
}

export function renderHtmlReport(run) {
  const tasks = run.tasks ?? [];
  const sources = run.sources ?? [];
  const verificationResults = run.verificationResults ?? [];
  const policyEvents = run.policyEvents ?? [];
  const events = run.events ?? [];
  const plan = run.planArtifact;
  const passedCount = verificationResults.filter((result) => result.status === "passed").length;
  const failedCount = verificationResults.filter((result) => result.status === "failed").length;

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>AgentForge Report - ${escapeHtml(run.goal)}</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f6f7f9;
      --panel: #ffffff;
      --text: #172033;
      --muted: #657086;
      --line: #dce1ea;
      --accent: #1d6fd8;
      --good: #177245;
      --bad: #ba2d2d;
      --neutral: #6a5d18;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font-family: Inter, "Segoe UI", Arial, sans-serif;
      line-height: 1.55;
    }
    header {
      background: #111827;
      color: white;
      padding: 40px max(24px, calc((100vw - 1120px) / 2)) 32px;
    }
    header p { color: #cbd5e1; margin: 8px 0 0; max-width: 820px; }
    main { max-width: 1120px; margin: 0 auto; padding: 24px; }
    section {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      margin: 16px 0;
      padding: 22px;
    }
    h1 { font-size: 34px; line-height: 1.18; margin: 0; letter-spacing: 0; }
    h2 { font-size: 20px; margin: 0 0 14px; letter-spacing: 0; }
    h3 { font-size: 16px; margin: 16px 0 8px; letter-spacing: 0; }
    code {
      background: #eef2f7;
      border-radius: 4px;
      padding: 2px 5px;
      font-family: "Cascadia Mono", Consolas, monospace;
      font-size: 0.92em;
    }
    ul { padding-left: 22px; margin: 0; }
    li + li { margin-top: 8px; }
    a { color: var(--accent); }
    .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
    .metric { background: #f8fafc; border: 1px solid var(--line); border-radius: 8px; padding: 14px; }
    .metric span { display: block; color: var(--muted); font-size: 13px; }
    .metric strong { display: block; font-size: 24px; margin-top: 4px; }
    .pill {
      display: inline-flex;
      align-items: center;
      min-height: 24px;
      border-radius: 999px;
      padding: 2px 10px;
      font-size: 13px;
      font-weight: 650;
      background: #eef2f7;
      color: var(--muted);
    }
    .pill.good { background: #e7f6ee; color: var(--good); }
    .pill.bad { background: #fdecec; color: var(--bad); }
    .pill.neutral { background: #fbf3d0; color: var(--neutral); }
    .phase-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(112px, 1fr));
      gap: 8px;
    }
    .phase {
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 10px;
      background: #fbfcfe;
    }
    .phase strong { display: block; font-size: 13px; }
    .phase span { color: var(--muted); font-size: 12px; }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; min-width: 720px; }
    th, td { border-bottom: 1px solid var(--line); padding: 10px; text-align: left; vertical-align: top; }
    th { color: var(--muted); font-size: 13px; }
    .timeline { list-style: none; padding: 0; margin: 0; border-left: 2px solid var(--line); }
    .timeline li { position: relative; padding: 0 0 16px 18px; }
    .timeline li::before {
      content: "";
      position: absolute;
      left: -6px;
      top: 7px;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--accent);
    }
    .timeline time { display: block; color: var(--muted); font-size: 12px; }
    .timeline strong { display: block; margin-top: 2px; }
    .timeline span { color: var(--muted); }
    .empty { color: var(--muted); margin: 0; }
    @media (max-width: 760px) {
      header { padding: 28px 18px 24px; }
      main { padding: 14px; }
      section { padding: 16px; }
      .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      h1 { font-size: 27px; }
    }
  </style>
</head>
<body>
  <header>
    <h1>AgentForge Workflow Report</h1>
    <p>${escapeHtml(run.goal)}</p>
  </header>
  <main>
    <section>
      <h2>运行摘要</h2>
      <div class="grid">
        <div class="metric"><span>当前阶段</span><strong>${escapeHtml(run.currentPhase)}</strong></div>
        <div class="metric"><span>任务数</span><strong>${tasks.length}</strong></div>
        <div class="metric"><span>来源数</span><strong>${sources.length}</strong></div>
        <div class="metric"><span>验证</span><strong>${passedCount}/${verificationResults.length}</strong></div>
      </div>
      <h3>基础信息</h3>
      <ul>
        <li>Workflow ID：<code>${escapeHtml(run.id)}</code></li>
        <li>状态：<span class="pill ${statusClass(run.status)}">${escapeHtml(run.status)}</span></li>
        <li>创建时间：${escapeHtml(run.createdAt)}</li>
        <li>更新时间：${escapeHtml(run.updatedAt)}</li>
        <li>失败验证数：${failedCount}</li>
      </ul>
    </section>

    <section>
      <h2>阶段流转</h2>
      <div class="phase-row">
        ${(run.phases ?? [])
          .map(
            (phase) => `
              <div class="phase">
                <strong>${escapeHtml(phase.phase)}</strong>
                <span>${escapeHtml(phase.status)}${phase.summary ? ` · ${escapeHtml(phase.summary)}` : ""}</span>
              </div>
            `,
          )
          .join("")}
      </div>
    </section>

    <section>
      <h2>计划</h2>
      ${
        plan
          ? `
            <p>${escapeHtml(plan.summary)}</p>
            ${renderHtmlList(plan.steps, (step) => `<strong>${escapeHtml(step.id)}：</strong>${escapeHtml(step.title)}<br><span class="empty">${escapeHtml(step.rationale)}</span>`)}
          `
          : `<p class="empty">暂无结构化计划</p>`
      }
    </section>

    <section>
      <h2>任务</h2>
      ${renderHtmlList(tasks, (task) => `<span class="pill ${statusClass(task.status)}">${escapeHtml(task.status)}</span> <strong>${escapeHtml(task.id)}</strong>：${escapeHtml(task.title)}`)}
    </section>

    <section>
      <h2>验证结果</h2>
      ${renderHtmlVerification(verificationResults)}
    </section>

    <section>
      <h2>调研来源</h2>
      ${renderHtmlList(sources, (source) => `<a href="${escapeHtml(source.url)}">${escapeHtml(source.title ?? source.url)}</a><br><span class="empty">${escapeHtml(source.summary ?? "")}</span>`, "暂无调研来源")}
    </section>

    <section>
      <h2>策略事件</h2>
      ${renderHtmlList(policyEvents, (event) => `<span class="pill ${statusClass(event.decision)}">${escapeHtml(event.decision)}</span> ${escapeHtml(event.reason ?? event.command ?? "")}`, "暂无策略事件")}
    </section>

    <section>
      <h2>时间线</h2>
      ${renderHtmlTimeline(events)}
    </section>
  </main>
</body>
</html>`;
}

export function renderMarkdownReport(run) {
  return [
    `# AgentForge Workflow Report`,
    "",
    `## Goal`,
    "",
    run.goal,
    "",
    `## Status`,
    "",
    `- Workflow ID: \`${run.id}\``,
    `- Status: ${run.status}`,
    `- Current phase: ${run.currentPhase}`,
    `- Created: ${run.createdAt}`,
    `- Updated: ${run.updatedAt}`,
    "",
    `## Approval`,
    "",
    run.approval
      ? `- Decision: ${run.approval.decision}\n- Decided at: ${run.approval.decidedAt}\n- Note: ${run.approval.note ?? ""}`
      : "No approval decision recorded.",
    "",
    `## Plan`,
    "",
    renderPlan(run),
    "",
    `## Tasks`,
    "",
    renderList((run.tasks ?? []).map((task) => `[${task.status}] ${task.id}: ${task.title}`)),
    "",
    `## Verification`,
    "",
    renderVerification(run),
    "",
    `## External Sources`,
    "",
    renderSources(run),
    "",
    `## Policy Events`,
    "",
    renderList((run.policyEvents ?? []).map((event) => `${event.decision}: ${event.reason ?? event.command ?? ""}`)),
    "",
    `## Timeline`,
    "",
    renderEvents(run),
    "",
  ].join("\n");
}

export function createReportMetadata(run, paths = {}) {
  return {
    schemaVersion: 1,
    workflowId: run.id,
    goal: run.goal,
    status: run.status,
    currentPhase: run.currentPhase,
    createdAt: run.createdAt,
    updatedAt: run.updatedAt,
    approval: run.approval,
    planArtifact: run.planArtifact,
    tasks: run.tasks ?? [],
    sources: run.sources ?? [],
    verificationResults: run.verificationResults ?? [],
    policyEvents: run.policyEvents ?? [],
    eventCount: run.events?.length ?? 0,
    reportPaths: paths,
  };
}

export async function writeWorkflowReport(run, cwd) {
  const reportsDir = join(cwd, ".agentforge", "reports");
  await mkdir(reportsDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+$/, "Z");
  const baseName = `${timestamp}-${slugify(run.goal)}`;
  const markdownPath = join(reportsDir, `${baseName}.md`);
  const jsonPath = join(reportsDir, `${baseName}.json`);
  const htmlPath = join(reportsDir, `${baseName}.html`);
  const paths = { markdown: markdownPath, json: jsonPath, html: htmlPath };

  await writeFile(markdownPath, renderMarkdownReport(run), "utf8");
  await writeFile(jsonPath, `${JSON.stringify(createReportMetadata(run, paths), null, 2)}\n`, "utf8");
  await writeFile(htmlPath, renderHtmlReport(run), "utf8");

  return paths;
}
