# 第二期：AgentForge Eval

第一期解决的是“Agent 如何按工程流程完成任务”：计划、审批、执行、验证、报告。

第二期解决的是另一个问题：**Agent 这次执行到底靠不靠谱？**

AgentForge Eval 是一个工作流质量评估层。它会读取一次 workflow run，并根据可解释的检查项给出分数、等级和改进建议。

## 为什么需要第二期

只生成报告还不够。报告能告诉我们发生了什么，但不能直接告诉我们这次执行质量是否达标。

第二期的目标是让 AgentForge 从“过程记录工具”升级成“过程评估工具”：

- 第一阶段：把 Agent 行为记录下来。
- 第二阶段：判断这次行为是否符合工程标准。
- 第三阶段：未来可以把多次执行结果聚合成 benchmark。

## 当前评分维度

总分 100 分：

- 工作流完成状态：15 分
- 结构化计划：15 分
- 人工审批记录：10 分
- 自动化验证通过：25 分
- 调研来源记录：10 分
- 策略审计事件：10 分
- 报告产物完整：15 分

评分结果会包含：

- `score`：0 到 100 的分数。
- `grade`：A/B/C/D/F。
- `passed`：是否达到默认通过线。
- `checks`：每个检查项的结果和得分。
- `recommendations`：没有通过的检查项对应的改进建议。

## 使用方式

生成 demo 报告：

```powershell
npm.cmd run demo:report
```

生成 demo 报告并进行评估：

```powershell
npm.cmd run demo:evaluate
```

评估结果会写入：

```text
.agentforge/evaluations/*.md
.agentforge/evaluations/*.json
```

## 模块说明

AgentForge Eval 的定位：

```text
AgentForge Eval 对每次 Agent 工作流进行质量评估，按计划完整性、审批记录、验证结果、调研来源、策略审计和报告产物完整度进行可解释评分，并输出 Markdown/JSON 评估报告。
```

这个点的价值在于：项目不只是“让 Agent 做事”，而是开始评估 Agent 做事的质量。
