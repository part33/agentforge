const SENSITIVE_PATHS = [".env", ".git/", "node_modules/"];

const BLOCKED_BASH_PATTERNS = [
  { pattern: /\brm\s+(-rf?|--recursive)\b/i, reason: "Recursive deletion is blocked by policy." },
  { pattern: /\bsudo\b/i, reason: "sudo is blocked by policy." },
  { pattern: /\b(chmod|chown)\b.*\b777\b/i, reason: "chmod/chown 777 is blocked by policy." },
];

const CONFIRM_BASH_PATTERNS = [
  { pattern: /\bgit\s+push\b/i, reason: "git push requires confirmation." },
  { pattern: /\bgit\s+commit\b/i, reason: "git commit requires confirmation." },
  { pattern: /\bnpm\s+(install|i)\b/i, reason: "package installation requires confirmation." },
  { pattern: /\b(pnpm|yarn)\s+(add|install)\b/i, reason: "package installation requires confirmation." },
];

function normalizePath(path) {
  return String(path ?? "").replace(/\\/g, "/");
}

function pathFromInput(input) {
  if (!input || typeof input !== "object") return "";
  return normalizePath(input.path ?? input.file_path ?? "");
}

function commandFromInput(input) {
  if (!input || typeof input !== "object") return "";
  return String(input.command ?? "");
}

function matchPathPolicy(toolName, input) {
  if (toolName !== "write" && toolName !== "edit") {
    return undefined;
  }

  const path = pathFromInput(input);
  const matched = SENSITIVE_PATHS.find((protectedPath) => path.includes(protectedPath));
  if (!matched) return undefined;
  return {
    decision: "block",
    reason: `Path "${path}" matches protected path "${matched}".`,
    category: "protected_path",
    subject: path,
  };
}

function matchBashPolicy(toolName, input) {
  if (toolName !== "bash") {
    return undefined;
  }

  const command = commandFromInput(input);
  for (const rule of BLOCKED_BASH_PATTERNS) {
    if (rule.pattern.test(command)) {
      return {
        decision: "block",
        reason: rule.reason,
        category: "dangerous_command",
        subject: command,
      };
    }
  }

  for (const rule of CONFIRM_BASH_PATTERNS) {
    if (rule.pattern.test(command)) {
      return {
        decision: "confirm",
        reason: rule.reason,
        category: "confirm_command",
        subject: command,
      };
    }
  }

  return undefined;
}

export function evaluateToolCallPolicy({ toolName, input }) {
  const pathPolicy = matchPathPolicy(toolName, input);
  if (pathPolicy) return pathPolicy;

  const bashPolicy = matchBashPolicy(toolName, input);
  if (bashPolicy) return bashPolicy;

  return {
    decision: "allow",
    reason: "No policy rule matched.",
    category: "default_allow",
    subject: toolName,
  };
}

export function createPolicyEvent({ toolName, toolCallId, input, decision }) {
  return {
    toolName,
    toolCallId,
    input,
    decision: decision.decision,
    reason: decision.reason,
    category: decision.category,
    subject: decision.subject,
  };
}
