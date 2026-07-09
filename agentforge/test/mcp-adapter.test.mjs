import assert from "node:assert/strict";
import test from "node:test";

import { createMcpServerManifest, createPiToolBridge, describeMcpBridge } from "../src/mcp-adapter.js";

test("createMcpServerManifest normalizes server tools", () => {
  const manifest = createMcpServerManifest({
    servers: [{ id: "repo", command: "repo-mcp", tools: [{ name: "search", description: "Search repo" }] }],
  });

  assert.equal(manifest.servers.length, 1);
  assert.equal(manifest.tools[0].id, "repo.search");
});

test("createPiToolBridge maps MCP tools to Pi tool names", () => {
  const bridge = createPiToolBridge(
    createMcpServerManifest({
      servers: [{ id: "repo", tools: [{ name: "search" }] }],
    }),
  );

  assert.equal(bridge.tools[0].piToolName, "mcp.repo.search");
  assert.match(describeMcpBridge(bridge), /mcp.repo.search/);
});
