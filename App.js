import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert, StyleSheet } from "react-native";
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getFirestore, collection, addDoc } from "firebase/firestore";
import * as Health from "expo-health";

const firebaseConfig = {
  apiKey: "AIzaSyCS9OcckFBy2UbUGEn-Knp_TARNy8EBf5w",
  authDomain: "shoe-tracker-10000.firebaseapp.com",
  projectId: "shoe-tracker-10000",
  storageBucket: "shoe-tracker-10000.firebasestorage.app",
  messagingSenderId: "23538109201",
  appId: "1:23538109201:web:c468a2c92fa34817f19ab0",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export default function App() {
  const [syncedWorkouts, setSyncedWorkouts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      const userCred = await signInAnonymously(auth);
      setUserId(userCred.user.uid);
      console.log("Firebase auth initialized");
    } catch (error) {
      console.error("Auth error:", error);
    }
  };

  const requestHealthKitPermission = async () => {
    try {
      const results = await Health.requestPermissionsAsync([
        { resourceType: Health.ActivityType.RUNNING, accessLevel: Health.AccessLevel.READ },
        { resourceType: Health.ActivityType.WALKING, accessLevel: Health.AccessLevel.READ },
        { resourceType: Health.ActivityType.HIKING, accessLevel: Health.AccessLevel.READ },
      ]);
      
      if (results.every(r => r)) {
        setAuthorized(true);
        Alert.alert("Success", "Apple Health permissions granted!");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to request permissions: " + error.message);
    }
  };

  const syncWorkouts = async () => {
    if (!authorized) {
      Alert.alert("Error", "Please authorize HealthKit access first");
      return;
    }

    if (!userId) {
      Alert.alert("Error", "User not authenticated");
      return;
    }

    setLoading(true);
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const activities = [
        { type: Health.ActivityType.RUNNING, label: "Run" },
        { type: Health.ActivityType.WALKING, label: "Walk" },
        { type: Health.ActivityType.HIKING, label: "Hike" },
      ];

      let newWorkouts = [];

      for (const activity of activities) {
        const samples = await Health.getActivitySamplesAsync(
          activity.type,
          thirtyDaysAgo,
          now
        );

        for (const sample of samples) {
          if (sample.distance > 0) {
            const miles = (sample.distance * 0.000621371).toFixed(2);
            
            await addDoc(collection(db, "users", userId, "health-workouts"), {
              type: activity.label,
              distance: parseFloat(miles),
              date: new Date(sample.startDate).toISOString().split("T")[0],
              duration: sample.duration,
              calories: sample.calories || 0,
              source: "Apple Health",
              importedAt: new Date().toISOString(),
            });

            newWorkouts.push({
              type: activity.label,
              distance: miles,
              date: new Date(sample.startDate).toLocaleDateString(),
            });
          }
        }
      }

      setSyncedWorkouts(newWorkouts);
      Alert.alert("Success", `Synced ${newWorkouts.length} workouts from Apple Health!`);
    } catch (error) {
      Alert.alert("Error", "Failed to sync workouts: " + error.message);
      console.error("Sync error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>SHOE TRACKER</Text>
        <Text style={styles.subtitle}>Apple Health Sync</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, !authorized && styles.buttonPrimary]} 
          onPress={requestHealthKitPermission}
          disabled={authorized}
        >
          <Text style={styles.buttonText}>
            {authorized ? "✓ AUTHORIZED" : "AUTHORIZE HEALTH"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.buttonPrimary]}
          onPress={syncWorkouts}
          disabled={!authorized || loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "SYNCING..." : "SYNC WORKOUTS"}
          </Text>
        </TouchableOpacity>
      </View>

      {syncedWorkouts.length > 0 && (
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsTitle}>SYNCED WORKOUTS ({syncedWorkouts.length})</Text>
          {syncedWorkouts.map((workout, index) => (
            <View key={index} style={styles.workoutItem}>
              <Text style={styles.workoutType}>{workout.type}</Text>
              <Text style={styles.workoutDistance}>{workout.distance} MI</Text>
              <Text style={styles.workoutDate}>{workout.date}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>HOW IT WORKS</Text>
        <Text style={styles.infoText}>1. Tap AUTHORIZE HEALTH to grant access</Text>
        <Text style={styles.infoText}>2. Tap SYNC WORKOUTS to pull from Apple Health</Text>
        <Text style={styles.infoText}>3. Workouts sync to web app automatically</Text>
        <Text style={styles.infoText}>4. Assign shoes to each workout</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    padding: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
    marginTop: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#0ff",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: "#ffff00",
  },
  buttonContainer: {
    gap: 15,
    marginBottom: 30,
  },
  button: {
    backgroundColor: "#1a1a2e",
    borderWidth: 2,
    borderColor: "#0ff",
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
  },
  buttonPrimary: {
    backgroundColor: "#ff00ff",
    borderColor: "#ffff00",
  },
  buttonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "bold",
  },
  resultsContainer: {
    marginBottom: 30,
    borderWidth: 2,
    borderColor: "#0ff",
    padding: 15,
    backgroundColor: "#1a1a2e",
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#ffff00",
    marginBottom: 15,
  },
  workoutItem: {
    backgroundColor: "#000",
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: "#00ff00",
  },
  workoutType: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#0ff",
  },
  workoutDistance: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#00ff00",
    marginTop: 5,
  },
  workoutDate: {
    fontSize: 12,
    color: "#ffff00",
    marginTop: 5,
  },
  infoBox: {
    backgroundColor: "#1a1a2e",
    borderWidth: 2,
    borderColor: "#ffff00",
    padding: 15,
    borderRadius: 5,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#ffff00",
    marginBottom: 10,
  },
  infoText: {
    fontSize: 12,
    color: "#0ff",
    marginBottom: 8,
    lineHeight: 18,
  },
});
