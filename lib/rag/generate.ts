import OpenAI from "openai";
import type { SearchResult } from "./types";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

const SYSTEM_PROMPT = `You are a helpful store assistant that answers questions about inventory items based ONLY on the provided context.
Rules:
- Use ONLY the information from the provided CONTEXT blocks
- Do NOT use prior knowledge
- If the context doesn't contain enough information, say so
- Cite the chunk IDs you used in your answer
- Be concise and accurate
- When comparing products, highlight key differences in price, features, and brand`;

export interface GenerateOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  maxContextChunks?: number;
  maxChunkChars?: number;
}

export async function generateAnswer(
  question: string,
  chunks: SearchResult[],
  options: GenerateOptions = {}
): Promise<{ answer: string; citations: string[] }> {
  const {
    model = "gpt-4.1-nano",
    temperature = 0.1,
    maxTokens = 500,
    maxContextChunks = 4,
    maxChunkChars = 1400,
  } = options;

  const openai = getClient();

  const contextBlocks = chunks
    .slice(0, maxContextChunks)
    .map(
      (chunk, i) =>
        `[CONTEXT ${i + 1} - ${chunk.id}] (score: ${chunk.score.toFixed(3)})\n${chunk.content.slice(0, maxChunkChars)}`
    )
    .join("\n\n");

  const userMessage = `CONTEXT:\n${contextBlocks}\n\nQUESTION: ${question}\n\nProvide a JSON response with keys: "answer" (string), "citations" (array of chunk IDs used)`;

  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
    max_tokens: maxTokens,
    temperature,
  });

  const content = response.choices[0]?.message?.content || "";

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        answer: parsed.answer || content,
        citations: Array.isArray(parsed.citations) ? parsed.citations : [],
      };
    }
  } catch {
    // Fall through to return raw content
  }

  return { answer: content, citations: [] };
}
