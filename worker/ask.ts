import Anthropic from '@anthropic-ai/sdk';
import {
  askInput,
  askSystemPrompt,
  PRESENT_ANSWER,
  presentAnswerTool,
  presentedAnswer,
  type AskResponse,
} from '../shared/ask';

const DEFAULT_MODEL = 'claude-sonnet-5-5';
const MAX_TOKENS = 1500;
/** The name the request gives this Worker's own MCP server. */
const MCP_SERVER = 'pulse';

/** No answer: 502 with a sentence the drawer's reader could act on. */
const noAnswer = (message: string): Response => Response.json({ error: message }, { status: 502 });

/**
 * POST /api/ask: one question about one hotel, answered as a card. Claude reads the data through
 * this Worker's MCP server (the MCP connector runs those tool calls on Anthropic's side, so the
 * server must be reachable at MCP_PUBLIC_URL) and finishes by calling present_answer, whose
 * input is the card. The MCP tool calls it made on the way are the card's evidence.
 */
export async function handleAsk(request: Request, env: Env): Promise<Response> {
  const body = askInput.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    const issues = body.error.issues.map((issue) => ({
      parameter: issue.path.join('.'),
      message: issue.message,
    }));
    return Response.json({ error: 'Invalid question', issues }, { status: 400 });
  }
  const { question, hotelId, period } = body.data;

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  let message: Anthropic.Beta.BetaMessage;
  try {
    message = await client.beta.messages.create({
      model: env.MODEL || DEFAULT_MODEL,
      max_tokens: MAX_TOKENS,
      betas: ['mcp-client-2025-11-20'],
      // A drawer answer is a few tool calls and one card: little to deliberate over.
      output_config: { effort: 'low' },
      system: askSystemPrompt(hotelId, period),
      messages: [{ role: 'user', content: question }],
      mcp_servers: [{ type: 'url', url: env.MCP_PUBLIC_URL, name: MCP_SERVER }],
      tools: [{ type: 'mcp_toolset', mcp_server_name: MCP_SERVER }, presentAnswerTool()],
    });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      console.error('ask: the Anthropic API key was refused');
      return noAnswer('Ask is not set up: the API key was refused.');
    }
    if (error instanceof Anthropic.RateLimitError) {
      return noAnswer('Too many questions at once. Try again in a moment.');
    }
    if (error instanceof Anthropic.APIError) {
      console.error(`ask: ${error.status ?? 'no response'} ${error.message}`);
      return noAnswer('The model could not be reached. Try again.');
    }
    throw error;
  }

  const usage = {
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
  };
  console.log(
    `ask: ${usage.inputTokens} input and ${usage.outputTokens} output tokens ` +
      `(${message.model}, stopped on ${message.stop_reason})`,
  );

  if (message.stop_reason === 'refusal') {
    return noAnswer('The model declined to answer that question.');
  }
  const presented = message.content.find(
    (block): block is Anthropic.Beta.BetaToolUseBlock =>
      block.type === 'tool_use' && block.name === PRESENT_ANSWER,
  );
  if (!presented) {
    return noAnswer(
      message.stop_reason === 'max_tokens'
        ? 'The answer ran too long. Ask a narrower question.'
        : 'The model did not present an answer. Try again.',
    );
  }

  // A chart that does not fit the schema, or whose series do not line up with its axis, is
  // dropped; the rest of the card still stands.
  const input: Record<string, unknown> =
    typeof presented.input === 'object' && presented.input !== null ? { ...presented.input } : {};
  let card = presentedAnswer.safeParse(input);
  if (!card.success) card = presentedAnswer.safeParse({ ...input, chart: undefined });
  if (!card.success) return noAnswer('The model presented an answer Pulse could not read.');
  const { chart, ...text } = card.data;
  const aligned = chart?.series.every((series) => series.data.length === chart.x.length);

  const evidence = message.content
    .filter((block): block is Anthropic.Beta.BetaMCPToolUseBlock => block.type === 'mcp_tool_use')
    .map((call) => ({
      name: call.name,
      input:
        typeof call.input === 'object' && call.input !== null
          ? (call.input as Record<string, unknown>)
          : {},
    }));

  const answer: AskResponse = {
    answer: { ...text, ...(chart && aligned ? { chart } : {}), evidence },
    usage,
  };
  return Response.json(answer);
}
