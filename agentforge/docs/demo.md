# AgentForge 演示脚本

这份演示使用 `examples/demo-task-board` 作为目标项目。它足够小，适合在几分钟内跑完整流程；同时又有真实代码、测试和构建命令，不是纯玩具。

## 演示目标

```text
Add priority filtering to the task board app.
```

当前 demo app 已经支持：

- 按任务状态过滤。
- 按负责人过滤。
- 按标签过滤。

它还不支持 priority，所以这个任务可以自然地展示 AgentForge 的完整流程：先计划，再审批，再改代码，再验证，最后生成报告。

## 准备环境

进入 demo 项目：

```powershell
cd examples/demo-task-board
npm.cmd test
npm.cmd run build
```

确认基线测试能通过后，再启动 AgentForge：

```powershell
node ..\..\bin\agentforge.mjs
```

如果你只是想先看最终报告长什么样，可以在 `agentforge` 目录运行：

```powershell
npm.cmd run demo:report
```

这会直接生成一份样例 HTML 报告，适合快速检查报告结构和页面效果。

## 跑完整流程

进入 Pi 后输入：

```text
/workflow Add priority filtering to the task board app
```

预期流程：

1. AgentForge 创建 workflow run。
2. 模型先输出结构化 JSON 计划。
3. AgentForge 解析计划，并进入等待审批状态。
4. 你用 `/workflow-approve approve` 批准执行。
5. Agent 修改任务模型、过滤逻辑和测试。
6. 你运行 `/workflow-verify`。
7. 你运行 `/workflow-report` 生成报告。

## 预期改动文件

这个 demo 任务通常会修改：

- `src/tasks.js`
- `src/task-board.js`
- `test/task-board.test.mjs`
- 可能还有 `README.md`

## 验证命令

```powershell
npm.cmd test
npm.cmd run build
```

## 说明口径

可以这样描述这条 demo 流程：

```text
AgentForge 在 Pi 的扩展系统上增加软件工程 workflow 层，把一次需求开发拆成计划、审批、执行、验证和报告几个阶段。这个 demo 使用任务看板功能需求，展示 Agent 如何先生成结构化计划，经过人工确认后再修改代码，最后自动跑测试并生成可复盘报告。
```
