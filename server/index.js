import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import itineraryRoutes from "./routes/itineraryRoutes.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/status", (req, res) => res.send("OK"));
app.get("/", (req, res) => res.send("✅ Backend is running!"));

app.use("/api/itinerary", itineraryRoutes);

const PORT = process.env.PORT || 3001;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ Connected to MongoDB Atlas");
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch((error) =>
    console.error("❌ MongoDB connection failed:", error.message)
  );
