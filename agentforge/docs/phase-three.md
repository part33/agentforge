# 第三期：AgentForge Platform

第三期把 AgentForge 从 workflow/eval 推到更像 Agent 平台的方向，补齐四个能力：

- Subagent：把任务派给 scout / planner / worker / reviewer。
- MCP Adapter：记录 MCP server 工具到 Pi 工具命名空间的桥接关系。
- Memory：沉淀项目知识、用户偏好和常用规则。
- Observability：记录工具调用、阶段事件、验证摘要和成本占位指标。

## Subagent

命令：

```text
/workflow-subagents
```

当前版本是 deterministic assignment，不是真的启动多个独立进程。它会按照任务阶段分配角色：

- scout：负责探索和调研。
- planner：负责计划和审批前准备。
- worker：负责执行。
- reviewer：负责验证、复盘和报告。

## MCP Adapter

命令：

```text
/workflow-mcp repo.search
```

当前版本做的是桥接 manifest，把 MCP server/tool 映射成 Pi 风格工具名：

```text
mcp.repo.search -> repo/search
```

这为后续真正调用 MCP server 留出了接口边界。

## Memory

命令：

```text
/workflow-memory knowledge <text>
/workflow-memory preference <text>
/workflow-memory rule <text>
```

Memory 会写入：

```text
.agentforge/memory.json
```

它分三类：

- projectKnowledge：项目级知识。
- userPreferences：用户偏好。
- rules：常用规则。

## Observability

命令：

```text
/workflow-observe
```

当前会统计：

- workflow event 数量。
- 阶段流转次数。
- tool call 数量。
- 被策略阻止的 tool call 数量。
- 验证命令数量。
- 失败验证数量。
- token/cost 占位字段。

## 当前边界

第三期已经有可运行 MVP，但不是最终版：

- Subagent 目前是角色派发协议，不是并发多 Agent runtime。
- MCP Adapter 目前是 manifest bridge，不是真正的 MCP client 执行器。
- Memory 目前是本地 JSON，不是向量库。
- Observability 已记录工具和阶段摘要，但 token/cost 还需要接模型 provider 的真实 usage。

这个边界是刻意的：先把平台能力的接口和数据结构做出来，再逐步替换成更强实现。
