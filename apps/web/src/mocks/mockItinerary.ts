import type { Itinerary } from "../../../../packages/shared/src/schemas/itinerary.js";

import { mockTripRequest } from "./mockTripRequest.js";

export const mockItinerary = {
  title: "Tokyo And Kyoto Spring Highlights",
  startDate: mockTripRequest.startDate,
  endDate: mockTripRequest.endDate,
  days: [
    {
      date: "2026-04-06",
      city: "Tokyo",
      summary:
        "Ease into Tokyo with cherry blossoms, classic market food, and an old-town temple district.",
      weatherSummary: "Mild spring weather; bring a light jacket for evening.",
      activities: [
        {
          id: "tokyo-ueno-park",
          title: "Morning walk through Ueno Park",
          category: "nature",
          timing: {
            startTime: "09:00",
            endTime: "10:30",
            timeOfDay: "morning"
          },
          durationMinutes: 90,
          location: {
            name: "Ueno Park",
            address: "Uenokoen, Taito City, Tokyo",
            city: "Tokyo",
            latitude: 35.7156,
            longitude: 139.7745,
            mapUrl: "https://www.google.com/maps/search/?api=1&query=Ueno%20Park%20Tokyo"
          },
          costLevel: "free",
          notes:
            "Start early for quieter paths and seasonal blossoms around Shinobazu Pond."
        },
        {
          id: "tokyo-ameyoko-lunch",
          title: "Ameyoko lunch crawl",
          category: "food",
          timing: {
            startTime: "11:00",
            endTime: "12:30",
            timeOfDay: "morning"
          },
          durationMinutes: 90,
          location: {
            name: "Ameya-Yokocho Market",
            address: "4 Chome Ueno, Taito City, Tokyo",
            city: "Tokyo",
            latitude: 35.7101,
            longitude: 139.7747,
            mapUrl: "https://www.google.com/maps/search/?api=1&query=Ameyoko%20Tokyo"
          },
          costLevel: "low",
          notes:
            "Sample small bites instead of one heavy lunch so the afternoon stays flexible."
        },
        {
          id: "tokyo-sensoji",
          title: "Senso-ji and Nakamise-dori",
          category: "culture",
          timing: {
            startTime: "14:00",
            endTime: "16:00",
            timeOfDay: "afternoon"
          },
          durationMinutes: 120,
          location: {
            name: "Senso-ji",
            address: "2 Chome-3-1 Asakusa, Taito City, Tokyo",
            city: "Tokyo",
            latitude: 35.7148,
            longitude: 139.7967,
            mapUrl: "https://www.google.com/maps/search/?api=1&query=Senso-ji%20Tokyo"
          },
          costLevel: "free",
          notes:
            "Leave time for side streets after the temple approach; they are calmer than Nakamise-dori."
        },
        {
          id: "tokyo-skytree",
          title: "Tokyo Skytree sunset viewpoint",
          category: "sightseeing",
          timing: {
            startTime: "17:30",
            endTime: "19:00",
            timeOfDay: "evening"
          },
          durationMinutes: 90,
          location: {
            name: "Tokyo Skytree",
            address: "1 Chome-1-2 Oshiage, Sumida City, Tokyo",
            city: "Tokyo",
            latitude: 35.7101,
            longitude: 139.8107,
            mapUrl: "https://www.google.com/maps/search/?api=1&query=Tokyo%20Skytree"
          },
          costLevel: "high",
          notes:
            "Book ahead if the forecast is clear; otherwise keep this as a flexible evening option."
        }
      ]
    },
    {
      date: "2026-04-07",
      city: "Kyoto",
      summary:
        "Transfer to Kyoto, then focus on eastern temples, market snacks, and an atmospheric evening walk.",
      weatherSummary: "Comfortable daytime temperatures with a cooler evening in Gion.",
      activities: [
        {
          id: "kyoto-shinkansen-transfer",
          title: "Tokaido Shinkansen to Kyoto",
          category: "transit",
          timing: {
            startTime: "08:30",
            endTime: "10:50",
            timeOfDay: "morning"
          },
          durationMinutes: 140,
          location: {
            name: "Tokyo Station to Kyoto Station",
            city: "Tokyo",
            mapUrl: "https://www.google.com/maps/search/?api=1&query=Tokyo%20Station%20to%20Kyoto%20Station"
          },
          costLevel: "high",
          notes:
            "Reserve seats on the right side if Mount Fuji visibility matters, then store luggage near Kyoto Station."
        },
        {
          id: "kyoto-kiyomizudera",
          title: "Kiyomizu-dera temple visit",
          category: "culture",
          timing: {
            startTime: "12:30",
            endTime: "14:30",
            timeOfDay: "afternoon"
          },
          durationMinutes: 120,
          location: {
            name: "Kiyomizu-dera",
            address: "1 Chome-294 Kiyomizu, Higashiyama Ward, Kyoto",
            city: "Kyoto",
            latitude: 34.9949,
            longitude: 135.785,
            mapUrl: "https://www.google.com/maps/search/?api=1&query=Kiyomizu-dera%20Kyoto"
          },
          costLevel: "low",
          notes:
            "Approach through Sannenzaka for historic lanes, but keep the schedule loose for crowds."
        },
        {
          id: "kyoto-nishiki-market",
          title: "Nishiki Market snack break",
          category: "food",
          timing: {
            startTime: "15:30",
            endTime: "16:45",
            timeOfDay: "afternoon"
          },
          durationMinutes: 75,
          location: {
            name: "Nishiki Market",
            address: "Nishikikoji-dori, Nakagyo Ward, Kyoto",
            city: "Kyoto",
            latitude: 35.005,
            longitude: 135.7647,
            mapUrl: "https://www.google.com/maps/search/?api=1&query=Nishiki%20Market%20Kyoto"
          },
          costLevel: "medium",
          notes:
            "Pick a few small plates and avoid eating while walking where shop signs ask visitors not to."
        },
        {
          id: "kyoto-gion-evening",
          title: "Gion and Shirakawa evening walk",
          category: "sightseeing",
          timing: {
            startTime: "18:00",
            endTime: "19:30",
            timeOfDay: "evening"
          },
          durationMinutes: 90,
          location: {
            name: "Gion Shirakawa",
            address: "Motoyoshicho, Higashiyama Ward, Kyoto",
            city: "Kyoto",
            latitude: 35.0054,
            longitude: 135.7754,
            mapUrl: "https://www.google.com/maps/search/?api=1&query=Gion%20Shirakawa%20Kyoto"
          },
          costLevel: "free",
          notes:
            "Keep photos respectful and avoid blocking narrow lanes or private entrances."
        }
      ]
    },
    {
      date: "2026-04-08",
      city: "Kyoto",
      summary:
        "Use an early start for shrine paths, then balance western Kyoto scenery with a golden temple stop.",
      weatherSummary: "Good walking day; carry water for the shrine and bamboo grove.",
      activities: [
        {
          id: "kyoto-fushimi-inari",
          title: "Fushimi Inari early shrine walk",
          category: "culture",
          timing: {
            startTime: "07:30",
            endTime: "09:30",
            timeOfDay: "morning"
          },
          durationMinutes: 120,
          location: {
            name: "Fushimi Inari Taisha",
            address: "68 Fukakusa Yabunouchicho, Fushimi Ward, Kyoto",
            city: "Kyoto",
            latitude: 34.9671,
            longitude: 135.7727,
            mapUrl: "https://www.google.com/maps/search/?api=1&query=Fushimi%20Inari%20Taisha"
          },
          costLevel: "free",
          notes:
            "Go early for quieter torii gates and turn back at a comfortable point instead of rushing the full mountain."
        },
        {
          id: "kyoto-arashiyama",
          title: "Arashiyama bamboo grove and riverside",
          category: "nature",
          timing: {
            startTime: "11:00",
            endTime: "13:00",
            timeOfDay: "morning"
          },
          durationMinutes: 120,
          location: {
            name: "Arashiyama Bamboo Grove",
            address: "Sagaogurayama Tabuchiyamacho, Ukyo Ward, Kyoto",
            city: "Kyoto",
            latitude: 35.017,
            longitude: 135.671,
            mapUrl: "https://www.google.com/maps/search/?api=1&query=Arashiyama%20Bamboo%20Grove"
          },
          costLevel: "free",
          notes:
            "Pair the grove with a short riverside walk rather than overloading the west side of Kyoto."
        },
        {
          id: "kyoto-kinkakuji",
          title: "Kinkaku-ji afternoon visit",
          category: "culture",
          timing: {
            startTime: "14:30",
            endTime: "15:45",
            timeOfDay: "afternoon"
          },
          durationMinutes: 75,
          location: {
            name: "Kinkaku-ji",
            address: "1 Kinkakujicho, Kita Ward, Kyoto",
            city: "Kyoto",
            latitude: 35.0394,
            longitude: 135.7292,
            mapUrl: "https://www.google.com/maps/search/?api=1&query=Kinkaku-ji%20Kyoto"
          },
          costLevel: "low",
          notes:
            "The garden loop is one-way, so pause for photos before moving past the pond viewpoint."
        },
        {
          id: "kyoto-pontocho-dinner",
          title: "Pontocho dinner lane",
          category: "food",
          timing: {
            startTime: "18:00",
            endTime: "20:00",
            timeOfDay: "evening"
          },
          durationMinutes: 120,
          location: {
            name: "Pontocho Alley",
            address: "Pontocho, Nakagyo Ward, Kyoto",
            city: "Kyoto",
            latitude: 35.0066,
            longitude: 135.7704,
            mapUrl: "https://www.google.com/maps/search/?api=1&query=Pontocho%20Kyoto"
          },
          costLevel: "medium",
          notes:
            "Choose a restaurant with posted prices and reserve if you want a specific riverside spot."
        }
      ]
    }
  ]
} satisfies Itinerary;
