#!/usr/bin/env node

import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import packageJson from "../package.json" with { type: "json" };

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(__dirname, "..");
const workspaceRoot = resolve(packageRoot, "..");
const workflowExtension = resolve(packageRoot, "extensions", "workflow", "index.ts");

function printHelp() {
  console.log(`AgentForge ${packageJson.version}

Usage:
  agentforge [goal]
  agentforge --version
  agentforge --help

Examples:
  agentforge
  agentforge "Add priority filtering to the task board app"

AgentForge launches Pi with the AgentForge workflow extension preloaded.
Set AGENTFORGE_PI_BIN to override the Pi executable.`);
}

function splitArgs(args) {
  const passthrough = [];
  const goalParts = [];
  let collectingGoal = false;

  for (const arg of args) {
    if (collectingGoal) {
      goalParts.push(arg);
      continue;
    }
    if (arg === "--") {
      collectingGoal = true;
      continue;
    }
    if (arg.startsWith("-")) {
      passthrough.push(arg);
    } else {
      goalParts.push(arg);
      collectingGoal = true;
    }
  }

  return {
    passthrough,
    goal: goalParts.join(" ").trim(),
  };
}

function resolvePiCommand() {
  if (process.env.AGENTFORGE_PI_BIN) {
    return { command: process.env.AGENTFORGE_PI_BIN, args: [] };
  }

  const localPiPowerShell = resolve(workspaceRoot, "pi", "pi-test.ps1");
  if (process.platform === "win32" && existsSync(localPiPowerShell)) {
    return {
      command: "powershell",
      args: ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", localPiPowerShell],
    };
  }

  const localPiShell = resolve(workspaceRoot, "pi", "pi-test.sh");
  if (process.platform !== "win32" && existsSync(localPiShell)) {
    return { command: localPiShell, args: [] };
  }

  return { command: process.platform === "win32" ? "pi.cmd" : "pi", args: [] };
}

const args = process.argv.slice(2);

if (args.includes("--version") || args.includes("-v")) {
  console.log(packageJson.version);
  process.exit(0);
}

if (args.includes("--help") || args.includes("-h")) {
  printHelp();
  process.exit(0);
}

if (!existsSync(workflowExtension)) {
  console.error(`AgentForge workflow extension not found: ${workflowExtension}`);
  process.exit(1);
}

const { passthrough, goal } = splitArgs(args);
const pi = resolvePiCommand();
const piArgs = [...pi.args, "--extension", workflowExtension, ...passthrough];

if (goal) {
  piArgs.push(`/workflow ${goal}`);
}

const child = spawn(pi.command, piArgs, {
  cwd: process.cwd(),
  stdio: "inherit",
  shell: false,
});

child.on("error", (error) => {
  console.error(`Failed to launch Pi: ${error.message}`);
  console.error("Install Pi or set AGENTFORGE_PI_BIN to a Pi executable.");
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
