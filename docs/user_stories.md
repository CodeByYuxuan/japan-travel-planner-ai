# 📖 User Stories – Japan Travel Planner AI

These user stories describe core functionalities from the perspective of typical users of the Japan Travel Planner AI app. Each story includes clear acceptance criteria for testing and development.

---

### 1. 🧭 AI Itinerary Generation

**As a traveler, I want to enter my destination, trip duration, and interests so that I can receive a personalized day-by-day itinerary.**

**✅ Acceptance Criteria:**

- Input form accepts destination, number of days, and interest checkboxes or tags.
- AI returns an itinerary structured by day.
- User sees a loading state while itinerary is being generated.

---

### 2. 📱 Cross-Platform Access

**As a traveler, I want to access my itinerary on both web and mobile devices so I can plan on desktop and navigate during the trip on mobile.**

**✅ Acceptance Criteria:**

- Itinerary is accessible through both React Web and React Native App.
- Responsive layout adjusts to screen sizes.
- Shared storage system (e.g., cloud save or local sync) works across devices.

---

### 3. 🌦 Weather Forecast Integration

**As a traveler, I want to see daily weather forecasts for each day of my trip so I can prepare appropriate clothing and plan for weather-sensitive activities.**

**✅ Acceptance Criteria:**

- Weather appears under each day’s itinerary (with icon + temperature).
- Forecast data is accurate and updates based on start date and city.

---

### 4. 📝 Editable Itineraries

**As a traveler, I want to be able to modify or remove activities from my itinerary so I can customize my travel plans according to my preferences.**

**✅ Acceptance Criteria:**

- User can add, edit, or delete any itinerary activity.
- Changes are saved and reflected in both backend and UI.
- Edit mode is visually distinct from view mode.

---

### 5. 🏨 Accommodation Recommendations

**As a traveler, I want to receive hotel suggestions near my travel destinations so I can conveniently plan where to stay without leaving the app.**

**✅ Acceptance Criteria:**

- Hotel cards appear below each day or at the start of itinerary.
- API returns hotels with name, price, and location.
- Hotel list adapts based on selected destination city.

---

### 6. 🗺 Integrated Transit Suggestions

**As a traveler, I want the app to show me transit routes between activities so I know how to get from one location to another efficiently.**

**✅ Acceptance Criteria:**

- Each itinerary item shows transit route when clicked or expanded.
- Google Maps links or route previews are embedded.
- Distances and durations are accurate.

---

### 7. ☁️ Save & Share Plans

**As a traveler, I want to save my travel plan and share it with friends or family so they can review or join the trip.**

**✅ Acceptance Criteria:**

- “Save” button persists data to cloud/local storage.
- “Share” generates a short link or exports to PDF.
- Shared links open in read-only mode.

---

## 🎯 Target Use Cases

These examples describe specific planning scenarios the app should support.

---

### 🗾 Use Case 1: Cultural Food Tour in Tokyo + Kyoto

**User plans a 7-day trip to Tokyo and Kyoto focused on cultural landmarks and food experiences.**

- Interests: History, temples, local cuisine
- Needs: Multi-city itinerary, cultural site suggestions, food markets, Shinkansen suggestions

---

### 🎡 Use Case 2: Family Trip to Osaka

**User wants a short 3-day family trip centered around fun and theme parks in Osaka.**

- Interests: Family-friendly, amusement parks, minimal transfers
- Needs: Compact schedule, Universal Studios Japan, hotel near activities

---

### 🏞 Use Case 3: Nature Escape to Hokkaido

**User wants a 3-day scenic/nature tour in Hokkaido.**

- Interests: Natural scenery, hiking, onsens
- Needs: Recommendations for nature parks, transit to remote areas, weather alerts
