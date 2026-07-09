import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const KNOWN_SCRIPT_ORDER = [
  ["test", "Run the project test suite."],
  ["lint", "Run lint checks."],
  ["typecheck", "Run TypeScript type checks."],
  ["build", "Run production build."],
];

function summarizeOutput(output, maxLength = 1200) {
  const normalized = output.replace(/\r\n/g, "\n").trim();
  if (!normalized) return "";
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength)}\n...[truncated ${normalized.length - maxLength} chars]`;
}

export async function readPackageJson(cwd) {
  const raw = await readFile(join(cwd, "package.json"), "utf8");
  return JSON.parse(raw);
}

export async function detectVerificationCommands(cwd) {
  let packageJson;
  try {
    packageJson = await readPackageJson(cwd);
  } catch {
    return [];
  }

  const scripts = packageJson.scripts && typeof packageJson.scripts === "object" ? packageJson.scripts : {};
  const packageManager = packageJson.packageManager?.startsWith("pnpm")
    ? "pnpm"
    : packageJson.packageManager?.startsWith("yarn")
      ? "yarn"
      : "npm";

  const commands = [];
  for (const [script, reason] of KNOWN_SCRIPT_ORDER) {
    if (typeof scripts[script] === "string") {
      commands.push({
        command: packageManager === "npm" ? `npm run ${script}` : `${packageManager} ${script}`,
        reason,
        required: script === "test" || script === "build",
        source: "package.json",
      });
    }
  }

  return commands;
}

export function runVerificationCommand(command, options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const timeoutMs = options.timeoutMs ?? 120000;
  const startedAt = Date.now();

  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const child = spawn(command, {
      cwd,
      shell: true,
      windowsHide: true,
      env: { ...process.env, ...(options.env ?? {}) },
    });

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, timeoutMs);

    child.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      clearTimeout(timeout);
      const durationMs = Date.now() - startedAt;
      resolve({
        command,
        status: "failed",
        exitCode: null,
        durationMs,
        summary: error.message,
        stdout: "",
        stderr: error.message,
        timedOut: false,
      });
    });

    child.on("close", (exitCode) => {
      clearTimeout(timeout);
      const durationMs = Date.now() - startedAt;
      const combined = [stdout, stderr].filter(Boolean).join("\n");
      const status = timedOut ? "failed" : exitCode === 0 ? "passed" : "failed";
      resolve({
        command,
        status,
        exitCode,
        durationMs,
        summary: timedOut ? `Timed out after ${timeoutMs}ms.` : summarizeOutput(combined) || `Exited with ${exitCode}.`,
        stdout: summarizeOutput(stdout),
        stderr: summarizeOutput(stderr),
        timedOut,
      });
    });
  });
}

export async function runVerificationCommands(commands, options = {}) {
  const results = [];
  for (const item of commands) {
    const command = typeof item === "string" ? item : item.command;
    if (!command) continue;
    const result = await runVerificationCommand(command, options);
    results.push({
      ...result,
      reason: typeof item === "string" ? undefined : item.reason,
      required: typeof item === "string" ? true : item.required !== false,
    });
  }
  return results;
}
