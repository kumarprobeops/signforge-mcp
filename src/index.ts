#!/usr/bin/env node
/**
 * SignForge MCP Server
 *
 * Provides e-signature tools to AI agents via the Model Context Protocol.
 * Connects to SignForge's V1 API using an API key.
 *
 * Environment variables:
 *   SIGNFORGE_API_KEY  — Your SignForge API key (required)
 *   SIGNFORGE_API_URL  — API base URL (default: https://signforge.io/api/v1)
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { toolDefinitions, handleTool } from "./tools.js";

const server = new Server(
  {
    name: "signforge",
    version: "1.2.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: toolDefinitions,
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  return handleTool(name, (args || {}) as Record<string, unknown>);
});

// Validate API key on startup
if (!process.env.SIGNFORGE_API_KEY) {
  console.error(
    "Error: SIGNFORGE_API_KEY environment variable is required.\n" +
      "Get your API key at https://signforge.io/dashboard/developers"
  );
  process.exit(1);
}

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("SignForge MCP server started");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
