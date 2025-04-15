# 🏗 System Architecture – Japan Travel Planner AI

This document outlines the core architecture and data flow of the Japan Travel Planner AI application.

---

## 🧩 Major Components

### 🔹 Frontend

- **Web App**: Built with React + Vite
- **Mobile App**: Built with React Native + Expo

### 🔹 Backend

- **API Server**: Node.js with Express.js
- Handles routing, data processing, and integration with external APIs

### 🔹 Database

- **MongoDB or PostgreSQL**
- Stores saved itineraries, user inputs, and metadata

### 🔹 External APIs

- **OpenAI API** – Generates AI itineraries
- **Google Maps API** – Maps, Places, and Directions
- **Rakuten Travel API** – Hotel recommendations
- **JMA Weather API** – Weather forecasts

---

## 🔁 Data Flow Overview

```
User Input → Frontend (Web/Mobile) → Express API →
→ AI + External APIs (OpenAI, Google, Rakuten, JMA) →
→ Backend processing → Frontend display
```

---

## 🔄 Detailed Data Flow

This section describes how user data moves through the system from input to final output.

### 1. 📥 User Input (Web/Mobile)

- User enters trip details such as:

  - Destination (e.g., Kyoto)
  - Trip Duration (e.g., 5 days)
  - Interests (e.g., culture, food, nature)
  - Optional travel dates

- This data is submitted via a form to the backend API:
  ```
  POST /api/itinerary
  ```

---

### 2. 🧠 Backend Processing (Express.js)

- The backend validates the input and formats it into a prompt.
- The prompt is sent to **OpenAI API** to generate a raw itinerary.
- Optionally, it enriches the itinerary with external data from:
  - **Google Maps API** – Place details, coordinates
  - **Rakuten Travel API** – Accommodation suggestions
  - **JMA API** – Weather forecast by city/date

---

### 3. 🤖 AI Response & Enrichment

- The AI responds with a day-by-day itinerary (text or structured JSON).
- Backend optionally:
  - Parses and formats the text
  - Queries Google Maps for coordinates and routing
  - Gets weather for each day from JMA
  - Fetches hotel data from Rakuten

---

### 4. 🗃 Database Interaction (Optional)

- If user wants to save the itinerary, backend stores it in:
  - **MongoDB** or **PostgreSQL**
- Schema includes:
  - userId, trip details, structured itinerary JSON, timestamp

---

### 5. 📤 Response to Frontend

- Aggregated and enriched itinerary is returned to the frontend.
- JSON format includes:
  - Days and activities
  - Location info (coordinates, map links)
  - Weather forecast
  - Accommodation options

---

### 6. 🖼 Frontend Display

- Web and Mobile apps render:
  - Day-by-day schedule cards
  - Weather info
  - Hotel suggestions
  - Map view (optional)
  - Buttons for edit, regenerate, save, or share
