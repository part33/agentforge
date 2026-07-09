import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  detectVerificationCommands,
  runVerificationCommand,
  runVerificationCommands,
} from "../src/verification-runner.js";

test("detectVerificationCommands reads known package scripts", async () => {
  const dir = await mkdtemp(join(tmpdir(), "agentforge-verify-"));
  try {
    await writeFile(
      join(dir, "package.json"),
      JSON.stringify({
        scripts: {
          test: "node --test",
          lint: "eslint .",
          custom: "echo custom",
        },
      }),
      "utf8",
    );

    const commands = await detectVerificationCommands(dir);

    assert.deepEqual(
      commands.map((item) => item.command),
      ["npm run test", "npm run lint"],
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("detectVerificationCommands returns empty list when package.json is missing", async () => {
  const dir = await mkdtemp(join(tmpdir(), "agentforge-verify-"));
  try {
    const commands = await detectVerificationCommands(dir);
    assert.deepEqual(commands, []);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("runVerificationCommand records passing command", async () => {
  const result = await runVerificationCommand('node -e "console.log(42)"', { timeoutMs: 10000 });

  assert.equal(result.status, "passed");
  assert.equal(result.exitCode, 0);
  assert.match(result.summary, /42/);
});

test("runVerificationCommands preserves command metadata", async () => {
  const results = await runVerificationCommands(
    [{ command: 'node -e "console.log(42)"', reason: "smoke", required: false }],
    { timeoutMs: 10000 },
  );

  assert.equal(results.length, 1);
  assert.equal(results[0].reason, "smoke");
  assert.equal(results[0].required, false);
});
