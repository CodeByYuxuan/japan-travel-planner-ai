# System Architecture – Japan Travel Planner AI

This document outlines the core architecture, data flow, scalability considerations, and external API responsibilities for the Japan Travel Planner AI application.

---

## Major Components

### Frontend

- **Web App:** Built with React and Vite for a responsive, interactive user experience.
- **Mobile App:** Developed with React Native and Expo, with shared logic and UI principles across platforms. Interfaces use Material UI (web) and React Native Paper (mobile) for a modern, consistent look.

### Backend

- **API Server**: Node.js with Express.js
  - Manages routing, request validation, and business logic.
  - Handles integration with OpenAI and other external APIs.
  - Exposes secure REST endpoints to the frontend.

### Database

- **MongoDB** (Minimum Viable Product)
  - Stores itineraries, user preferences, and enriched travel data.
  - Indexing on `userId`, `createdAt`, and `destination` to support fast queries and analytics.

### External APIs & Responsibilities

| API/Service                       | Purpose and Integration                                                           |
| --------------------------------- | --------------------------------------------------------------------------------- |
| Hyperdia                          | Supplies real-time transportation schedules, including train and transit options  |
| Rakuten Travel API                | Delivers hotel listings and booking options based on location and travel dates    |
| JMA (Japan Meteorological Agency) | Provides regional weather forecasts for itinerary dates                           |
| Google Maps API                   | Offers place information, navigation, and visual mapping of activities and routes |
| LINE Messaging API                | Enables trip sharing and communication directly within the LINE platform          |
| OpenAI (ChatGPT)                  | Powers the AI-driven itinerary generation and personalized travel recommendations |

---

## Data Flow Overview

```
User Input → Frontend (Web/Mobile) → Express API →
→ OpenAI → [Google Maps, Hyperdia, Rakuten, JMA, LINE] →
→ Backend Aggregation → Database Save → Frontend Display
```

---

## Detailed Data Flow

### 1. User Input (Web/Mobile)

- Users submit their trip details through a structured form.
- Data is sent to the `/api/itinerary` endpoint.

### 2. Backend Processing

- The backend validates input and crafts a prompt for OpenAI.
- On receiving an itinerary from the AI, the backend enriches it by fetching:
  - Place data and directions from Google Maps.
  - Real-time transportation information from Hyperdia.
  - Hotel recommendations from Rakuten Travel.
  - Weather forecasts from JMA for the selected region and dates.
  - Optional: Enables sharing or notifications via LINE.

### 3. AI Response & Enrichment

- The OpenAI response is parsed (preferably as JSON).
- Additional data from external APIs is merged.
- The backend formats the final itinerary for display.

### 4. Database Interaction

- OResults may be stored in MongoDB, using a structure such as:
  ```json
  {
    "userId": "...",
    "destination": "...",
    "aiResponse": {...},
    "enriched": { "weather": ..., "maps": ..., "accommodations": ..., "transit": ..., "sharing": ... }
  }
  ```

### 5. Response to Frontend

- The backend returns a complete JSON object, including:
  - The day-by-day itinerary
  - Weather, maps, transit, hotel, and sharing details

### 6. Frontend Rendering

- The frontend displays results using cards, tabs, and map markers.
- Users can edit their plans, save, regenerate, or share with others as needed.

---

## Scalability Considerations

### Performance

- Cache repetitive location and weather API calls using Redis where appropriate.
- Use Promise.all to parallelize external API requests for faster response times.
- Paginate and limit results for endpoints that return history or multiple records.

### Infrastructure

- Deploy via Render (backend) + Vercel (web)
- Use GitHub Actions for CI (tests, lint)

### Security

- Store API keys in `.env`
- Rate-limit requests with `express-rate-limit`
- Sanitize and validate all user input

---

## Dev Notes

- Use OpenAI’s `gpt-3.5-turbo` model for consistent and well-structured itineraries.
- Use `axios` or `node-fetch` for HTTP requests
- Plan fallback messages if any API fails (e.g. “weather unavailable”)
