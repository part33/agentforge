import { writeDemoReport } from "./demo-runner.js";
import { writeWorkflowEvaluation } from "./evaluator.js";
import { pathToFileURL } from "node:url";

export async function runDemoEvaluation(options = {}) {
  const { run, paths: reportPaths } = await writeDemoReport(options);
  const runWithReportPaths = { ...run, reportPaths };
  const { evaluation, paths: evaluationPaths } = await writeWorkflowEvaluation(runWithReportPaths, options.cwd ?? process.cwd());
  return {
    run: runWithReportPaths,
    reportPaths,
    evaluation,
    evaluationPaths,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await runDemoEvaluation({ cwd: process.cwd() });
  console.log(`AgentForge demo evaluation score: ${result.evaluation.score} (${result.evaluation.grade})`);
  console.log(`Evaluation report written: ${result.evaluationPaths.markdown}`);
}
