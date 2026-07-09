# 接下来做什么

现在 AgentForge 已经有了基础能力：工作流状态机、计划 artifact、审批、验证、报告、策略控制、调研来源和 demo app。下一步不是继续盲目堆功能，而是把它变成一个更稳定、更容易复现、更适合协作使用的工程工具。

## 第一步：跑通一次真实演示

目标是产生一份完整报告，而不只是让测试通过。

推荐流程：

```powershell
cd examples/demo-task-board
node ..\..\bin\agentforge.mjs
```

进入 Pi 后：

```text
/workflow Add priority filtering to the task board app
/workflow-approve approve
/workflow-verify
/workflow-report
```

跑完后重点看 `.agentforge/reports` 里的 Markdown/HTML 报告。这份报告可以作为审计、复盘和问题追踪材料。

## 第二步：阅读中文项目说明页

已经新增 `docs/project-story.md`。这份文档回答了四个问题：

- 我为什么做这个项目？
- Pi 原项目解决了什么，AgentForge 扩展了什么？
- 我具体实现了哪些模块？
- 这个项目比普通 Coding Agent demo 多了什么工程价值？

这份文档可以作为项目背景说明和设计记录。

## 第三步：补充演示材料

建议至少准备三张图：

- 启动 `/workflow` 后生成结构化计划。
- `/workflow-verify` 跑测试的结果。
- `/workflow-report` 生成的 Markdown 报告。

如果以后要放 GitHub README，这三张图比一大段文字更容易帮助使用者理解流程。

## 第四步：做一个更强的扩展点

如果还想继续增强，优先做这三个方向之一：

1. 给 HTML 报告增加截图和在线预览入口。
2. 给 workflow 状态做一个可视化 timeline。
3. 给 research connector 接入真实搜索 API 或 GitHub 搜索。

HTML 报告已经具备基础版本，第二期加入 AgentForge Eval，第三期加入 Subagent、MCP Adapter、Memory 和 Observability。下一步可以把这些能力整合成一个 benchmark/dashboard 面板。

## 第五步：文档整理

建议把公开文档统一成这类表达：

```text
AgentForge：基于 Pi 扩展系统开发的软件工程 Agent 工作流增强发行包，实现了结构化计划、人工审批、工具调用策略控制、自动化验证、调研来源记录和 Markdown/JSON 执行报告生成，并提供可复现实例项目用于演示完整 Agent 开发流程。
```

文档展开时可以强调：

- AgentForge 基于 Pi 的扩展边界，在上层实现产品化 workflow。
- 我把 Agent 的行为从“聊天过程”沉淀成“可持久化、可验证、可复盘”的工程记录。
- 我用了测试覆盖核心模块，让项目不只是 prompt demo。
