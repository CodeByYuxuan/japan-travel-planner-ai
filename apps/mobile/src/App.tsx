import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import type { Itinerary } from "@japan-travel-planner/shared";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import {
  mobileApiClient,
  type MobileApiClient,
  type MobileTripDataSource
} from "./api/mobileApiClient";
import { TripDetailScreen } from "./screens/TripDetailScreen";
import { TripListScreen } from "./screens/TripListScreen";

type AppProps = {
  client?: MobileApiClient;
};

export function AppView({ client = mobileApiClient }: AppProps) {
  const [selectedTrip, setSelectedTrip] = useState<Itinerary | null>(null);
  const [trips, setTrips] = useState<Itinerary[]>([]);
  const [dataSource, setDataSource] = useState<MobileTripDataSource>("preview");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    void client.listTrips().then((result) => {
      if (!isActive) {
        return;
      }

      setTrips(result.trips);
      setDataSource(result.source);
      setIsLoading(false);
    });

    return () => {
      isActive = false;
    };
  }, [client]);

  function openTrip(trip: Itinerary) {
    setSelectedTrip(trip);
    void client.cacheOpenedTrip(trip).catch(() => undefined);
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <View style={styles.app}>
          {selectedTrip ? (
            <TripDetailScreen
              dataSource={dataSource}
              trip={selectedTrip}
              onBack={() => setSelectedTrip(null)}
            />
          ) : (
            <TripListScreen
              dataSource={dataSource}
              isLoading={isLoading}
              trips={trips}
              onSelectTrip={openTrip}
            />
          )}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

export default function App() {
  return <AppView />;
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
