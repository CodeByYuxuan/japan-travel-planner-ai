import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Model pricing per 1K tokens
const modelPrices = {
  "gpt-3.5-turbo": { input: 0.001, output: 0.002 },
  "gpt-4": { input: 0.03, output: 0.06 },
  "gpt-4-turbo": { input: 0.01, output: 0.03 },
};

// In-memory daily cost tracker (reset on server restart)
if (!global.dailyCostUSD) global.dailyCostUSD = 0;

export const generateAIItinerary = async (destination, days, preferences) => {
  const model = "gpt-3.5-turbo"; // Change to desired model
  const prompt = `Create a detailed ${days}-day itinerary for ${destination}, focusing on these interests: ${preferences.join(
    ", "
  )}.`;

  // Send request to OpenAI API
  const response = await openai.chat.completions.create({
    model,
    messages: [{ role: "user", content: prompt }],
    max_tokens: 1000,
    temperature: 0.7,
  });

  // Token usage from API response
  const usage = response.usage;
  const inputTokens = usage?.prompt_tokens || 0;
  const outputTokens = usage?.completion_tokens || 0;

  // Calculate estimated cost
  const price = modelPrices[model];
  const estimatedCost =
    (inputTokens / 1000) * price.input + (outputTokens / 1000) * price.output;

  // Reject request if it exceeds the limit
  if (estimatedCost > 0.1) {
    throw new Error(
      `❌ Estimated cost $${estimatedCost.toFixed(
        4
      )} exceeds $0.10 limit. Request blocked.`
    );
  }

  // Add to daily total
  global.dailyCostUSD += estimatedCost;

  // Print logs
  console.log("🧾 AI itinerary request details:");
  console.log("👉 Prompt:", prompt);
  console.log(
    "🔢 Tokens used: Input =",
    inputTokens,
    ", Output =",
    outputTokens
  );
  console.log(
    `💰 Estimated cost: $${estimatedCost.toFixed(4)} (model: ${model})`
  );
  console.log(`📊 Total cost today: $${global.dailyCostUSD.toFixed(4)}`);

  return response.choices[0].message.content;
};
