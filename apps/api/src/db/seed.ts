import { prisma } from "./client.js";

const seedUserSessionId = "seed-local-traveler";
const seedTripId = "seed-tokyo-kyoto-spring";

async function main() {
  const user = await prisma.user.upsert({
    where: {
      anonymousSessionId: seedUserSessionId
    },
    update: {
      displayName: "Local Seed Traveler"
    },
    create: {
      anonymousSessionId: seedUserSessionId,
      displayName: "Local Seed Traveler"
    }
  });

  await prisma.trip.deleteMany({
    where: {
      id: seedTripId
    }
  });

  await prisma.trip.create({
    data: {
      id: seedTripId,
      userId: user.id,
      title: "Tokyo And Kyoto Spring Highlights",
      cities: ["Tokyo", "Kyoto"],
      startDate: new Date("2026-04-06"),
      endDate: new Date("2026-04-08"),
      pace: "balanced",
      budget: "moderate",
      interests: ["temples", "local food", "gardens"],
      constraints: ["Avoid late-night activities"],
      days: {
        create: [
          {
            date: new Date("2026-04-06"),
            city: "Tokyo",
            summary:
              "Ease into Tokyo with classic neighborhoods and food stops.",
            orderIndex: 0,
            activities: {
              create: [
                {
                  title: "Explore Senso-ji And Nakamise-dori",
                  category: "culture",
                  startTime: "09:30",
                  durationMinutes: 120,
                  locationName: "Senso-ji",
                  locationAddress: "2 Chome-3-1 Asakusa, Taito City, Tokyo",
                  locationCity: "Tokyo",
                  costLevel: "free",
                  notes:
                    "Arrive early for lighter crowds around the main hall.",
                  orderIndex: 0
                },
                {
                  title: "Lunch Around Ueno Ameyoko",
                  category: "food",
                  startTime: "12:30",
                  durationMinutes: 90,
                  locationName: "Ameya-Yokocho",
                  locationCity: "Tokyo",
                  costLevel: "medium",
                  notes:
                    "Good area for casual seafood bowls and street snacks.",
                  orderIndex: 1
                }
              ]
            }
          },
          {
            date: new Date("2026-04-07"),
            city: "Kyoto",
            summary: "Focus on Kyoto's eastern temples and old streets.",
            orderIndex: 1,
            activities: {
              create: [
                {
                  title: "Kiyomizu-dera Morning Visit",
                  category: "culture",
                  startTime: "09:00",
                  durationMinutes: 120,
                  locationName: "Kiyomizu-dera",
                  locationAddress:
                    "1 Chome-294 Kiyomizu, Higashiyama Ward, Kyoto",
                  locationCity: "Kyoto",
                  costLevel: "low",
                  notes:
                    "Walk down Sannenzaka afterward for shops and tea houses.",
                  orderIndex: 0
                },
                {
                  title: "Gion Evening Walk",
                  category: "sightseeing",
                  startTime: "17:00",
                  durationMinutes: 90,
                  locationName: "Gion",
                  locationCity: "Kyoto",
                  costLevel: "free",
                  notes:
                    "Keep the route relaxed and respectful around private lanes.",
                  orderIndex: 1
                }
              ]
            }
          }
        ]
      },
      shareLinks: {
        create: {
          token: "seed-tokyo-kyoto-spring",
          permission: "read_only"
        }
      }
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
