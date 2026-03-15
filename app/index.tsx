import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, StyleSheet, Modal, TextInput } from 'react-native';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, getDocs, query, doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import AppleHealthKit from 'rn-apple-healthkit';

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

const ACHIEVEMENTS = {
  firstStep: { id: 'firstStep', name: 'FIRST STEP', icon: '👟', description: 'Log your first run', coins: 10 },
  halfMiler: { id: 'halfMiler', name: 'HALF MILER', icon: '🏅', description: '13.1 total miles', coins: 100 },
  weekWarrior: { id: 'weekWarrior', name: 'WEEK WARRIOR', icon: '⚡', description: '3 runs in 1 week', coins: 75 },
  collector: { id: 'collector', name: 'COLLECTOR', icon: '👟👟👟', description: '3+ shoes', coins: 60 },
  consistentFire: { id: 'consistentFire', name: 'CONSISTENT FIRE', icon: '🔥', description: '4 weeks logging', coins: 200 },
  linked: { id: 'linked', name: 'LINKED', icon: '🔗', description: 'Connected Apple Health', coins: 150 },
};

const getShoeLevel = (mileage) => {
  if (mileage >= 300) return { level: 4, name: 'LEGEND', color: '#ff00ff', emoji: '👑' };
  if (mileage >= 200) return { level: 3, name: 'VETERAN', color: '#0ff', emoji: '⚔️' };
  if (mileage >= 100) return { level: 2, name: 'BROKEN IN', color: '#00ff00', emoji: '🔥' };
  return { level: 1, name: 'NEW', color: '#ffff00', emoji: '✨' };
};

const AnimatedRunner = () => {
  const [frame, setFrame] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setFrame(f => (f + 1) % 4);
    }, 300);
    return () => clearInterval(interval);
  }, []);

  const runners = ['🏃', '🏃‍♂️', '🏃', '🏃‍♂️'];
  
  return (
    <Text style={{ fontSize: 80, textAlign: 'center', marginBottom: 20 }}>
      {runners[frame]}
    </Text>
  );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [shoes, setShoes] = useState([]);
  const [logs, setLogs] = useState([]);
  const [healthWorkouts, setHealthWorkouts] = useState([]);
  const [gameStats, setGameStats] = useState({ coins: 0, achievements: [] });
  const [currentPage, setCurrentPage] = useState('login');
  const [selectedShoe, setSelectedShoe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [showAddShoe, setShowAddShoe] = useState(false);
  const [showAddLog, setShowAddLog] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showAssignWorkout, setShowAssignWorkout] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [healthAuthorized, setHealthAuthorized] = useState(false);
  const [unlockedAchievement, setUnlockedAchievement] = useState(null);
  const [newShoe, setNewShoe] = useState({ name: '', brand: '', purchaseDate: '', targetMileage: '300' });
  const [newLog, setNewLog] = useState({ shoeId: '', mileage: '', date: new Date().toISOString().split('T')[0], notes: '' });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        loadShoes(currentUser.uid);
        loadLogs(currentUser.uid);
        loadGameStats(currentUser.uid);
        loadHealthWorkouts(currentUser.uid);
        setCurrentPage('dashboard');
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const loadShoes = async (userId) => {
    try {
      const snapshot = await getDocs(query(collection(db, 'users', userId, 'shoes')));
      setShoes(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    } catch (error) {
      console.error('Load shoes error:', error);
    }
  };

  const loadLogs = async (userId) => {
    try {
      const snapshot = await getDocs(query(collection(db, 'users', userId, 'logs')));
      setLogs(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, mileage: parseFloat(doc.data().mileage) })));
    } catch (error) {
      console.error('Load logs error:', error);
    }
  };

  const loadHealthWorkouts = async (userId) => {
    try {
      const snapshot = await getDocs(query(collection(db, 'users', userId, 'health-workouts')));
      const workouts = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, distance: parseFloat(doc.data().distance) }));
      setHealthWorkouts(workouts);
    } catch (error) {
      console.error('Load health workouts error:', error);
    }
  };

  const loadGameStats = async (userId) => {
    try {
      const docRef = await getDoc(doc(db, 'users', userId, 'gameStats', 'data'));
      if (docRef.exists()) {
        setGameStats(docRef.data());
      } else {
        setGameStats({ coins: 0, achievements: [] });
      }
    } catch (error) {
      console.error('Load stats error:', error);
      setGameStats({ coins: 0, achievements: [] });
    }
  };

  const handleAuth = async () => {
    setLoading(true);
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      setEmail('');
      setPassword('');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setShoes([]);
      setLogs([]);
      setHealthWorkouts([]);
      setGameStats({ coins: 0, achievements: [] });
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const requestHealthKitPermission = async () => {
    try {
      const permissions = {
        permissions: {
          read: [
            AppleHealthKit.Constants.Permissions.HKQuantityTypeIdentifierDistanceWalkingRunning,
            AppleHealthKit.Constants.Permissions.HKWorkoutTypeIdentifier,
          ],
        },
      };

      AppleHealthKit.initHealthKit(permissions, (err) => {
        if (err) {
          console.error('HealthKit init error:', err);
          Alert.alert('Error', 'Could not access Apple Health. Please enable in Settings.');
          return;
        }
        setHealthAuthorized(true);
        awardAchievement('linked');
        Alert.alert('Success', 'Apple Health authorized!');
      });
    } catch (error) {
      console.error('Health permission error:', error);
      Alert.alert('Error', error.message);
    }
  };

  const syncWorkouts = async () => {
    if (!healthAuthorized) {
      Alert.alert('Error', 'Please authorize Apple Health first');
      return;
    }

    setLoading(true);
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const options = {
        startDate: thirtyDaysAgo,
        endDate: now,
        ascending: false,
        limit: 100,
      };

      AppleHealthKit.getWorkouts(options, async (err, results) => {
        if (err) {
          console.error('Get workouts error:', err);
          Alert.alert('Error', 'Could not fetch workouts from Apple Health');
          setLoading(false);
          return;
        }

        if (!results || results.length === 0) {
          Alert.alert('No workouts found', 'No workouts found in Apple Health');
          setLoading(false);
          return;
        }

        let synced = 0;
        for (const workout of results) {
          try {
            if (workout.distance && workout.distance > 0) {
              const miles = (workout.distance * 0.000621371).toFixed(2);
              
              await addDoc(collection(db, 'users', user.uid, 'health-workouts'), {
                type: workout.activityName || 'Run',
                distance: parseFloat(miles),
                date: new Date(workout.startDate).toISOString().split('T')[0],
                duration: workout.duration,
                source: 'Apple Health',
                importedAt: new Date().toISOString(),
                assigned: false,
              });
              synced++;
            }
          } catch (fbError) {
            console.error('Firebase error:', fbError);
          }
        }

        await loadHealthWorkouts(user.uid);
        Alert.alert('Success', `Synced ${synced} workouts from Apple Health!`);
        setLoading(false);
      });
    } catch (error) {
      console.error('Sync error:', error);
      Alert.alert('Error', error.message);
      setLoading(false);
    }
  };

  const handleAssignWorkout = async (shoeId) => {
    if (!selectedWorkout) return;

    try {
      const mileageValue = selectedWorkout.distance;
      
      // Add to logs
      const docRef = await addDoc(collection(db, 'users', user.uid, 'logs'), {
        shoeId: shoeId,
        mileage: mileageValue,
        date: selectedWorkout.date,
        notes: `From Apple Health - ${selectedWorkout.type}`,
        createdAt: new Date().toISOString(),
      });

      // Update game stats
      const baseCoins = 10 + Math.floor(mileageValue);
      const newCoins = (gameStats.coins || 0) + baseCoins;
      const newStats = { ...gameStats, coins: newCoins };
      setGameStats(newStats);
      await setDoc(doc(db, 'users', user.uid, 'gameStats', 'data'), newStats, { merge: true });

      // Delete from health-workouts
      await deleteDoc(doc(db, 'users', user.uid, 'health-workouts', selectedWorkout.id));

      // Reload
      await loadLogs(user.uid);
      await loadHealthWorkouts(user.uid);
      await loadGameStats(user.uid);

      setShowAssignWorkout(false);
      setSelectedWorkout(null);
      Alert.alert('Success', `${mileageValue} miles assigned to ${shoes.find(s => s.id === shoeId)?.name}!`);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleAddShoe = async () => {
    if (!newShoe.name || !newShoe.brand) {
      Alert.alert('Error', 'Fill all fields');
      return;
    }

    try {
      const docRef = await addDoc(collection(db, 'users', user.uid, 'shoes'), {
        name: newShoe.name,
        brand: newShoe.brand,
        purchaseDate: newShoe.purchaseDate,
        targetMileage: parseFloat(newShoe.targetMileage),
        createdAt: new Date().toISOString(),
      });

      const updatedShoes = [...shoes, { ...newShoe, id: docRef.id, targetMileage: parseFloat(newShoe.targetMileage) }];
      setShoes(updatedShoes);
      if (updatedShoes.length === 3) {
        awardAchievement('collector');
      }
      setNewShoe({ name: '', brand: '', purchaseDate: '', targetMileage: '300' });
      setShowAddShoe(false);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleAddLog = async () => {
    if (!newLog.shoeId || !newLog.mileage) {
      Alert.alert('Error', 'Select shoe and mileage');
      return;
    }

    try {
      const mileageValue = parseFloat(newLog.mileage);
      const docRef = await addDoc(collection(db, 'users', user.uid, 'logs'), {
        shoeId: newLog.shoeId,
        mileage: mileageValue,
        date: newLog.date,
        notes: newLog.notes,
        createdAt: new Date().toISOString(),
      });

      const updatedLogs = [...logs, { id: docRef.id, shoeId: newLog.shoeId, mileage: mileageValue, date: newLog.date, notes: newLog.notes }];
      setLogs(updatedLogs);

      const baseCoins = 10 + Math.floor(mileageValue);
      const newCoins = (gameStats.coins || 0) + baseCoins;
      const newStats = { ...gameStats, coins: newCoins };
      setGameStats(newStats);
      await setDoc(doc(db, 'users', user.uid, 'gameStats', 'data'), newStats, { merge: true });

      if (updatedLogs.length === 1) awardAchievement('firstStep');
      const totalMiles = updatedLogs.reduce((sum, log) => sum + log.mileage, 0);
      if (totalMiles >= 13.1) awardAchievement('halfMiler');
      if (shoes.length >= 3) awardAchievement('collector');

      setNewLog({ shoeId: '', mileage: '', date: new Date().toISOString().split('T')[0], notes: '' });
      setShowAddLog(false);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const awardAchievement = async (achievementId) => {
    if (!gameStats.achievements || !gameStats.achievements.includes(achievementId)) {
      const achievement = ACHIEVEMENTS[achievementId];
      setUnlockedAchievement(achievement);
      const newCoins = (gameStats.coins || 0) + achievement.coins;
      const newAchievements = [...(gameStats.achievements || []), achievementId];
      const newStats = { coins: newCoins, achievements: newAchievements };
      setGameStats(newStats);
      await setDoc(doc(db, 'users', user.uid, 'gameStats', 'data'), newStats, { merge: true });
      setTimeout(() => setUnlockedAchievement(null), 3000);
    }
  };

  const getTotalMileage = (shoeId) => {
    return logs.filter(log => log.shoeId === shoeId).reduce((total, log) => total + log.mileage, 0).toFixed(1);
  };

  const calculateUserLevel = (coins) => Math.floor((coins || 0) / 100) + 1;

  if (loading) {
    return <View style={styles.container}><Text style={styles.title}>LOADING...</Text></View>;
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.loginHeader}>
          <AnimatedRunner />
          <Text style={styles.loginTitle}>SHOE TRACKER 10000</Text>
          <Text style={styles.loginSubtitle}>Record your shoe mileage, and play to win!</Text>
        </View>

        <View style={styles.loginForm}>
          <TextInput
            style={styles.input}
            placeholder="EMAIL"
            placeholderTextColor="#666"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="PASSWORD"
            placeholderTextColor="#666"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity style={styles.submitBtn} onPress={handleAuth}>
            <Text style={styles.submitBtnText}>{isSignUp ? 'CREATE' : 'SIGN IN'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
            <Text style={styles.toggleAuth}>{isSignUp ? 'HAVE ACCOUNT' : 'NEW PLAYER'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (currentPage === 'dashboard') {
    return (
      <View style={styles.container}>
        {unlockedAchievement && (
          <View style={styles.achievementPopup}>
            <Text style={styles.achievementIcon}>{unlockedAchievement.icon}</Text>
            <Text style={styles.achievementTitle}>ACHIEVEMENT UNLOCKED</Text>
            <Text style={styles.achievementName}>{unlockedAchievement.name}</Text>
            <Text style={styles.achievementCoins}>+{unlockedAchievement.coins} COINS</Text>
          </View>
        )}

        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>SHOE TRACKER 10000</Text>
            <Text style={styles.headerEmail}>{user.email}</Text>
          </View>
          <View style={styles.headerStats}>
            <Text style={styles.headerStat}>⭐ LV {calculateUserLevel(gameStats.coins)}</Text>
            <Text style={styles.headerStat}>🪙 {gameStats.coins || 0}</Text>
          </View>
        </View>

        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.btn} onPress={() => setShowStats(!showStats)}>
            <Text style={styles.btnText}>📊 SCORECARD</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btn} onPress={handleLogout}>
            <Text style={styles.btnText}>EXIT</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {showStats && (
            <View style={styles.statsCard}>
              <Text style={styles.statsTitle}>YOUR SCORECARD</Text>
              <Text style={styles.statLine}>PLAYER LEVEL: {calculateUserLevel(gameStats.coins)}</Text>
              <Text style={styles.statLine}>TOTAL COINS: {gameStats.coins || 0}</Text>
              
              <View style={styles.coinLegend}>
                <Text style={styles.legendTitle}>HOW TO EARN COINS</Text>
                <Text style={styles.legendText}>🪙 +10 coins per log entry</Text>
                <Text style={styles.legendText}>🪙 +1 coin per mile logged</Text>
                <Text style={styles.legendText}>🪙 +bonus coins for achievements</Text>
              </View>

              <Text style={styles.achievementCount}>ACHIEVEMENTS: {(gameStats.achievements || []).length} / {Object.keys(ACHIEVEMENTS).length}</Text>
              <View style={styles.achievementGrid}>
                {Object.values(ACHIEVEMENTS).map(achievement => (
                  <View key={achievement.id} style={[styles.achievementCard, !(gameStats.achievements || []).includes(achievement.id) && styles.achievementCardLocked]}>
                    <Text style={styles.achievementCardIcon}>{achievement.icon}</Text>
                    <Text style={styles.achievementCardName}>{achievement.name}</Text>
                    <Text style={styles.achievementCardDesc}>{achievement.description}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {shoes.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>👟</Text>
              <Text style={styles.emptyTitle}>NO SHOES</Text>
              <Text style={styles.emptyText}>ADD YOUR FIRST SHOE</Text>
              <TouchableOpacity style={styles.btnPrimary} onPress={() => setShowAddShoe(true)}>
                <Text style={styles.btnPrimaryText}>ADD SHOE</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.statsGrid}>
                <View style={styles.statCard2}>
                  <Text style={styles.statLabel}>👟 SHOES</Text>
                  <Text style={styles.statValue}>{shoes.length}</Text>
                </View>
                <View style={styles.statCard2}>
                  <Text style={styles.statLabel}>📊 MILES</Text>
                  <Text style={styles.statValue}>{logs.reduce((total, log) => total + log.mileage, 0).toFixed(1)}</Text>
                </View>
                <View style={styles.statCard2}>
                  <Text style={styles.statLabel}>⚡ LOGS</Text>
                  <Text style={styles.statValue}>{logs.length}</Text>
                </View>
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>YOUR ARSENAL</Text>
                  <TouchableOpacity style={styles.btnAdd} onPress={() => setShowAddShoe(true)}>
                    <Text style={styles.btnAddText}>ADD</Text>
                  </TouchableOpacity>
                </View>

                {shoes.map(shoe => {
                  const totalMileage = getTotalMileage(shoe.id);
                  const level = getShoeLevel(parseFloat(totalMileage));
                  const percentage = Math.min((parseFloat(totalMileage) / 300) * 100, 100);

                  return (
                    <TouchableOpacity key={shoe.id} style={styles.shoeCard} onPress={() => { setSelectedShoe(shoe.id); setCurrentPage('detail'); }}>
                      <View style={styles.shoeCardHeader}>
                        <View>
                          <Text style={styles.shoeName}>{shoe.name}</Text>
                          <Text style={styles.shoeBrand}>{shoe.brand}</Text>
                        </View>
                        <View style={[styles.shoeLevelBadge, { backgroundColor: level.color }]}>
                          <Text style={styles.shoeLevelText}>{level.emoji} LV {level.level}</Text>
                        </View>
                      </View>

                      <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${percentage}%` }]} />
                      </View>

                      <View style={styles.progressLabel}>
                        <Text style={styles.progressText}>MILES</Text>
                        <Text style={styles.progressText}>{totalMileage}</Text>
                      </View>

                      <TouchableOpacity style={styles.logBtn} onPress={() => { setNewLog({ ...newLog, shoeId: shoe.id }); setShowAddLog(true); }}>
                        <Text style={styles.logBtnText}>LOG</Text>
                      </TouchableOpacity>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {healthWorkouts.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>SYNCED FROM APPLE HEALTH</Text>
                  {healthWorkouts.map((workout, index) => (
                    <TouchableOpacity 
                      key={index} 
                      style={styles.workoutCard}
                      onPress={() => {
                        setSelectedWorkout(workout);
                        setShowAssignWorkout(true);
                      }}
                    >
                      <View>
                        <Text style={styles.workoutMileage}>{workout.distance} MI</Text>
                        <Text style={styles.workoutDate}>{workout.date} • {workout.type}</Text>
                      </View>
                      <Text style={styles.workoutTap}>TAP TO ASSIGN</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>HEALTH SYNC</Text>
                <TouchableOpacity
                  style={!healthAuthorized ? styles.btnPrimary : styles.btnDisabled}
                  onPress={requestHealthKitPermission}
                  disabled={healthAuthorized}
                >
                  <Text style={styles.btnPrimaryText}>{healthAuthorized ? '✓ AUTHORIZED' : 'AUTHORIZE HEALTH'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.btnPrimary}
                  onPress={syncWorkouts}
                  disabled={!healthAuthorized}
                >
                  <Text style={styles.btnPrimaryText}>SYNC WORKOUTS</Text>
                </TouchableOpacity>
              </View>

              {logs.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>ACTIVITY LOG</Text>
                  {[...logs].reverse().slice(0, 5).map((log, index) => {
                    const shoe = shoes.find(s => s.id === log.shoeId);
                    return (
                      <View key={index} style={styles.logItem}>
                        <View>
                          <Text style={styles.logTitle}>{shoe?.name} - {log.mileage} MI</Text>
                          <Text style={styles.logDate}>{log.date}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </>
          )}
        </ScrollView>

        <Modal visible={showAddShoe} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>ADD SHOE</Text>
                <TouchableOpacity onPress={() => setShowAddShoe(false)}>
                  <Text style={styles.closeBtn}>X</Text>
                </TouchableOpacity>
              </View>
              <TextInput style={styles.input} placeholder="SHOE NAME" placeholderTextColor="#666" value={newShoe.name} onChangeText={(text) => setNewShoe({ ...newShoe, name: text })} />
              <TextInput style={styles.input} placeholder="BRAND" placeholderTextColor="#666" value={newShoe.brand} onChangeText={(text) => setNewShoe({ ...newShoe, brand: text })} />
              <TouchableOpacity style={styles.submitBtn} onPress={handleAddShoe}>
                <Text style={styles.submitBtnText}>ADD SHOE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal visible={showAddLog} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>LOG MILEAGE</Text>
                <TouchableOpacity onPress={() => setShowAddLog(false)}>
                  <Text style={styles.closeBtn}>X</Text>
                </TouchableOpacity>
              </View>
              <TextInput style={styles.input} placeholder="MILEAGE" placeholderTextColor="#666" keyboardType="decimal-pad" value={newLog.mileage} onChangeText={(text) => setNewLog({ ...newLog, mileage: text })} />
              <TextInput style={styles.input} placeholder="DATE" placeholderTextColor="#666" value={newLog.date} onChangeText={(text) => setNewLog({ ...newLog, date: text })} />
              <TouchableOpacity style={styles.submitBtn} onPress={handleAddLog}>
                <Text style={styles.submitBtnText}>LOG IT</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal visible={showAssignWorkout} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>ASSIGN WORKOUT</Text>
                <TouchableOpacity onPress={() => { setShowAssignWorkout(false); setSelectedWorkout(null); }}>
                  <Text style={styles.closeBtn}>X</Text>
                </TouchableOpacity>
              </View>
              {selectedWorkout && (
                <>
                  <Text style={styles.workoutDetail}>{selectedWorkout.distance} MI • {selectedWorkout.date}</Text>
                  <Text style={styles.workoutDetail}>{selectedWorkout.type}</Text>
                  <Text style={styles.pickShoeText}>SELECT A SHOE</Text>
                  <ScrollView style={{ maxHeight: 200 }}>
                    {shoes.map(shoe => (
                      <TouchableOpacity
                        key={shoe.id}
                        style={styles.shoeOption}
                        onPress={() => handleAssignWorkout(shoe.id)}
                      >
                        <Text style={styles.shoeOptionText}>{shoe.name} • {shoe.brand}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )}
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  if (currentPage === 'detail' && selectedShoe) {
    const shoe = shoes.find(s => s.id === selectedShoe);
    const shoeLogs = logs.filter(log => log.shoeId === selectedShoe);
    const totalMileage = getTotalMileage(selectedShoe);
    const level = getShoeLevel(parseFloat(totalMileage));

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setCurrentPage('dashboard')}>
            <Text style={styles.backBtn}>MENU</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{shoe.name}</Text>
          <Text style={[styles.levelText, { color: level.color }]}>{level.emoji} LV {level.level} {level.name}</Text>
        </View>

        <ScrollView style={styles.content}>
          <Text style={styles.detailTitle}>{shoe.name}</Text>
          <Text style={styles.detailBrand}>{shoe.brand}</Text>

          <View style={styles.statsGrid}>
            <View style={styles.statCard2}>
              <Text style={styles.statLabel}>MILES</Text>
              <Text style={styles.statValue}>{totalMileage}</Text>
            </View>
            <View style={styles.statCard2}>
              <Text style={styles.statLabel}>GOAL</Text>
              <Text style={styles.statValue}>300</Text>
            </View>
            <View style={styles.statCard2}>
              <Text style={styles.statLabel}>LOGS</Text>
              <Text style={styles.statValue}>{shoeLogs.length}</Text>
            </View>
          </View>

          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${Math.min((parseFloat(totalMileage) / 300) * 100, 100)}%` }]} />
          </View>

          <TouchableOpacity style={styles.btnPrimary} onPress={() => { setNewLog({ ...newLog, shoeId: selectedShoe }); setShowAddLog(true); }}>
            <Text style={styles.btnPrimaryText}>LOG MILEAGE</Text>
          </TouchableOpacity>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>MILEAGE LOGS</Text>
            {shoeLogs.length === 0 ? (
              <Text style={styles.emptyText}>NO LOGS YET</Text>
            ) : (
              [...shoeLogs].reverse().map((log, i) => (
                <View key={i} style={styles.logItem}>
                  <Text style={styles.logMileage}>{log.mileage} MI</Text>
                  <Text style={styles.logDate}>{log.date}</Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>

        <Modal visible={showAddLog} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>LOG MILEAGE</Text>
                <TouchableOpacity onPress={() => setShowAddLog(false)}>
                  <Text style={styles.closeBtn}>X</Text>
                </TouchableOpacity>
              </View>
              <TextInput style={styles.input} placeholder="MILEAGE" placeholderTextColor="#666" keyboardType="decimal-pad" value={newLog.mileage} onChangeText={(text) => setNewLog({ ...newLog, mileage: text })} />
              <TouchableOpacity style={styles.submitBtn} onPress={handleAddLog}>
                <Text style={styles.submitBtnText}>LOG IT</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loginHeader: { alignItems: 'center', marginTop: 20, marginBottom: 30 },
  loginTitle: { fontSize: 28, fontWeight: 'bold', color: '#0ff', marginBottom: 10, textAlign: 'center' },
  loginSubtitle: { fontSize: 12, color: '#ffff00', textAlign: 'center', paddingHorizontal: 20 },
  loginForm: { paddingHorizontal: 20, paddingVertical: 30 },
  input: { backgroundColor: '#000', borderWidth: 2, borderColor: '#0ff', color: '#0ff', padding: 12, marginBottom: 15, borderRadius: 0, fontSize: 12 },
  submitBtn: { backgroundColor: '#ff00ff', borderWidth: 3, borderColor: '#ffff00', padding: 15, marginTop: 20, marginBottom: 15 },
  submitBtnText: { color: '#000', fontWeight: 'bold', textAlign: 'center', fontSize: 14 },
  toggleAuth: { textAlign: 'center', color: '#00ff00', fontSize: 11, marginTop: 10 },
  header: { backgroundColor: '#1a1a2e', borderBottomWidth: 3, borderBottomColor: '#ff00ff', borderTopWidth: 3, borderTopColor: '#0ff', padding: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 },
  headerTitle: { fontSize: 14, fontWeight: 'bold', color: '#0ff', flex: 1 },
  headerEmail: { fontSize: 10, color: '#ffff00', marginTop: 5 },
  headerStats: { alignItems: 'flex-end' },
  headerStat: { fontSize: 10, color: '#ffff00' },
  headerButtons: { flexDirection: 'row', paddingHorizontal: 15, paddingVertical: 10, gap: 10 },
  btn: { flex: 1, backgroundColor: '#1a1a2e', borderWidth: 2, borderColor: '#0ff', padding: 10, alignItems: 'center', borderRadius: 0 },
  btnText: { color: '#0ff', fontWeight: 'bold', fontSize: 11 },
  btnAdd: { backgroundColor: '#ff00ff', borderColor: '#ffff00', borderWidth: 2, paddingHorizontal: 15, paddingVertical: 8 },
  btnAddText: { color: '#000', fontWeight: 'bold', fontSize: 12 },
  btnPrimary: { backgroundColor: '#ff00ff', borderWidth: 2, borderColor: '#ffff00', padding: 15, marginBottom: 12, alignItems: 'center' },
  btnPrimaryText: { color: '#000', fontWeight: 'bold', fontSize: 12 },
  btnDisabled: { backgroundColor: '#666', padding: 15, marginBottom: 12, alignItems: 'center' },
  content: { flex: 1, paddingHorizontal: 15, paddingTop: 15 },
  statsCard: { backgroundColor: '#1a1a2e', borderWidth: 3, borderColor: '#0ff', padding: 15, marginBottom: 20 },
  statsTitle: { fontSize: 14, fontWeight: 'bold', color: '#ffff00', marginBottom: 10 },
  statLine: { fontSize: 11, color: '#0ff', marginBottom: 8 },
  coinLegend: { backgroundColor: '#000', borderWidth: 2, borderColor: '#ffff00', padding: 12, marginVertical: 15 },
  legendTitle: { fontSize: 12, fontWeight: 'bold', color: '#ffff00', marginBottom: 8 },
  legendText: { fontSize: 10, color: '#0ff', marginBottom: 5 },
  achievementCount: { fontSize: 11, color: '#ffff00', marginBottom: 12 },
  achievementGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  achievementCard: { width: '48%', backgroundColor: '#000', borderWidth: 2, borderColor: '#00ff00', padding: 10, alignItems: 'center' },
  achievementCardLocked: { opacity: 0.4, borderColor: '#666' },
  achievementCardIcon: { fontSize: 28, marginBottom: 5 },
  achievementCardName: { fontSize: 9, fontWeight: 'bold', color: '#0ff', textAlign: 'center' },
  achievementCardDesc: { fontSize: 8, color: '#ffff00', textAlign: 'center', marginTop: 3 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 80, marginBottom: 20 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#0ff', marginBottom: 10 },
  emptyText: { fontSize: 11, color: '#ffff00', marginBottom: 20 },
  statsGrid: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard2: { flex: 1, backgroundColor: '#1a1a2e', borderWidth: 2, borderColor: '#0ff', padding: 12, alignItems: 'center' },
  statLabel: { fontSize: 9, color: '#ffff00', marginBottom: 5 },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#00ff00' },
  section: { marginBottom: 25 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', color: '#ffff00' },
  shoeCard: { backgroundColor: '#1a1a2e', borderWidth: 2, borderColor: '#00ff00', padding: 12, marginBottom: 12 },
  shoeCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  shoeName: { fontSize: 12, fontWeight: 'bold', color: '#0ff' },
  shoeBrand: { fontSize: 10, color: '#ffff00', marginTop: 2 },
  shoeLevelBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 3 },
  shoeLevelText: { fontSize: 10, fontWeight: 'bold', color: '#000' },
  progressBar: { height: 10, backgroundColor: '#000', borderWidth: 1, borderColor: '#0ff', marginBottom: 8, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#00ff00' },
  progressLabel: { flexDirection: 'row', justifyContent: 'space-between', fontSize: 9, color: '#ffff00', marginBottom: 10 },
  progressText: { fontSize: 9, color: '#ffff00' },
  logBtn: { backgroundColor: '#00ff00', padding: 8, alignItems: 'center' },
  logBtnText: { color: '#000', fontWeight: 'bold', fontSize: 10 },
  workoutCard: { backgroundColor: '#1a1a2e', borderWidth: 2, borderColor: '#ff00ff', padding: 12, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  workoutMileage: { fontSize: 14, fontWeight: 'bold', color: '#0ff' },
  workoutDate: { fontSize: 10, color: '#ffff00', marginTop: 3 },
  workoutTap: { fontSize: 9, color: '#ff00ff', fontWeight: 'bold' },
  workoutDetail: { fontSize: 12, color: '#0ff', marginBottom: 8, textAlign: 'center' },
  pickShoeText: { fontSize: 11, fontWeight: 'bold', color: '#ffff00', marginBottom: 10, textAlign: 'center' },
  shoeOption: { backgroundColor: '#000', borderWidth: 2, borderColor: '#00ff00', padding: 12, marginBottom: 8 },
  shoeOptionText: { fontSize: 12, color: '#00ff00', fontWeight: 'bold' },
  achievementPopup: { position: 'absolute', top: 100, left: 20, right: 20, backgroundColor: '#ff00ff', borderWidth: 3, borderColor: '#ffff00', padding: 20, alignItems: 'center', zIndex: 999 },
  achievementIcon: { fontSize: 40, marginBottom: 10 },
  achievementTitle: { fontSize: 12, fontWeight: 'bold', color: '#000', marginBottom: 5 },
  achievementName: { fontSize: 13, fontWeight: 'bold', color: '#000', marginBottom: 8 },
  achievementCoins: { fontSize: 11, fontWeight: 'bold', color: '#000' },
  detailTitle: { fontSize: 20, fontWeight: 'bold', color: '#0ff', textAlign: 'center', marginVertical: 15 },
  detailBrand: { fontSize: 14, color: '#ffff00', textAlign: 'center', marginBottom: 20 },
  levelText: { fontSize: 11, fontWeight: 'bold' },
  backBtn: { fontSize: 12, color: '#0ff', fontWeight: 'bold' },
  logItem: { backgroundColor: '#1a1a2e', borderLeftWidth: 3, borderLeftColor: '#00ff00', padding: 12, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between' },
  logTitle: { fontSize: 11, fontWeight: 'bold', color: '#0ff' },
  logDate: { fontSize: 9, color: '#ffff00', marginTop: 3 },
  logMileage: { fontSize: 16, fontWeight: 'bold', color: '#00ff00' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#000', borderTopWidth: 3, borderTopColor: '#0ff', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, borderBottomWidth: 2, borderBottomColor: '#ff00ff', paddingBottom: 10 },
  modalTitle: { fontSize: 14, fontWeight: 'bold', color: '#0ff' },
  closeBtn: { fontSize: 18, color: '#ff0000', fontWeight: 'bold' },
  title: { fontSize: 20, color: '#0ff', textAlign: 'center', marginTop: 20 },
});
