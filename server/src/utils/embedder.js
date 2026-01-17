import { getOpenRouter } from "./openrouter.js";

export async function embedTexts(texts) {
  const openrouter = getOpenRouter();

  const response = await openrouter.embeddings.create({
    model: "openai/text-embedding-3-large",
    input: texts,
  });

  return response.data.map(item => item.embedding);
}
