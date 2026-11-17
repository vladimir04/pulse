import { McpServer } from '@modelcontextprotocol/server';
import { createMcpHandler } from 'agents/mcp/server';
import { z } from 'zod';
import { getKpis } from '../shared/queries';

// The handler is stateless: it calls this factory to build a fresh server per request.
function createServer(): McpServer {
  const server = new McpServer({ name: 'pulse', version: '0.0.0' });

  server.registerTool(
    'get_kpis',
    {
      description:
        'Occupancy (fraction 0-1), ADR and RevPAR for the hotel over an inclusive date range. ' +
        'Omit a bound to leave that side of the range open.',
      inputSchema: z.object({
        from: z.iso.date().optional().describe('First day, YYYY-MM-DD'),
        to: z.iso.date().optional().describe('Last day, YYYY-MM-DD'),
      }),
    },
    async ({ from, to }) => ({
      content: [{ type: 'text', text: JSON.stringify(getKpis({ from, to })) }],
    }),
  );

  return server;
}

const mcpHandler = createMcpHandler(createServer);

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/api/health') {
      return Response.json({ ok: true });
    }

    if (request.method === 'GET' && url.pathname === '/api/kpis') {
      return Response.json(
        getKpis({
          from: url.searchParams.get('from') || undefined,
          to: url.searchParams.get('to') || undefined,
        }),
      );
    }

    // All methods go to the handler so MCP clients get its own 405 for GET/DELETE
    // instead of the SPA's index.html.
    if (url.pathname === '/mcp') {
      return mcpHandler(request, env, ctx);
    }

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
