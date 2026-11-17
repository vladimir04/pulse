/*
 * The Ask drawer's contract with the model: what a question looks like, the shape of the card
 * the model must present, and the instructions it works under.
 */
import { z } from 'zod';
import { glossary } from './glossary';
import { getAsOf, getHotels, hotelIdSchema } from './queries';
import type { AnswerCard, Period } from './types';

const period = z.object({ from: z.iso.date(), to: z.iso.date() });

/** The body of POST /api/ask. */
export const askInput = z.object({
  question: z.string().trim().min(1).max(500),
  hotelId: hotelIdSchema,
  /** The period on the user's screen, when there is one */
  period: period.optional(),
});
export type AskInput = z.infer<typeof askInput>;

/** What POST /api/ask answers. */
export interface AskResponse {
  answer: AnswerCard;
  usage: { inputTokens: number; outputTokens: number };
}

const chartSpec = z.object({
  type: z
    .enum(['line', 'bar'])
    .describe('line for a metric over time, bar to compare a few named things'),
  title: z.string().describe('What the chart shows, in at most five words'),
  unit: z
    .enum(['percent', 'currency', 'count', 'ratio'])
    .describe('The unit of every value; percent values are on a 0–100 scale, currency is EUR'),
  x: z
    .array(z.string())
    .describe('The labels along the axis: ISO dates or YYYY-MM for a line, names for bars'),
  series: z
    .array(
      z.object({
        name: z.string().describe('How the series reads in the key, such as "This year"'),
        data: z
          .array(z.number().nullable())
          .describe('One value for each label in x, in the same order; null where there is none'),
        role: z
          .enum(['current', 'lastYear', 'entity'])
          .describe(
            'current for the period asked about, lastYear for the comparison, entity for one booking channel',
          ),
        entityId: z
          .string()
          .optional()
          .describe('For an entity series, the channelId from get_channel_performance'),
      }),
    )
    .min(1)
    .max(5),
});

/** The input of the model's present_answer tool: an AnswerCard without its evidence. */
export const presentedAnswer = z.object({
  headline: z
    .string()
    .describe('One sentence that answers the question and carries the key number'),
  chart: chartSpec
    .optional()
    .describe('A small chart of numbers a tool returned, when one makes the point clearer'),
  cause: z
    .string()
    .describe('One or two sentences on why, naming the events behind it with their dates'),
  nextMove: z.string().describe('One imperative sentence the manager can act on'),
  confidence: z
    .enum(['high', 'medium', 'low'])
    .describe(
      'high when tool results answer the question directly, medium when part is inferred, low when the data only partly covers it',
    ),
  followUps: z
    .array(z.string())
    .max(3)
    .describe('Two or three short questions the manager is likely to ask next'),
});

export const PRESENT_ANSWER = 'present_answer';

/** The present_answer tool as the Messages API takes it. */
export function presentAnswerTool(): {
  name: string;
  description: string;
  input_schema: { type: 'object'; [key: string]: unknown };
} {
  const { $schema: _draft, ...schema } = z.toJSONSchema(presentedAnswer);
  return {
    name: PRESENT_ANSWER,
    description:
      'Shows the answer to the user as one card. Call it exactly once, as the last step, after ' +
      'the data tools have returned the numbers. Every figure in it must come from a tool result.',
    input_schema: { ...schema, type: 'object' },
  };
}

/** The instructions for one question about one hotel. */
export function askSystemPrompt(hotelId: AskInput['hotelId'], onScreen?: Period): string {
  const hotel = getHotels().find((candidate) => candidate.id === hotelId);
  const asOf = getAsOf();
  const terms = glossary
    .map(
      (entry) =>
        `- ${entry.key} (${entry.label}): ${entry.name} = ${entry.formula}. ${entry.meaning}`,
    )
    .join('\n');
  const screen = onScreen
    ? `The period on the user's screen is ${onScreen.from} to ${onScreen.to}. Use it unless the question names another period.`
    : 'No period is selected. Use the period that fits the question.';

  return `You answer questions from hotel managers about their own hotel's numbers in Pulse, a hotel analytics app. The answer is shown as one card: a headline, an optional small chart, why it happened, and what to do next. The reader runs a hotel and is not an analyst.

Today is ${asOf}, the last day that has data. Treat it as "today" for every relative date, such as "last month", "next month" or "the last 90 days".
The question is about ${hotel?.name ?? hotelId} (hotelId "${hotelId}"). ${screen}

How to work:
- Call the data tools before stating any number. Every figure in the card must come from a tool result in this conversation; never estimate or invent one. If the tools cannot answer the question, say that in the headline and set confidence to low.
- get_insights holds the hotel's main findings with their causes, and is a good first call for "why" questions. The other tools give the detail. get_events explains changes in the numbers; an event affects the days after its date, so look a few weeks before the period.
- Write in plain English, without hotel shorthand and without the tools' field names: "what the hotel keeps per room night", not "netRate".
- Finish by calling ${PRESENT_ANSWER} exactly once. Do not write the answer as text.

The card:
- headline: one sentence that answers the question and carries the key number.
- cause: one or two sentences on why, naming the events behind it with their dates.
- nextMove: one imperative sentence the manager can act on.
- chart: include one when a tool returned a series or a comparison that shows the point, and copy its numbers exactly as returned.
- followUps: two or three questions of at most eight words that these tools can answer.

Glossary of the metrics, by the key the tools use:
${terms}`;
}
