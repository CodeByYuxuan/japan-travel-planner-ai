const Itinerary = require('../models/Itinerary');
const { generateAIItinerary } = require('../utils/openaiHelper');

const generateItinerary = async (req, res) => {
    const { destination, days, preferences } = req.body;
    try {
        const content = await generateAIItinerary(destination, days, preferences);
        const itinerary = new Itinerary({ destination, days, preferences, content });
        await itinerary.save();
        res.json(itinerary);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { generateItinerary };
