import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import type { Itinerary } from "@japan-travel-planner/shared";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { mockTrips } from "./mocks/mockTrips";
import { TripDetailScreen } from "./screens/TripDetailScreen";
import { TripListScreen } from "./screens/TripListScreen";

export default function App() {
  const [selectedTrip, setSelectedTrip] = useState<Itinerary | null>(null);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <View style={styles.app}>
          {selectedTrip ? (
            <TripDetailScreen
              trip={selectedTrip}
              onBack={() => setSelectedTrip(null)}
            />
          ) : (
            <TripListScreen trips={mockTrips} onSelectTrip={setSelectedTrip} />
          )}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f4f7f9"
  },
  app: {
    flex: 1
  }
});
