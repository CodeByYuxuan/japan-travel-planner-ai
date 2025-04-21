const mongoose = require('mongoose');

const itinerarySchema = new mongoose.Schema({
    destination: String,
    days: Number,
    preferences: [String],
    content: String,
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Itinerary', itinerarySchema);
