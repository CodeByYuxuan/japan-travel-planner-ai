# 🤖 AI Prompt Plan – Japan Travel Planner AI

This document defines the strategy for using OpenAI's GPT model to generate structured, multi-day travel itineraries.

---

## 🧠 Prompt Template

Ask the AI to generate a structured JSON itinerary:

```
Generate a detailed itinerary for a {days}-day trip to {destination} starting from {startDate}.
The traveler is interested in {interests}.
Please format the response as JSON with a day-by-day breakdown, and include time of day, activity name, and a short description.
```

---

## 💡 Example Prompt

```
Generate a detailed itinerary for a 5-day trip to Tokyo starting from 2025-05-01.
The traveler is interested in anime, food, and historical landmarks.
Please provide a JSON response like:

{
  "day1": [
    {
      "time": "Morning",
      "activity": "Visit Senso-ji Temple",
      "details": "Explore Tokyo’s oldest temple and nearby Nakamise-dori street."
    },
    {
      "time": "Afternoon",
      "activity": "Lunch at Ichiran Ramen",
      "details": "Try famous tonkotsu ramen in Shibuya."
    },
    {
      "time": "Evening",
      "activity": "Visit Tokyo Skytree",
      "details": "Enjoy panoramic city views at night."
    }
  ],
  ...
}
```

---

## 📄 Output Format

- **Required structure**:
```json
{
  "day1": [ { "time": "Morning", "activity": "Name", "details": "..." } ],
  "day2": [ ... ]
}
```

- Use consistent keys: `"day1"`, `"day2"`, etc.
- Each day's list can include 2–4 activities, with time segments (e.g., Morning, Afternoon, Evening).

---

## 🔧 Prompt Fields

| Field       | Type     | Description                                    |
|-------------|----------|------------------------------------------------|
| destination | String   | City or region in Japan                        |
| days        | Integer  | Number of days for the trip                    |
| startDate   | Date     | Optional – improves accuracy for weather APIs |
| interests   | String[] | Travel themes (e.g., "food", "culture")       |

---

## ✅ Integration Tips

- Use this prompt from backend (Node.js) with OpenAI’s `chat.completions` endpoint.
- Set the `temperature` parameter between 0.7–0.9 for varied but coherent results.
- Validate returned JSON using `try/catch` in backend before sending to frontend.
- If the AI fails to format output, prompt again with:  
  _“Please reformat the previous itinerary in valid JSON.”_

---