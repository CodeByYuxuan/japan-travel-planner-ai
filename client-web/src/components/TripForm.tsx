// TripForm component fixed to use api.ts
import React, { useState } from "react";
import api from "../services/api";
import { useNavigate } from "react-router-dom";

const TripForm: React.FC = () => {
  const [form, setForm] = useState({
    destination: "",
    days: 1,
    startDate: "",
    interests: [] as string[],
  });

  const navigate = useNavigate();
  const interestsList = ["Food", "Culture", "Nature", "Shopping", "History"];

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleCheckbox = (interest: string) => {
    setForm((prev) => {
      const alreadySelected = prev.interests.includes(interest);
      return {
        ...prev,
        interests: alreadySelected
          ? prev.interests.filter((i) => i !== interest)
          : [...prev.interests, interest],
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await api.post("/itinerary", {
        destination: form.destination,
        days: form.days,
        preferences: form.interests,
        startDate: form.startDate,
      });

      console.log("📦 Backend response:", response.data);
      localStorage.setItem("itinerary", JSON.stringify(response.data));
      navigate("/results"); // navigates to results page
    } catch (error) {
      console.error("❌ Error fetching itinerary:", error);
      alert("Something went wrong. Please try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Plan Your Japan Trip 🇯🇵</h2>

      <label>Destination:</label>
      <input
        type="text"
        name="destination"
        value={form.destination}
        onChange={handleChange}
        required
      />

      <label>Number of Days:</label>
      <input
        type="number"
        name="days"
        min={1}
        max={30}
        value={form.days}
        onChange={handleChange}
        required
      />

      <label>Start Date (optional):</label>
      <input
        type="date"
        name="startDate"
        value={form.startDate}
        onChange={handleChange}
      />

      <label>Interests:</label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
        {interestsList.map((interest) => (
          <label key={interest}>
            <input
              type="checkbox"
              checked={form.interests.includes(interest)}
              onChange={() => handleCheckbox(interest)}
            />
            {interest}
          </label>
        ))}
      </div>

      <button type="submit" style={{ marginTop: "1rem" }}>
        Generate Itinerary
      </button>
    </form>
  );
};

export default TripForm;
// Note: The above code assumes that the API endpoint is set up to handle the POST request at "/itinerary".
