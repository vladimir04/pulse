import { McpServer } from '@modelcontextprotocol/server';
import { createMcpHandler } from 'agents/mcp/server';
import { z } from 'zod';
import { getHotel, getHotels, getKpis } from '../shared/queries';

// The handler is stateless: it calls this factory to build a fresh server per request.
function createServer(): McpServer {
  const server = new McpServer({ name: 'pulse', version: '0.0.0' });

  server.registerTool(
    'get_kpis',
    {
      description:
        'Occupancy (fraction 0-1), ADR and RevPAR for one hotel over an inclusive date range. ' +
        'Omit a bound to leave that side of the range open.',
      inputSchema: z.object({
        hotelId: z.enum(getHotels().map((hotel) => hotel.id)).describe('Hotel id'),
        from: z.iso.date().optional().describe('First day, YYYY-MM-DD'),
        to: z.iso.date().optional().describe('Last day, YYYY-MM-DD'),
      }),
    },
    async ({ hotelId, from, to }) => ({
      content: [{ type: 'text', text: JSON.stringify(getKpis({ hotelId, from, to })) }],
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

    if (request.method === 'GET' && url.pathname === '/api/hotels') {
      return Response.json(getHotels());
    }

    if (request.method === 'GET' && url.pathname === '/api/kpis') {
      const hotelId = url.searchParams.get('hotelId');
      if (!hotelId || !getHotel(hotelId)) {
        return Response.json({ error: 'hotelId is missing or unknown' }, { status: 400 });
      }
      return Response.json(
        getKpis({
          hotelId,
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
