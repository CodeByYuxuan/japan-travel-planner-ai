# 🏗 System Architecture – Japan Travel Planner AI

This document outlines the core architecture, data flow, scalability considerations, and external API responsibilities for the Japan Travel Planner AI application.

---

## 🧩 Major Components

### 🔹 Frontend
- **Web App**: React + Vite
- **Mobile App**: React Native + Expo

### 🔹 Backend
- **API Server**: Node.js with Express.js
  - Handles routing, request validation, and business logic.
  - Interfaces with OpenAI and external APIs.
  - Exposes secure REST endpoints to frontend.

### 🔹 Database
- **MongoDB** (MVP)
  - Stores itineraries, user preferences, enriched data.
  - Indexing on `userId`, `createdAt`, and `destination` for performance.

### 🔹 External APIs & Responsibilities

| API                | Purpose                                |
|--------------------|----------------------------------------|
| OpenAI             | Generates day-by-day itinerary         |
| Google Maps API    | Fetches place info, coordinates, routes |
| Rakuten Travel API | Hotel listings by location and date    |
| JMA API            | Provides weather forecast per region   |

---

## 🔁 Data Flow Overview

```
User Input → Frontend (Web/Mobile) → Express API →
→ OpenAI → [Google Maps, Rakuten, JMA] →
→ Backend Aggregation → Database Save → Frontend Display
```

---

## 🔄 Detailed Data Flow

### 1. 📥 User Input (Web/Mobile)
- User submits trip details via form.
- Data sent to `/api/itinerary`.

### 2. 🧠 Backend Processing
- Validates and constructs prompt → OpenAI
- On AI success: enrich data via:
  - **Google Maps**: coordinates, directions
  - **Rakuten Travel**: hotels near city center
  - **JMA**: forecast based on date & region

### 3. 🤖 AI Response & Enrichment
- Parse OpenAI response (JSON preferred)
- Merge enrichment data
- Format final itinerary structure

### 4. 🗃 Database Interaction
- Optionally save result to MongoDB:
  ```json
  {
    "userId": "...",
    "destination": "...",
    "aiResponse": {...},
    "enriched": { weather, maps, accommodations }
  }
  ```

### 5. 📤 Response to Frontend
- Return formatted JSON:
  - Itinerary by day
  - Weather, map, and lodging data

### 6. 🖼 Frontend Rendering
- Display via React (cards, tabs, map markers)
- Allow user to:
  - Edit
  - Save
  - Regenerate
  - Share

---

## ⚙️ Scalability Considerations

### 🧠 Performance
- Use Redis to cache repetitive location/weather API calls
- Use `Promise.all` to parallelize API fetches
- Use pagination and limits for history endpoints

### 🧱 Infrastructure
- Deploy via Render (backend) + Vercel (web)
- Use GitHub Actions for CI (tests, lint)

### 🔐 Security
- Store API keys in `.env`
- Rate-limit requests with `express-rate-limit`
- Sanitize and validate all user input

---

## 🧪 Dev Notes
- Use OpenAI’s `gpt-4` model for best structure
- Use `axios` or `node-fetch` for HTTP requests
- Plan fallback messages if any API fails (e.g. “weather unavailable”)