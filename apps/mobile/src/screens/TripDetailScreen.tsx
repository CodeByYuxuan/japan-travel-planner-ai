import type { Activity, Itinerary } from "@japan-travel-planner/shared";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

type TripDetailScreenProps = {
  trip: Itinerary;
  onBack: () => void;
};

function formatTiming(activity: Activity) {
  const { startTime, endTime, timeOfDay } = activity.timing;

  if (startTime && endTime) {
    return `${startTime} - ${endTime}`;
  }

  return startTime ?? timeOfDay ?? "Flexible";
}

function formatCostLevel(costLevel: Activity["costLevel"]) {
  return costLevel === "free"
    ? "Free"
    : `${costLevel.charAt(0).toUpperCase()}${costLevel.slice(1)} cost`;
}

export function TripDetailScreen({ trip, onBack }: TripDetailScreenProps) {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back to saved trips"
        onPress={onBack}
        style={({ pressed }) => [
          styles.backButton,
          pressed && styles.backButtonPressed
        ]}
      >
        <Text style={styles.backButtonText}>Back to trips</Text>
      </Pressable>

      <Text style={styles.eyebrow}>SAVED ITINERARY</Text>
      <Text accessibilityRole="header" style={styles.title}>
        {trip.title}
      </Text>
      <Text style={styles.dateRange}>
        {trip.startDate} to {trip.endDate}
      </Text>

      <View style={styles.summaryBand}>
        <View>
          <Text style={styles.summaryValue}>{trip.days.length}</Text>
          <Text style={styles.summaryLabel}>DAYS</Text>
        </View>
        <View style={styles.summaryRule} />
        <View style={styles.summaryTextGroup}>
          <Text style={styles.summaryValue}>
            {trip.days.reduce((total, day) => total + day.activities.length, 0)}
          </Text>
          <Text style={styles.summaryLabel}>ACTIVITIES</Text>
        </View>
      </View>

      {trip.days.map((day, dayIndex) => (
        <View
          key={`${day.date}-${day.city}`}
          accessibilityLabel={`Day ${dayIndex + 1}: ${day.city}`}
          style={styles.day}
        >
          <Text style={styles.dayDate}>{day.date}</Text>
          <Text accessibilityRole="header" style={styles.dayTitle}>
            Day {dayIndex + 1}: {day.city}
          </Text>
          {day.summary ? (
            <Text style={styles.daySummary}>{day.summary}</Text>
          ) : null}
          {day.weatherSummary ? (
            <Text style={styles.weather}>{day.weatherSummary}</Text>
          ) : null}

          <View style={styles.activityList}>
            {day.activities.map((activity) => (
              <View
                key={
                  activity.id ?? `${activity.title}-${formatTiming(activity)}`
                }
                style={styles.activity}
              >
                <View style={styles.activityTopLine}>
                  <Text style={styles.activityTime}>
                    {formatTiming(activity)}
                  </Text>
                  <Text style={styles.activityCategory}>
                    {activity.category.toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.activityTitle}>{activity.title}</Text>
                <Text style={styles.location}>
                  {activity.location.name}
                  {activity.location.city ? `, ${activity.location.city}` : ""}
                </Text>
                <View style={styles.activityMeta}>
                  <Text style={styles.activityMetaText}>
                    {activity.durationMinutes} min
                  </Text>
                  <Text style={styles.activityMetaText}>
                    {formatCostLevel(activity.costLevel)}
                  </Text>
                </View>
                <Text style={styles.notes}>{activity.notes}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36
  },
  backButton: {
    alignSelf: "flex-start",
    borderColor: "#9cb0bb",
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 24
  },
  backButtonPressed: {
    backgroundColor: "#e7efef"
  },
  backButtonText: {
    color: "#264d55",
    fontSize: 14,
    fontWeight: "700"
  },
  eyebrow: {
    color: "#d94e41",
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 6
  },
  title: {
    color: "#172026",
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 34
  },
  dateRange: {
    color: "#56656f",
    fontSize: 15,
    marginTop: 8
  },
  summaryBand: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e7efef",
    borderRadius: 8,
    padding: 18,
    marginTop: 24
  },
  summaryRule: {
    width: 1,
    alignSelf: "stretch",
    backgroundColor: "#b9c9ce",
    marginHorizontal: 24
  },
  summaryTextGroup: {
    flex: 1
  },
  summaryValue: {
    color: "#172026",
    fontSize: 22,
    fontWeight: "800"
  },
  summaryLabel: {
    color: "#667681",
    fontSize: 10,
    fontWeight: "800",
    marginTop: 2
  },
  day: {
    borderTopColor: "#c6d1d7",
    borderTopWidth: 1,
    marginTop: 30,
    paddingTop: 22
  },
  dayDate: {
    color: "#d94e41",
    fontSize: 12,
    fontWeight: "800"
  },
  dayTitle: {
    color: "#172026",
    fontSize: 23,
    fontWeight: "800",
    marginTop: 4
  },
  daySummary: {
    color: "#3f505a",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10
  },
  weather: {
    color: "#137a70",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10
  },
  activityList: {
    gap: 12,
    marginTop: 18
  },
  activity: {
    backgroundColor: "#ffffff",
    borderColor: "#d7e0e5",
    borderLeftColor: "#137a70",
    borderWidth: 1,
    borderLeftWidth: 4,
    borderRadius: 8,
    padding: 16
  },
  activityTopLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12
  },
  activityTime: {
    color: "#137a70",
    fontSize: 13,
    fontWeight: "800"
  },
  activityCategory: {
    color: "#667681",
    fontSize: 10,
    fontWeight: "800"
  },
  activityTitle: {
    color: "#172026",
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 23,
    marginTop: 9
  },
  location: {
    color: "#3f505a",
    fontSize: 14,
    marginTop: 7
  },
  activityMeta: {
    flexDirection: "row",
    gap: 14,
    marginTop: 12
  },
  activityMetaText: {
    color: "#667681",
    fontSize: 12,
    fontWeight: "700"
  },
  notes: {
    color: "#56656f",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12
  }
});
