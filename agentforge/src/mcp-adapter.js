function normalizeTool(server, tool) {
  return {
    id: `${server.id}.${tool.name}`,
    serverId: server.id,
    name: tool.name,
    description: tool.description ?? "",
    inputSchema: tool.inputSchema ?? {},
    enabled: tool.enabled !== false,
  };
}

export function createMcpServerManifest(config = {}) {
  const servers = (config.servers ?? []).map((server) => ({
    id: server.id,
    name: server.name ?? server.id,
    command: server.command,
    args: server.args ?? [],
    env: server.env ?? {},
    tools: server.tools ?? [],
  }));

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    servers,
    tools: servers.flatMap((server) => server.tools.map((tool) => normalizeTool(server, tool))),
  };
}

export function createPiToolBridge(manifest) {
  return {
    schemaVersion: 1,
    tools: (manifest.tools ?? []).map((tool) => ({
      piToolName: `mcp.${tool.id}`,
      mcpServerId: tool.serverId,
      mcpToolName: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      enabled: tool.enabled,
    })),
  };
}

export function describeMcpBridge(bridge) {
  if (!bridge.tools?.length) {
    return "No MCP tools configured.";
  }
  return bridge.tools
    .map((tool) => `${tool.piToolName} -> ${tool.mcpServerId}/${tool.mcpToolName}`)
    .join("\n");
}
