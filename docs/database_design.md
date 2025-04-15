# 🗃 Database Design – Japan Travel Planner AI

## 📌 MongoDB Justification
Chosen for flexibility and ease of storing AI-generated content.

## 👤 User Schema
```javascript
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
});
```

## 📅 Itinerary Schema
```javascript
const ItinerarySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  destination: String,
  startDate: Date,
  days: Number,
  preferences: [String],
  aiResponse: mongoose.Schema.Types.Mixed,
  enriched: mongoose.Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now },
});
```