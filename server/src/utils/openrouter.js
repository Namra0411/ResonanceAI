import OpenAI from "openai";

let client = null;

/**
 * Base OpenRouter client (USED BY EXISTING CODE)
 */
export function getOpenRouter() {
  if (!client) {
    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY is missing in environment");
    }

    client = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: "https://openrouter.ai/api/v1",
    });
  }

  return client;
}

/**
 * Embedding helper (USED BY CHAT)
 */
export async function embedText(text) {
  const openai = getOpenRouter();

  const response = await openai.embeddings.create({
    model: "text-embedding-3-large",
    input: text,
  });

  return response.data[0].embedding;
}

/**
 * Chat completion helper (USED BY CHAT)
 */
export async function generateAnswer({ systemPrompt, userPrompt }) {
  const openai = getOpenRouter();

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    messages: [
      { role: "system", content: systemPrompt.trim() },
      { role: "user", content: userPrompt.trim() },
    ],
  });

  return response.choices[0].message.content;
}

/**
 * Streaming chat completion helper.
 * Calls onToken(deltaText) for every token chunk as it arrives.
 * Returns the full concatenated answer once the stream ends
 * (this is what gets persisted to Mongo).
 */
export async function generateAnswerStream({
  systemPrompt,
  userPrompt,
  onToken,
}) {
  const openai = getOpenRouter();

  const stream = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    stream: true,
    messages: [
      { role: "system", content: systemPrompt.trim() },
      { role: "user", content: userPrompt.trim() },
    ],
  });

  let fullText = "";

  for await (const chunk of stream) {
    const delta = chunk.choices?.[0]?.delta?.content;
    if (delta) {
      fullText += delta;
      onToken?.(delta);
    }
  }

  return fullText;
}