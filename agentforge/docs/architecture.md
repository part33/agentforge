# AgentForge 架构说明

AgentForge 不是直接魔改 Pi 核心，而是作为 Pi 外层的增强发行包存在。这样项目边界会更清楚：Pi 负责 Agent 运行时、工具执行和 TUI；AgentForge 负责软件工程场景里的工作流产品层。

## 运行边界

```text
agentforge CLI
  -> Pi 可执行入口
    -> AgentForge workflow 扩展
      -> 工作流状态、策略、验证、报告
```

命令行入口会依次尝试从这些地方找到 Pi：

- `AGENTFORGE_PI_BIN` 环境变量。
- 本地克隆的 Pi 脚本。
- 全局安装的 `pi` 命令。

找到之后，它会把 AgentForge 的 workflow 扩展传给 Pi，让 Pi 启动时自动加载这套能力。

## 工作流状态

`WorkflowStore` 会把每次 workflow 写到 `.agentforge/workflows/*.json`。

一次 workflow 会记录：

- 当前生命周期阶段和状态。
- 结构化计划 artifact。
- 从计划步骤转换出来的任务列表。
- 调研来源。
- 用户审批结果。
- 验证命令执行结果。
- 工具调用策略事件。
- 最终报告路径。
- 时间线事件。

这个状态机是故意写得比较显式的。原因是：Agent 工作流不能只存在于聊天窗口里，它应该能被检查、恢复、测试和复盘。

## 扩展命令

AgentForge 在 Pi 里注册了这些命令：

- `/workflow <目标>`：创建一次工作流，并要求模型先输出结构化计划。
- `/workflow-research <搜索问题或 URL>`：收集调研来源并挂到当前工作流。
- `/workflow-status`：查看当前工作流状态。
- `/workflow-approve approve|revise|cancel`：记录人工审批结果。
- `/workflow-verify`：运行计划里声明的验证命令，或者自动识别项目中的验证命令。
- `/workflow-report`：输出 Markdown 和 JSON 报告。

## Hooks

AgentForge 使用了 Pi 的 hooks 来实现自动化：

- `session_start`：恢复最近一次工作流状态。
- `message_end`：在计划阶段解析 assistant 输出的结构化计划，并切到等待审批。
- `tool_call`：在工具调用前经过策略引擎判断，决定允许、确认或阻止。

## Research Connector

调研模块采用 provider 设计。默认 provider 会从用户输入里提取 URL；以后可以接入搜索 API、GitHub Search、文档搜索等来源。

网页读取和 fetch 都是可注入的，所以测试不依赖真实网络。

调研来源的数据结构大致是：

```json
{
  "id": "src-...",
  "title": "来源标题",
  "url": "https://example.com",
  "snippet": "短摘录",
  "summary": "适合进入报告的摘要",
  "usedFor": "Research for: goal",
  "fetchedAt": "2026-07-09T00:00:00.000Z"
}
```

## 报告输出

报告会写入 `.agentforge/reports`：

- Markdown：给人看，适合复盘和演示。
- JSON：给程序看，适合后续做自动评估或可视化。

这是 AgentForge 最适合写进简历的差异点：它不只是让 Agent 改代码，而是让 Agent 留下一份可审计、可复盘、可展示的工程记录。
