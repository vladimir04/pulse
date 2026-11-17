import { McpServer } from '@modelcontextprotocol/server';
import { createMcpHandler } from 'agents/mcp/server';
import { z } from 'zod';
import { tools } from '../shared/tools';

// The handler is stateless: it calls this factory to build a fresh server per request.
function createServer(): McpServer {
  const server = new McpServer({ name: 'pulse', version: '0.0.0' });
  for (const tool of tools) {
    server.registerTool(
      tool.name,
      { description: tool.description, inputSchema: tool.schema },
      async (args) => ({ content: [{ type: 'text', text: JSON.stringify(tool.run(args)) }] }),
    );
  }
  return server;
}

const mcpHandler = createMcpHandler(createServer);
const apiRoutes = new Map(tools.map((tool) => [tool.path, tool]));

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/api/health') {
      return Response.json({ ok: true });
    }

    // Every tool is also a GET route; its schema validates the query parameters.
    const tool = request.method === 'GET' ? apiRoutes.get(url.pathname) : undefined;
    if (tool) {
      try {
        return Response.json(tool.run(Object.fromEntries(url.searchParams)));
      } catch (error) {
        if (!(error instanceof z.ZodError)) throw error;
        const issues = error.issues.map((issue) => ({
          parameter: issue.path.join('.'),
          message: issue.message,
        }));
        return Response.json({ error: 'Invalid query parameters', issues }, { status: 400 });
      }
    }

    // All methods go to the handler so MCP clients get its own 405 for GET/DELETE
    // instead of the SPA's index.html.
    if (url.pathname === '/mcp') {
      return mcpHandler(request, env, ctx);
    }

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
