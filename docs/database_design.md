# Database Design – Japan Travel Planner AI

This document outlines the MongoDB schema structure used for the MVP. MongoDB was selected due to its flexible document-based format, which is ideal for storing varied and AI-generated data structures.

---

## Why MongoDB?

- The schemaless design supports fast prototyping and future changes without friction.
- Supports storing nested, semi-structured AI responses.
- Works well with Mongoose for schema enforcement and querying.

---

## User Schema

```javascript
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
});
```

**Notes:**

- `email` is required and unique to allow for future login/share features.
- `createdAt` helps track user registration or guest session timing.

---

## Itinerary Schema

```javascript
const ItinerarySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  destination: { type: String, required: true },
  startDate: { type: Date, required: true },
  days: { type: Number, required: true, min: 1 },
  preferences: [{ type: String }],
  aiResponse: { type: mongoose.Schema.Types.Mixed },
  enriched: {
    weather: { type: Object },
    accommodations: { type: Object },
    maps: { type: Object },
  },
  createdAt: { type: Date, default: Date.now },
});
```

**Notes:**

- `preferences` allows for rich customization like ["culture", "food"].
- `aiResponse` is kept as `Mixed` to accept either stringified JSON or structured objects returned by OpenAI.
- `enriched` captures the enhanced details like weather and map data, and is structured for optional usage by the frontend.
- `createdAt` lets users browse, sort, or manage itineraries by date.

---

## Usage Example

```json
{
  "userId": "607c35c3e7f6a7433c9d55b2",
  "destination": "Kyoto",
  "startDate": "2025-04-25",
  "days": 3,
  "preferences": ["nature", "temples"],
  "aiResponse": { "day1": ["Visit Kiyomizu-dera", "Eat matcha ice cream"] },
  "enriched": {
    "weather": { "day1": "Sunny", "day2": "Cloudy" },
    "accommodations": { "kyoto": ["Kyoto Guest House", "Hotel Granvia"] },
    "maps": { "day1": { "Fushimi Inari": [135.7727, 34.9671] } }
  }
}
```

---

## Validation & Maintenance Notes

- Use Joi or Mongoose built-in validation to keep incoming requests safe and predictable.
- Add indexes on `userId`, `destination`, and `createdAt` for faster lookups and reporting.
- For long-term scale, consider archiving or compressing the `aiResponse` and `enriched` fields if payloads grow large.
