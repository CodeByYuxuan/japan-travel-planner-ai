import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const generateAIItinerary = async (destination, days, preferences) => {
  const prompt = `Create a detailed ${days}-day itinerary for ${destination}, focusing on these interests: ${preferences.join(
    ", "
  )}.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 1000,
    temperature: 0.7,
  });

  return response.choices[0].message.content;
};
