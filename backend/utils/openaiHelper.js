const axios = require('axios');

const generateAIItinerary = async (destination, days, preferences) => {
    const prompt = `Create a ${days}-day itinerary for ${destination} focused on ${preferences.join(', ')}.`;
    const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
            model: 'gpt-4',
            messages: [{ role: 'user', content: prompt }],
        },
        {
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
            },
        }
    );
    return response.data.choices[0].message.content;
};

module.exports = { generateAIItinerary };
