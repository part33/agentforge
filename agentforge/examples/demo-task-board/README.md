# AgentForge Demo Task Board

这是 AgentForge 自带的演示项目，用来展示一个真实但足够小的软件工程 Agent 工作流。

## 当前功能

- 创建带有状态、负责人和标签的任务。
- 把任务分组到 `todo`、`doing`、`done` 三列。
- 支持按状态、负责人、标签过滤任务。
- 使用 Node.js 内置测试框架，不需要额外依赖。

## 推荐演示任务

让 AgentForge 实现：

```text
Add priority filtering to the task board app.
```

预期实现方向：

- 给任务增加 `priority` 字段。
- 校验 `low`、`medium`、`high` 等优先级。
- 支持 `filterTasks(tasks, { priority: "high" })`。
- 更新示例数据和测试。

## 命令

```powershell
npm.cmd test
npm.cmd run build
```
