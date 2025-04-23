// TripForm component placeholder
import React, { useState } from "react";
import axios from "axios";

const TripForm = () => {
  const [form, setForm] = useState({
    destination: "",
    days: 1,
    startDate: "",
    interests: [] as string[],
  });

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
      const response = await axios.post("/api/itinerary", form);
      console.log("AI Response:", response.data);
      alert("Itinerary generated (check sonsole for now)");
    } catch (err) {
      console.error("Failed to get itinerary:", err);
      alert("Error generating itinerary");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Plan Your Japan Trip</h2>

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
        type="date"
        name="startDate"
        value={form.startDate}
        onChange={handleChange}
        required
      />

      <label>Start Data (optional):</label>
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

      <button type="submit">Generate Itinerary</button>
    </form>
  );
};

export default TripForm;
