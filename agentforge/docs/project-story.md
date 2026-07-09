# AgentForge 项目说明

## 一句话介绍

AgentForge 是一个基于 Pi 扩展系统开发的软件工程 Agent 工作流增强发行包。它不重复造底层 Agent runtime，而是在 Pi 之上增加结构化计划、人工审批、工具策略、自动验证、调研来源记录和可视化报告。

## 为什么做这个项目

Pi 本身提供了 Agent 运行、工具调用和终端交互能力。AgentForge 的方向是：识别 Pi 的扩展边界，在它的扩展系统上做一个更贴近真实软件工程流程的上层产品。

普通 Coding Agent 的问题是：它能在对话里完成任务，但过程不够稳定，也不方便事后复盘。AgentForge 想解决的是“Agent 工作过程如何被工程化管理”的问题。

## AgentForge 扩展了 Pi 什么

AgentForge 没有直接修改 Pi 核心，而是通过 Pi extension 加了一层 workflow：

```text
探索 -> 调研 -> 计划 -> 审批 -> 执行 -> 验证 -> 复盘 -> 报告
```

核心扩展点包括：

- `/workflow <目标>`：启动一次软件工程任务流程。
- `/workflow-research <问题或 URL>`：收集调研来源并记录到 workflow。
- `/workflow-approve approve|revise|cancel`：让用户在执行前审批计划。
- `/workflow-verify`：自动执行测试、构建等验证命令。
- `/workflow-report`：生成 Markdown、JSON 和 HTML 报告。

## 我实现了哪些模块

- CLI 启动器：自动加载 AgentForge workflow extension。
- 工作流状态机：把每次任务持久化为 `.agentforge/workflows/*.json`。
- 结构化计划协议：解析和校验模型输出的 JSON plan artifact。
- 审批 gate：计划通过后才进入执行阶段。
- 策略引擎：对危险工具调用进行 allow、confirm、block 分类。
- 验证 runner：自动识别并运行 `test`、`lint`、`typecheck`、`build`。
- Research Connector：收集 URL、读取页面、去重、摘要并写入报告。
- 报告生成器：输出 Markdown、JSON、HTML 三种格式。
- Demo app：提供一个可复现的任务看板项目，用于展示完整流程。

## 工程价值

这个项目的重点不是“让 Agent 回答问题”，而是把 Agent 的行为变成可管理的工程过程：

- 可持久化：每次 workflow 都有状态文件。
- 可审批：关键执行前有人工确认。
- 可验证：测试和构建结果会进入报告。
- 可审计：工具策略事件和调研来源会保留下来。
- 可分享：HTML 报告可以直接打开、归档或发送给协作者。
- 可评估：第二期 AgentForge Eval 会对每次工作流进行质量评分。

## 二期增强

第二期增加了 AgentForge Eval。它会读取 workflow run，并按工作流完成状态、结构化计划、审批记录、验证结果、调研来源、策略审计和报告产物完整度进行评分。

这让项目从“能记录 Agent 做了什么”进一步变成“能判断 Agent 做得怎么样”。

## 三期增强

第三期补齐 Agent 平台能力：

- Subagent：将任务分配给 scout、planner、worker、reviewer。
- MCP Adapter：把 MCP server/tool 映射成 Pi 可识别的工具桥接描述。
- Memory：沉淀项目知识、用户偏好和常用规则。
- Observability：统计工具调用、阶段事件、验证结果和成本占位指标。

这一期的意义是：AgentForge 不再只是单次工作流工具，而是开始具备 Agent 平台的核心横向能力。

## 项目描述

```text
AgentForge：基于 Pi 扩展系统开发的软件工程 Agent 工作流增强发行包，实现结构化计划、人工审批、工具调用策略控制、自动化验证、调研来源记录、Markdown/JSON/HTML 执行报告、可解释评分，并扩展 Subagent 派发、MCP 工具桥接、项目记忆和可观测性摘要。
```

## 设计取舍

可以这样理解 AgentForge 和 Pi 的关系：

```text
AgentForge 没有从零重复实现 Coding Agent runtime，而是把 Pi 作为底层 runtime，在扩展系统上实现软件工程 workflow 层。这个 workflow 会把一次需求开发拆成计划、审批、执行、验证和报告几个阶段，让 Agent 的结果从聊天窗口沉淀成可以复盘的状态文件和报告。
```
