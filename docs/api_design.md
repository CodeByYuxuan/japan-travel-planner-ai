# 🔌 API Design – Japan Travel Planner AI

This document outlines the key backend endpoints.

---

## 🌐 Base URL

```
/api
```

---

## 📤 Endpoints

### POST /api/itinerary

- Description: Generate a trip itinerary using OpenAI
- Request Body:

```json
{
  "destination": "Tokyo",
  "startDate": "2025-05-01",
  "days": 5,
  "interests": ["food", "culture"]
}
```

- Response: Raw itinerary (text or JSON)

---

### POST /api/save

- Description: Save itinerary to database
- Request Body:

```json
{
  "userId": "123abc",
  "destination": "Tokyo",
  "startDate": "2025-05-01",
  "days": 5,
  "preferences": ["food", "culture"],
  "aiResponse": {},
  "enriched": {}
}
```

---

### GET /api/itinerary/:id

- Description: Retrieve saved itinerary by ID
