// TripForm component placeholder
import React from 'react';

const TripForm = () => {
  return (
    <form>
      <h2>Plan Your Trip</h2>
      <input type="text" placeholder="Destination" />
      <input type="number" placeholder="Number of days" />
      <input type="text" placeholder="Interests (comma separated)" />
      <button type="submit">Generate Itinerary</button>
    </form>
  );
};

export default TripForm;