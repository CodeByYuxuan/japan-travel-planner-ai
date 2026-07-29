import type { Itinerary } from "@japan-travel-planner/shared";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import type { MobileTripDataSource } from "../api/mobileApiClient";

type TripListScreenProps = {
  dataSource: MobileTripDataSource;
  isLoading?: boolean;
  trips: Itinerary[];
  onSelectTrip: (trip: Itinerary) => void;
};

function getTripCities(trip: Itinerary) {
  return [...new Set(trip.days.map((day) => day.city))].join(" / ");
}

function getActivityCount(trip: Itinerary) {
  return trip.days.reduce((total, day) => total + day.activities.length, 0);
}

export function TripListScreen({
  dataSource,
  isLoading = false,
  trips,
  onSelectTrip
}: TripListScreenProps) {
  const isOffline = dataSource === "cache";

  return (
    <FlatList
      data={trips}
      keyExtractor={(trip) => `${trip.startDate}-${trip.title}`}
      contentContainerStyle={styles.content}
      ListHeaderComponent={
        <View>
          <View style={styles.header}>
            <View style={styles.brandMark}>
              <Text style={styles.brandMarkText}>JP</Text>
            </View>
            <View style={styles.headerText}>
              <Text style={styles.eyebrow}>JAPAN TRAVEL PLANNER</Text>
              <Text accessibilityRole="header" style={styles.title}>
                Saved trips
              </Text>
              <Text style={styles.subtitle}>
                Open an itinerary to review each day and activity.
              </Text>
            </View>
          </View>
          {isOffline ? (
            <View
              accessibilityLabel="Offline cached trips"
              style={styles.notice}
            >
              <Text style={styles.noticeTitle}>OFFLINE COPY</Text>
              <Text style={styles.noticeText}>
                Showing recently opened trips saved on this device. This copy is
                read-only.
              </Text>
            </View>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Text accessibilityRole="header" style={styles.emptyTitle}>
            {isLoading
              ? "Loading saved trips"
              : isOffline
                ? "No offline trips yet"
                : "No saved trips"}
          </Text>
          <Text style={styles.emptyCopy}>
            {isLoading
              ? "Checking the available trip source."
              : isOffline
                ? "Open a trip while connected to keep a read-only copy here."
                : "Trips saved from the planner will appear here."}
          </Text>
        </View>
      }
      renderItem={({ item }) => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open ${item.title}`}
          onPress={() => onSelectTrip(item)}
          style={({ pressed }) => [
            styles.tripItem,
            pressed && styles.tripItemPressed
          ]}
        >
          <View style={styles.tripTopLine}>
            <Text style={styles.tripDates}>
              {item.startDate} to {item.endDate}
            </Text>
            <Text style={styles.openLabel}>OPEN</Text>
          </View>
          <Text style={styles.tripTitle}>{item.title}</Text>
          <Text style={styles.tripCities}>{getTripCities(item)}</Text>
          <View style={styles.tripMeta}>
            <Text style={styles.tripMetaText}>{item.days.length} days</Text>
            <View style={styles.metaDivider} />
            <Text style={styles.tripMetaText}>
              {getActivityCount(item)} activities
            </Text>
          </View>
        </Pressable>
      )}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    marginBottom: 28
  },
  notice: {
    backgroundColor: "#fff4df",
    borderColor: "#ddb568",
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    marginBottom: 18
  },
  noticeTitle: {
    color: "#7a4d00",
    fontSize: 11,
    fontWeight: "800"
  },
  noticeText: {
    color: "#654c24",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4
  },
  brandMark: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: "#d94e41",
    alignItems: "center",
    justifyContent: "center"
  },
  brandMarkText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800"
  },
  headerText: {
    flex: 1
  },
  eyebrow: {
    color: "#137a70",
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 4
  },
  title: {
    color: "#172026",
    fontSize: 28,
    fontWeight: "800"
  },
  subtitle: {
    color: "#56656f",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 6
  },
  tripItem: {
    backgroundColor: "#ffffff",
    borderColor: "#d7e0e5",
    borderWidth: 1,
    borderRadius: 8,
    padding: 18
  },
  tripItemPressed: {
    backgroundColor: "#eef6f5",
    borderColor: "#137a70"
  },
  tripTopLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12
  },
  tripDates: {
    flex: 1,
    color: "#667681",
    fontSize: 12,
    fontWeight: "700"
  },
  openLabel: {
    color: "#d94e41",
    fontSize: 11,
    fontWeight: "800"
  },
  tripTitle: {
    color: "#172026",
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 26,
    marginTop: 10
  },
  tripCities: {
    color: "#3f505a",
    fontSize: 15,
    marginTop: 8
  },
  tripMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16
  },
  tripMetaText: {
    color: "#667681",
    fontSize: 13,
    fontWeight: "600"
  },
  metaDivider: {
    width: 1,
    height: 14,
    backgroundColor: "#c6d1d7",
    marginHorizontal: 10
  },
  separator: {
    height: 14
  },
  emptyState: {
    borderTopColor: "#c6d1d7",
    borderTopWidth: 1,
    paddingVertical: 24
  },
  emptyTitle: {
    color: "#172026",
    fontSize: 20,
    fontWeight: "800"
  },
  emptyCopy: {
    color: "#56656f",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 6
  }
});
