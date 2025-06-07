# API Design – Japan Travel Planner AI

This document outlines the backend API endpoints for itinerary generation, saving, and retrieval.

---

## Base URL

```
/api
```

---

## Endpoints

### POST `/api/itinerary`

- **Description**: Generate a trip itinerary using OpenAI and any supplied preferences.
- **Request Body**:

```json
{
  "destination": "Tokyo",
  "startDate": "2025-05-01",
  "days": 5,
  "interests": ["food", "culture"]
}
```

- **Success Response** (`200 OK`):

```json
{
  "status": "success",
  "itinerary": { "day1": [...], "day2": [...] }
}
```

- **Error Responses**:
  - `400 Bad Request`: Missing or invalid fields.
  - `500 Internal Server Error`: OpenAI API failure or timeout.

---

### POST `/api/save`

- **Description**: Save a generated itinerary to the database.
- **Request Body**:

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

- **Success Response** (`201 Created`):

```json
{
  "status": "success",
  "itineraryId": "65f9478fabc12345"
}
```

- **Error Responses**:
  - `400 Bad Request`: Incomplete or malformed request body.
  - `500 Internal Server Error`: Database failure.

---

### GET `/api/itinerary/:id`

- **Description**: Retrieve a saved itinerary by its unique ID.
- **Success Response** (`200 OK`):

```json
{
  "status": "success",
  "itinerary": {
    "destination": "Tokyo",
    "days": 5,
    "aiResponse": { "day1": [...], ... },
    "enriched": { "weather": {}, "accommodations": {} }
  }
}
```

- **Error Responses**:
  - `404 Not Found`: No itinerary exists for the given ID.
  - `500 Internal Server Error`: Database query failure.

---

## Notes

- All responses follow a consistent format for easier frontend handling.
- Error responses should include meaningful messages for debugging and user feedback.
- Consider logging all `500` errors with internal stack traces (not exposed to users).
