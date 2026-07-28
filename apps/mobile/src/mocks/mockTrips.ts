import type { Itinerary } from "@japan-travel-planner/shared";

export const mockTrips = [
  {
    title: "Tokyo And Kyoto Spring Highlights",
    startDate: "2026-04-06",
    endDate: "2026-04-08",
    days: [
      {
        date: "2026-04-06",
        city: "Tokyo",
        summary:
          "Cherry blossoms, classic market food, and an old-town temple district.",
        weatherSummary: "Mild spring weather; bring a light evening layer.",
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
              city: "Tokyo"
            },
            costLevel: "free",
            notes:
              "Start early for quieter paths and seasonal blossoms around Shinobazu Pond."
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
              city: "Tokyo"
            },
            costLevel: "free",
            notes:
              "Leave time for the calmer side streets after the temple approach."
          }
        ]
      },
      {
        date: "2026-04-07",
        city: "Kyoto",
        summary:
          "Eastern Kyoto temples, market snacks, and an evening walk through Gion.",
        weatherSummary: "Comfortable daytime temperatures with a cool evening.",
        activities: [
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
              city: "Kyoto"
            },
            costLevel: "low",
            notes:
              "Approach through Sannenzaka and keep the schedule loose for crowds."
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
              city: "Kyoto"
            },
            costLevel: "free",
            notes:
              "Keep photos respectful and avoid blocking narrow lanes or entrances."
          }
        ]
      },
      {
        date: "2026-04-08",
        city: "Kyoto",
        summary:
          "An early shrine walk followed by western Kyoto scenery and dinner.",
        weatherSummary: "Good walking weather; carry water for the shrine.",
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
              city: "Kyoto"
            },
            costLevel: "free",
            notes:
              "Go early for quieter torii gates and turn back at a comfortable point."
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
              city: "Kyoto"
            },
            costLevel: "medium",
            notes:
              "Choose a restaurant with posted prices and reserve a riverside spot."
          }
        ]
      }
    ]
  },
  {
    title: "Osaka Food And Hiroshima History",
    startDate: "2026-10-12",
    endDate: "2026-10-13",
    days: [
      {
        date: "2026-10-12",
        city: "Osaka",
        summary:
          "A neighborhood-focused day built around Osaka's markets and castle park.",
        activities: [
          {
            id: "osaka-castle",
            title: "Osaka Castle Park walk",
            category: "sightseeing",
            timing: {
              startTime: "09:30",
              endTime: "11:00",
              timeOfDay: "morning"
            },
            durationMinutes: 90,
            location: {
              name: "Osaka Castle Park",
              address: "1-1 Osakajo, Chuo Ward, Osaka",
              city: "Osaka"
            },
            costLevel: "free",
            notes:
              "Walk the outer grounds first and decide on the museum based on queues."
          },
          {
            id: "osaka-kuromon",
            title: "Kuromon Market lunch",
            category: "food",
            timing: {
              startTime: "12:00",
              endTime: "13:30",
              timeOfDay: "afternoon"
            },
            durationMinutes: 90,
            location: {
              name: "Kuromon Ichiba Market",
              address: "Nipponbashi, Chuo Ward, Osaka",
              city: "Osaka"
            },
            costLevel: "medium",
            notes:
              "Share small portions so there is room for several local specialties."
          }
        ]
      },
      {
        date: "2026-10-13",
        city: "Hiroshima",
        summary:
          "A reflective visit to central Hiroshima followed by the waterfront.",
        activities: [
          {
            id: "hiroshima-peace-park",
            title: "Peace Memorial Park and museum",
            category: "culture",
            timing: {
              startTime: "10:00",
              endTime: "12:30",
              timeOfDay: "morning"
            },
            durationMinutes: 150,
            location: {
              name: "Hiroshima Peace Memorial Park",
              address: "1 Nakajimacho, Naka Ward, Hiroshima",
              city: "Hiroshima"
            },
            costLevel: "low",
            notes:
              "Allow unhurried time for the exhibits and quiet areas of the park."
          },
          {
            id: "hiroshima-okonomiyaki",
            title: "Hiroshima-style okonomiyaki dinner",
            category: "food",
            timing: {
              startTime: "18:00",
              endTime: "19:30",
              timeOfDay: "evening"
            },
            durationMinutes: 90,
            location: {
              name: "Okonomimura",
              address: "5-13 Shintenchi, Naka Ward, Hiroshima",
              city: "Hiroshima"
            },
            costLevel: "medium",
            notes:
              "Choose a counter with open seats and watch the layered preparation."
          }
        ]
      }
    ]
  }
] satisfies Itinerary[];
