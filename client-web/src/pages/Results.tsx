import React, { useEffect, useState } from "react";

const Results: React.FC = () => {
  const [itinerary, setItinerary] = useState("");

  useEffect(() => {
    const storedItinerary = localStorage.getItem("itinerary");
    if (storedItinerary) {
      const data = JSON.parse(storedItinerary);
      setItinerary(data.itinerary);
    }
  }, []);

  return (
    <div>
      <h2>Your Generated Itinerary</h2>
      <pre>{itinerary}</pre>
    </div>
  );
};

export default Results;
