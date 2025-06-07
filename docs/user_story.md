# User Stories – Japan Travel Planner AI

This document outlines core user stories for the Japan Travel Planner AI app. Each story reflects a common scenario or goal, and includes clear, testable acceptance criteria for design and development.

---

### 1. AI Itinerary Generation

**As a traveler, I want to enter my destination, trip duration, and interests so that I can receive a personalized, day-by-day itinerary.**

**Acceptance Criteria:**

- The input form collects destination, number of days, and user interests (as checkboxes or tags).
- The AI responds with a structured itinerary, organized by day.
- Users receive clear feedback (such as a loading indicator) while the itinerary is being generated.

---

### 2. Cross-Platform Access

**As a traveler, I want to access my itinerary on both web and mobile devices so I can plan on desktop and navigate during the trip on my phone.**

**Acceptance Criteria:**

- Itineraries are accessible through both the React web app and React Native mobile app.
- The layout adapts responsively to different screen sizes.
- Cloud save or local sync allows users to retrieve plans on any device.

---

### 3. Weather Forecast Integration

**As a traveler, I want to see the daily weather forecast for each day of my trip so I can plan for weather-sensitive activities.**

**Acceptance Criteria:**

- Weather details are shown with each day’s itinerary.
- Forecasts are accurate and update automatically based on the trip’s start date and location.

---

### 4. Editable Itineraries

**As a traveler, I want to modify or remove activities from my itinerary so I can adjust my plans as needed.**

**Acceptance Criteria:**

- Users can add, edit, or delete any itinerary activity.
- All changes are saved and reflected in both the backend and the user interface.
- Edit mode is visually distinct from view mode for clarity.

---

### 5. Accommodation Recommendations

**As a traveler, I want to receive hotel suggestions near my destinations so I can easily plan where to stay without leaving the app.**

**Acceptance Criteria:**

- Hotel suggestions are shown either under each day or at the beginning of the itinerary.
- Hotel information includes name, price, and location.
- Results update based on the selected city or itinerary details.

---

### 6. Integrated Transit Suggestions

**As a traveler, I want to see transit routes between activities so I know how to get from one location to another efficiently.**

**Acceptance Criteria:**

- Each itinerary item displays relevant transit options when selected or expanded.
- Google Maps route previews or links are available.
- Route details include accurate distance and duration.

---

### 7. Save and Share Plans

**As a traveler, I want to save my travel plan and share it with friends or family so others can review or join the trip.**

**Acceptance Criteria:**

- Users can save plans to cloud or local storage.
- A share feature generates a short link or exports the plan to PDF.
- Shared links open in a read-only view.

---

## Target Use Cases

Below are specific scenarios that demonstrate how users might approach trip planning in the app.

---

### Use Case 1: Cultural Food Tour in Tokyo and Kyoto

A user wants to plan a 7-day trip focused on cultural landmarks and local cuisine in Tokyo and Kyoto.

- Interests: History, temples, food markets, local cuisine
- Needs: Multi-city itinerary, recommendations for cultural sites and restaurants, Shinkansen schedules

---

### Use Case 2: Family Trip to Osaka

A user is planning a 3-day family trip centered around amusement parks and fun activities in Osaka.

- Interests: Family-friendly attractions, amusement parks
- Needs: Efficient schedule, Universal Studios Japan, hotel recommendations close to activities

---

### Use Case 3: Nature Escape to Hokkaido

A user wants a 3-day trip focused on natural scenery and relaxation in Hokkaido.

- Interests: Nature, hiking, hot springs
- Needs: Suggestions for scenic parks, hiking trails, access to onsens, and timely weather updates
