import OpenAI from "openai";

let client = null;

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
