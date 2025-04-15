# 🤖 AI Prompt Plan – Japan Travel Planner AI

This file describes the strategy for generating itineraries using OpenAI.

---

## 🧠 Prompt Template

```
Plan a {days}-day trip to {destination} starting on {startDate}.
The traveler is interested in {interests}.
Provide a daily itinerary broken down by day.
```

### Example Prompt

```
Plan a 5-day trip to Tokyo starting on 2025-05-01.
The traveler is interested in anime, food, and historical landmarks.
Please provide a detailed itinerary for each day.
```

---

## 🗂 Prompt Fields

- destination
- days
- startDate
- interests

---

## 📄 Expected Output

### Plain Text (Markdown format)
```
Day 1:
- Visit Senso-ji Temple
- Explore Akihabara
...
```

### JSON (Optional)
```json
{
  "day1": ["Visit Senso-ji Temple", "Explore Akihabara"],
  "day2": ["Eat ramen", "Visit TeamLab"]
}
```
