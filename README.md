# AgentForge

AgentForge 是一个基于开源项目 [Pi](https://github.com/earendil-works/pi) 扩展系统构建的软件工程 Agent 工作流平台，在 Pi 的 Agent Runtime 之上增加任务规划、人工审批、工具调用治理、自动验证、报告生成和质量评估能力。

## 项目解决的问题

Coding Agent 可以帮助开发者修改代码，但在复杂任务中容易出现三个问题：

- 执行过程不可控：Agent 可能直接修改代码或运行高风险命令。
- 过程难复盘：任务完成后很难知道它做了哪些决策、跑了哪些验证。
- 结果难评估：缺少统一标准判断一次 Agent 执行是否可靠。

AgentForge 将一次软件工程任务拆成可追踪的工作流：

```text
Explore -> Research -> Plan -> Approve -> Execute -> Verify -> Review -> Report
```

## 核心能力

- **结构化任务计划**：要求 Agent 在执行前生成 JSON Plan Artifact，并进行解析和校验。
- **人工审批机制**：执行代码修改前需要通过 `/workflow-approve` 明确批准。
- **工具调用策略控制**：对危险命令、敏感路径写入、Git 操作等行为进行拦截或确认。
- **自动化验证**：自动识别并执行测试、构建等命令，记录退出码、耗时和结果摘要。
- **质量评估**：从计划完整性、审批记录、验证结果、策略审计等维度对工作流评分。
- **平台化扩展**：支持 Subagent 派发、MCP 工具桥接、项目 Memory 和 Observability 摘要。
- **多格式报告**：输出 Markdown / JSON / HTML 报告，记录计划、执行、验证和评估结果。

## 项目结构

```text
agentforge/                 AgentForge 主项目
  bin/                      CLI 启动入口
  extensions/workflow/      Pi 工作流扩展
  src/                      核心模块
  test/                     单元测试
  examples/demo-task-board/ 可复现演示项目
pi/                         Pi 上游项目，作为 Git submodule 引入
docs/                       设计与实现规划文档
```

## 快速体验

```powershell
git clone --recurse-submodules https://github.com/part33/agentforge.git
cd agentforge\agentforge
npm.cmd test
npm.cmd run smoke
npm.cmd run demo:report
npm.cmd run demo:evaluate
```

生成的 HTML 报告位于：

```text
agentforge/.agentforge/reports/
```

## 技术栈

Node.js、TypeScript、Pi Extension、MCP Adapter、JSON Workflow State、Node Test Runner、HTML Report

## 当前状态

- Workflow：已完成多阶段 Agent 工作流。
- Eval：已完成工作流质量评分。
- Platform：已完成 Subagent、MCP Adapter、Memory、Observability 的 MVP。
- Demo：内置 `demo-task-board`，可生成报告和评估结果。

更多细节见：

- [AgentForge README](agentforge/README.md)
- [架构说明](agentforge/docs/architecture.md)
- [演示脚本](agentforge/docs/demo.md)
- [三期平台化能力](agentforge/docs/phase-three.md)
