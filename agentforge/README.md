# AgentForge

AgentForge 是一个基于 Pi 扩展系统做出来的软件工程 Agent 工作流增强发行包。Pi 负责底层 Agent 运行、工具调用和终端交互，AgentForge 在它上面增加一层更适合项目开发的工作流：调研、计划、审批、执行、验证、复盘和报告。

```text
探索 -> 调研 -> 计划 -> 审批 -> 执行 -> 验证 -> 复盘 -> 报告
```

## 这个项目解决什么问题

普通 Coding Agent 很容易给人一种“现场很厉害，但事后说不清”的感觉。AgentForge 的目标是让一次 Agent 开发过程变成可以保存、可以复盘、可以展示的工程流程：

- 改代码前先生成结构化计划。
- 执行前加入人工审批关卡。
- 对危险工具调用做策略控制。
- 自动记录测试、构建等验证结果。
- 最后输出 Markdown、JSON 和 HTML 报告，方便审计、复盘和团队协作。

## 快速使用

启动带 AgentForge 扩展的 Pi：

```powershell
node ./bin/agentforge.mjs
```

直接用一句目标启动工作流：

```powershell
node ./bin/agentforge.mjs "Add priority filtering to the task board app"
```

进入 Pi 后可以使用这些命令：

```text
/workflow <目标>
/workflow-research <搜索问题或 URL>
/workflow-status
/workflow-approve approve
/workflow-verify
/workflow-report
/workflow-subagents
/workflow-memory knowledge|preference|rule <text>
/workflow-mcp <server.tool>
/workflow-observe
```

## 演示项目

仓库里带了一个准备好的演示项目：`examples/demo-task-board`。

```powershell
cd examples/demo-task-board
npm.cmd test
npm.cmd run build
```

推荐演示任务：

```text
Add priority filtering to the task board app.
```

完整演示步骤见 `docs/demo.md`。

如果只是想先生成一份可展示的样例报告，可以运行：

```powershell
npm.cmd run demo:report
```

它会在当前目录的 `.agentforge/reports` 下生成 Markdown、JSON 和 HTML 三种报告。

第二期的质量评估可以运行：

```powershell
npm.cmd run demo:evaluate
```

它会生成 demo 报告，并在 `.agentforge/evaluations` 下输出评估结果。

## 项目结构

- `bin/agentforge.mjs`：AgentForge 命令行入口，负责启动 Pi 并加载扩展。
- `extensions/workflow/index.ts`：Pi 扩展，注册 AgentForge 的命令和 hooks。
- `src/workflow-store.js`：工作流状态机和持久化。
- `src/artifacts.js`：结构化计划的解析和校验。
- `src/research-connector.js`：调研来源收集、网页读取、去重和摘要。
- `src/policy-engine.js`：工具调用策略引擎。
- `src/verification-runner.js`：自动识别并运行 test、lint、build 等验证命令。
- `src/report-generator.js`：生成 Markdown、JSON 和 HTML 工作流报告。
- `examples/demo-task-board`：用于验证完整流程的可复现实例项目。

更详细的架构说明见 `docs/architecture.md`。

项目背景和设计取舍见 `docs/project-story.md`。

第二期说明见 `docs/phase-two.md`。

第三期平台化能力见 `docs/phase-three.md`。

## 开发验证

Windows PowerShell 可能会拦截 `npm.ps1`，建议使用 `npm.cmd`：

```powershell
npm.cmd test
npm.cmd run smoke
```

## 能力概览

AgentForge 当前覆盖的核心能力：

- 软件工程任务工作流：探索、调研、计划、审批、执行、验证、复盘、报告。
- 可解释质量评估：对每次 workflow 进行分项评分。
- 平台化扩展：Subagent 派发、MCP bridge、Memory、Observability。
- 可复现 demo：内置任务看板项目和报告生成脚本。
