import { generateAIItinerary } from "../utils/openaiHelper.js";

export const generateItinerary = async (req, res) => {
  const { destination, days, preferences, startDate } = req.body;

  try {
    const aiResponse = await generateAIItinerary(
      destination,
      days,
      preferences
    );
    res.json({
      destination,
      days,
      preferences,
      startDate,
      itinerary: aiResponse,
    });
  } catch (error) {
    console.error("❌ Error generating itinerary:", error.message);
    res.status(500).json({ error: "Failed to generate itinerary" });
  }
};
