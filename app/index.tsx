// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, StyleSheet, Modal, TextInput, Keyboard, Platform, KeyboardAvoidingView, Dimensions, AppState } from 'react-native';
import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updatePassword, EmailAuthProvider, reauthenticateWithCredential, sendPasswordResetEmail, deleteUser } from 'firebase/auth';
import { getFirestore, collection, addDoc, getDocs, query, doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, listAll, deleteObject } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Image as ExpoImage } from 'expo-image';
import { useFonts } from 'expo-font';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const AppleHealthKitModule = require('rn-apple-healthkit');


const firebaseConfig = {
  apiKey: "AIzaSyCS9OcckFBy2UbUGEn-Knp_TARNy8EBf5w",
  authDomain: "shoe-tracker-10000.firebaseapp.com",
  projectId: "shoe-tracker-10000",
  storageBucket: "shoe-tracker-10000.firebasestorage.app",
  messagingSenderId: "23538109201",
  appId: "1:23538109201:web:c468a2c92fa34817f19ab0",
};

const app = initializeApp(firebaseConfig);
const auth = (() => {
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    return getAuth(app);
  }
})();
const db = getFirestore(app);
const storage = getStorage(app);
const IPAD_HEALTH_SYNC_MESSAGE = 'Apple Health workout sync is available on iPhone. On iPad, log workouts manually from the main menu.';
const HEALTH_RECONNECT_MESSAGE = 'Workout access is off in Apple Health. Reconnect Apple Health before syncing workouts again.';
const isIpadDevice = () => Platform.OS === 'ios' && Platform.isPad === true;
const resolveAppleHealthKit = () => {
  const candidates = [
    AppleHealthKitModule,
    AppleHealthKitModule?.default,
    AppleHealthKitModule?.default?.default,
  ].filter(Boolean);

  return (
    candidates.find(
      (candidate) =>
        typeof candidate.initHealthKit === 'function' ||
        typeof candidate.getWorkouts === 'function' ||
        typeof candidate.getSamples === 'function'
    ) || candidates[0] || null
  );
};


const ACHIEVEMENTS = {
  firstStep: { id: 'firstStep', name: 'FIRST STEP', icon: '👟', description: 'Log your first run', coins: 10 },
  halfMiler: { id: 'halfMiler', name: 'HALF MARATHON', icon: '🏅', description: '13.1 total miles', coins: 100 },
  weekWarrior: { id: 'weekWarrior', name: 'WEEK WARRIOR', icon: '⚡', description: '3 runs in 1 week', coins: 75 },
  collector: { id: 'collector', name: 'COLLECTOR', icon: '👟👟👟', description: '3+ shoes', coins: 60 },
  consistentFire: { id: 'consistentFire', name: 'CONSISTENT FIRE', icon: '🔥', description: '4 weeks logging', coins: 200 },
  linked: { id: 'linked', name: 'LINKED', icon: '🔗', description: 'Connected Apple Health', coins: 150 },
};

const RUNNER_LEVELS = [
  { minCoins: 0, title: 'Warm-Up Walker' },
  { minCoins: 100, title: 'Sidewalk Sprinter' },
  { minCoins: 200, title: 'Tempo Chaser' },
  { minCoins: 300, title: 'Neon Strider' },
  { minCoins: 400, title: 'City Circuit Racer' },
  { minCoins: 500, title: '10K Trailblazer' },
  { minCoins: 600, title: 'Half Marathon Hero' },
  { minCoins: 700, title: 'Pace Commander' },
  { minCoins: 800, title: 'Marathon Machine' },
  { minCoins: 900, title: 'Podium Phantom' },
  { minCoins: 1000, title: 'Arcade Running Legend' },
];

const MILES_PER_METER = 0.000621371;
const HEADER_MAIN_MENU_IMAGE = require('../assets/images/SHOETRACKER10000.png');
const GO_TO_SCORECARD_IMAGE = require('../assets/images/GOTOYOURSCORECARD.png');
const BACK_TO_MAIN_MENU_IMAGE = require('../assets/images/BACKTOMAINMENU.png');
const SHOES_READY_IMAGE = require('../assets/images/SHOESREADYTOPLAY.png');
const RETIRED_SHOES_IMAGE = require('../assets/images/RETIREDSHOES.png');
const HEALTH_SYNC_IMAGE = require('../assets/images/HEALTHSYNC.png');
const ACTIVITY_LOG_IMAGE = require('../assets/images/ACTIVITYLOG.png');
const STARTUP_IMAGE = require('../assets/images/app-icon-2.0.png');
const LOADING_IMAGE = require('../assets/images/loading-2.0.png');
const LOGIN_APP_IMAGE = require('../assets/images/APPIMAGE2.png');
const ARCADE_FONT_FAMILY = 'PressStart2P';
const CELEBRATION_IMAGE = require('../assets/images/APPIMAGE2.png');
const CELEBRATION_MESSAGES = [
  'You are stacking wins like an arcade champion.',
  'Another strong step. Keep the streak alive.',
  'The miles are adding up and the legend is growing.',
  'That was a clean unlock. Keep moving forward.',
  'Your runner story just leveled up.',
  'Big energy. Bigger goals. Keep chasing it.',
  'You are building real momentum now.',
  'That milestone belongs to you now.',
  'The grind is working. Stay on the trail.',
  'Every run is turning you into a stronger player.',
  'The board just lit up for you.',
  'Keep pressing forward. The next unlock is close.',
  'That is arcade-level dedication right there.',
  'Your training is paying off in a big way.',
  'This is what progress looks like. Keep going.',
  'Locked in. Dialed up. Ready for the next run.',
  'That is a serious runner move.',
  'You earned this one. Enjoy the moment.',
  'The shoe game is strong and the runner game is stronger.',
  'Your next milestone is already in sight.',
];

const getCelebrationMessage = (kind, name) => {
  const pool = [...CELEBRATION_MESSAGES];

  if (kind === 'level') {
    pool.unshift(
      `Level up to ${name}. Keep pushing the pace.`,
      `${name} unlocked. Your runner status just got stronger.`,
      `Welcome to ${name}. The next climb starts now.`
    );
  } else {
    pool.unshift(
      `${name} unlocked. You earned that one.`,
      `${name} is yours now. Keep the momentum going.`,
      `Achievement secured: ${name}. Time to chase the next one.`
    );
  }

  return pool[Math.floor(Math.random() * pool.length)];
};

const normalizeWorkoutSourceLabel = (workout) => {
  const explicitSource = workout?.sourceName || workout?.sourceLabel || workout?.source || '';
  if (explicitSource) {
    return explicitSource;
  }

  if (workout?.tracked === false) {
    return 'Manual Entry';
  }

  return 'Apple Health';
};

const normalizeWorkoutType = (workout) =>
  String(workout?.activityName || workout?.workoutActivityType || workout?.type || 'Run').trim();

const isRunningWorkoutType = (workout) => {
  const typeLabel = normalizeWorkoutType(workout).toLowerCase();
  if (!typeLabel) return true;
  if (typeLabel.includes('cycl')) return false;
  if (typeLabel.includes('bike')) return false;
  if (typeLabel.includes('bicy')) return false;
  return typeLabel.includes('run') || typeLabel.includes('walk') || typeLabel === 'workout';
};

const getRunnerLevelDetails = (coins) => {
  const safeCoins = Number(coins) || 0;
  const current = [...RUNNER_LEVELS].reverse().find((level) => safeCoins >= level.minCoins) || RUNNER_LEVELS[0];
  const next = RUNNER_LEVELS.find((level) => level.minCoins > safeCoins) || null;

  return {
    levelNumber: RUNNER_LEVELS.findIndex((level) => level.minCoins === current.minCoins) + 1,
    title: current.title,
    currentMin: current.minCoins,
    nextTitle: next?.title || 'Maxed Out',
    nextCoins: next?.minCoins || null,
  };
};

const getLogSortValue = (log) => String(log?.date || log?.updatedAt || log?.createdAt || '');
const sortLogsByWorkoutDateDesc = (items) =>
  [...items].sort((a, b) => {
    const dateCompare = getLogSortValue(b).localeCompare(getLogSortValue(a));
    if (dateCompare !== 0) {
      return dateCompare;
    }

    return String(b?.createdAt || '').localeCompare(String(a?.createdAt || ''));
  });

const formatPurchaseDateInput = (text = '') => {
  const digits = String(text).replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};

const parsePurchaseDate = (purchaseDate) => {
  if (!purchaseDate) return null;

  const trimmed = String(purchaseDate).trim();
  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, monthText, dayText, yearText] = slashMatch;
    const month = Number(monthText);
    const day = Number(dayText);
    const year = Number(yearText);
    const parsed = new Date(year, month - 1, day);
    if (
      parsed.getFullYear() === year &&
      parsed.getMonth() === month - 1 &&
      parsed.getDate() === day
    ) {
      return parsed;
    }
    return null;
  }

  const fallback = new Date(trimmed);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
};

const formatPurchaseDateDisplay = (purchaseDate) => {
  const parsed = parsePurchaseDate(purchaseDate);
  if (!parsed) {
    return purchaseDate || '';
  }

  return `${parsed.getMonth() + 1}/${parsed.getDate()}/${parsed.getFullYear()}`;
};

const formatPurchaseDateForDetailCard = (purchaseDate) => {
  const display = formatPurchaseDateDisplay(purchaseDate);
  const match = String(display).match(/^(\d{1,2}\/\d{1,2})\/(\d{4})$/);
  if (!match) {
    return display;
  }

  return `${match[1]}\n${match[2]}`;
};

const GoldCoinIcon = ({ compact = false }) => <View style={compact ? styles.goldCoinCompact : styles.goldCoin} />;

export default function App() {
  const [fontsLoaded] = useFonts({
    [ARCADE_FONT_FAMILY]: require('../assets/fonts/PressStart2P-Regular.ttf'),
  });
  const insets = useSafeAreaInsets();
  const headerMinHeight = Math.round(Dimensions.get('window').height * 0.17);
  const syncRequestIdRef = useRef(0);
  const autoSyncAttemptedRef = useRef('');
  const healthAccessValidationRef = useRef('');
  const validateStoredHealthAccessRef = useRef(null);
  const requestHealthKitPermissionRef = useRef(null);
  const syncWorkoutsRef = useRef(null);
  const [user, setUser] = useState(null);
  const [shoes, setShoes] = useState([]);
  const [logs, setLogs] = useState([]);
  const [, setHealthWorkouts] = useState([]);
  const [gameStats, setGameStats] = useState({ coins: 0, achievements: [] });
  const [currentPage, setCurrentPage] = useState('login');
  const [selectedShoe, setSelectedShoe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [showAddShoe, setShowAddShoe] = useState(false);
  const [showAddLog, setShowAddLog] = useState(false);
  const [showEditShoe, setShowEditShoe] = useState(false);
  const [editingShoe, setEditingShoe] = useState(null);
  const [showStats, setShowStats] = useState(false);
  const [showEditLog, setShowEditLog] = useState(false);
  const [editingLog, setEditingLog] = useState(null);
  const [pendingImportWorkouts, setPendingImportWorkouts] = useState([]);
  const [selectedImportIds, setSelectedImportIds] = useState([]);
  const [previewAssignedShoes, setPreviewAssignedShoes] = useState({});
  const [syncDays, setSyncDays] = useState(30);
  const [healthAuthorized, setHealthAuthorized] = useState(false);
  const [unlockedAchievement, setUnlockedAchievement] = useState(null);
  const [celebrationQueue, setCelebrationQueue] = useState([]);
  const [newShoe, setNewShoe] = useState({ name: '', brand: '', purchaseDate: '', targetMileage: '300', photoUrl: '' });
  const [newLog, setNewLog] = useState({ shoeId: '', mileage: '', date: new Date().toISOString().split('T')[0], notes: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [deleteAccountPassword, setDeleteAccountPassword] = useState('');
  const [busyMessage, setBusyMessage] = useState('');
  const [isSyncingWorkouts, setIsSyncingWorkouts] = useState(false);
  const [datePickerState, setDatePickerState] = useState({ visible: false, target: null, monthCursor: new Date() });

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
      const workouts = snapshot.docs
        .map((docSnapshot) => ({ ...docSnapshot.data(), id: docSnapshot.id, distance: parseFloat(docSnapshot.data().distance) }))
        .filter((workout) => !workout.deleted)
        .sort((a, b) => {
          if (Boolean(a.assigned) !== Boolean(b.assigned)) {
            return a.assigned ? 1 : -1;
          }

          return String(b.date || '').localeCompare(String(a.date || ''));
        });
      setHealthWorkouts(workouts);
    } catch (error) {
      console.error('Load health workouts error:', error);
    }
  };

  const getLogSourceText = (log) => log?.sourceLabel || log?.source || (log?.sourceCollection === 'health-workouts' ? 'Apple Health' : 'Manual Entry');
  const runnerLevel = getRunnerLevelDetails(gameStats.coins || 0);
  const activeCelebration = celebrationQueue[0] || null;
  const sortedLogs = sortLogsByWorkoutDateDesc(logs);
  const getMostRecentShoeUseValue = (shoeId) => {
    const matchingLogs = logs.filter((log) => log.shoeId === shoeId);

    if (matchingLogs.length === 0) {
      const shoe = shoes.find((item) => item.id === shoeId);
      return shoe?.createdAt || '';
    }

    return matchingLogs
      .map((log) => log.updatedAt || log.createdAt || log.date || '')
      .sort((a, b) => String(b).localeCompare(String(a)))[0];
  };

  const shoesByRecentUse = [...shoes].sort((a, b) => String(getMostRecentShoeUseValue(b.id)).localeCompare(String(getMostRecentShoeUseValue(a.id))));
  const activeShoes = shoesByRecentUse.filter((shoe) => !shoe.retired);
  const retiredShoes = shoesByRecentUse.filter((shoe) => shoe.retired);

  const getShoeMileageNumber = (shoeId) =>
    logs
      .filter((log) => log.shoeId === shoeId)
      .reduce((total, log) => total + Number(log.mileage || 0), 0);

  const getShoeAverageMilesPerUse = (shoeId) => {
    const shoeLogs = logs.filter((log) => log.shoeId === shoeId);
    if (shoeLogs.length === 0) return 0;
    return getShoeMileageNumber(shoeId) / shoeLogs.length;
  };

  const getShoeLongestDistance = (shoeId) =>
    logs
      .filter((log) => log.shoeId === shoeId)
      .reduce((longest, log) => Math.max(longest, Number(log.mileage || 0)), 0);

  const getShoeAgeDetails = (purchaseDate) => {
    const date = parsePurchaseDate(purchaseDate);
    if (!date || Number.isNaN(date.getTime())) {
      return { months: 0, years: 0, remainingMonths: 0, label: 'ADD PURCHASE DATE' };
    }

    const now = new Date();
    const diffMs = Math.max(now.getTime() - date.getTime(), 0);
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const months = Math.floor(days / 30.44);
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    return {
      months,
      years,
      remainingMonths,
      label: `${years}YR, ${remainingMonths}MTH`,
    };
  };

  const formatDateForStorage = (date) => {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatCalendarMonthLabel = (date) =>
    date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const getCalendarDays = (monthDate) => {
    const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
    const leadingEmpty = start.getDay();
    const totalDays = end.getDate();
    const days = [];

    for (let i = 0; i < leadingEmpty; i += 1) {
      days.push(null);
    }

    for (let day = 1; day <= totalDays; day += 1) {
      days.push(new Date(monthDate.getFullYear(), monthDate.getMonth(), day));
    }

    while (days.length % 7 !== 0) {
      days.push(null);
    }

    return days;
  };

  // Kept for compatibility with existing local date-picker modal wiring.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const openPurchaseDatePicker = (target, currentValue) => {
    const baseDate = currentValue ? new Date(currentValue) : new Date();
    const safeDate = Number.isNaN(baseDate.getTime()) ? new Date() : baseDate;
    setDatePickerState({
      visible: true,
      target,
      monthCursor: new Date(safeDate.getFullYear(), safeDate.getMonth(), 1),
    });
  };

  const closePurchaseDatePicker = () => {
    setDatePickerState((prev) => ({ ...prev, visible: false, target: null }));
  };

  const selectPurchaseDate = (date) => {
    const value = formatDateForStorage(date);
    if (datePickerState.target === 'new') {
      setNewShoe((prev) => ({ ...prev, purchaseDate: value }));
    }

    if (datePickerState.target === 'edit') {
      setEditingShoe((prev) => (prev ? { ...prev, purchaseDate: value } : prev));
    }

    closePurchaseDatePicker();
  };

  const renderPurchaseDatePicker = () => {
    if (!datePickerState.visible) {
      return null;
    }

    const days = getCalendarDays(datePickerState.monthCursor);
    const selectedValue =
      datePickerState.target === 'new'
        ? newShoe.purchaseDate
        : editingShoe?.purchaseDate || '';

    return (
      <Modal visible transparent animationType="fade">
        <View style={styles.calendarOverlay}>
          <View style={styles.calendarCard}>
            <View style={styles.calendarHeader}>
              <TouchableOpacity onPress={() => setDatePickerState((prev) => ({ ...prev, monthCursor: new Date(prev.monthCursor.getFullYear(), prev.monthCursor.getMonth() - 1, 1) }))}>
                <Text style={styles.calendarNav}>{'<'}</Text>
              </TouchableOpacity>
              <Text style={styles.calendarTitle}>{formatCalendarMonthLabel(datePickerState.monthCursor)}</Text>
              <TouchableOpacity onPress={() => setDatePickerState((prev) => ({ ...prev, monthCursor: new Date(prev.monthCursor.getFullYear(), prev.monthCursor.getMonth() + 1, 1) }))}>
                <Text style={styles.calendarNav}>{'>'}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.calendarWeekRow}>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                <Text key={`${day}-${index}`} style={styles.calendarWeekday}>{day}</Text>
              ))}
            </View>
            <View style={styles.calendarGrid}>
              {days.map((day, index) => {
                const value = day ? formatDateForStorage(day) : null;
                const selected = value && value === selectedValue;
                return (
                  <TouchableOpacity
                    key={value || `empty-${index}`}
                    style={[styles.calendarDay, selected && styles.calendarDayActive, !day && styles.calendarDayDisabled]}
                    onPress={() => (day ? selectPurchaseDate(day) : null)}
                    disabled={!day}
                  >
                    <Text style={[styles.calendarDayText, selected && styles.calendarDayTextActive]}>{day ? day.getDate() : ''}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity style={styles.btnDanger} onPress={closePurchaseDatePicker}>
              <Text style={styles.btnDangerText}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  const buildHealthWorkoutLogPayload = (workout, shoeId) => ({
    shoeId,
    mileage: workout.distance,
    date: workout.date,
    notes: `From Apple Health - ${workout.type}`,
    source: 'Apple Health',
    sourceLabel: workout.sourceLabel || 'Apple Health',
    sourceCollection: 'health-workouts',
    sourceRecordId: workout.id,
    sourceWorkoutId: workout.sourceWorkoutId,
    activityType: workout.type || workout.activityType || 'Run',
    updatedAt: new Date().toISOString(),
  });

  const openEditLogModal = (log) => {
    setEditingLog({
      ...log,
      mileage: String(log.mileage ?? ''),
      date: log.date || new Date().toISOString().split('T')[0],
      shoeId: log.shoeId || '',
    });
    setShowEditLog(true);
  };

  const toggleImportSelection = (candidateId) => {
    setSelectedImportIds((prev) => (prev.includes(candidateId) ? prev.filter((id) => id !== candidateId) : [...prev, candidateId]));
  };

  const selectAllEligibleImports = () => {
    const eligibleIds = pendingImportWorkouts
      .filter((candidate) => candidate.status === 'ready' || candidate.status === 'deleted')
      .map((candidate) => candidate.previewId);

    const allSelected = eligibleIds.length > 0 && eligibleIds.every((id) => selectedImportIds.includes(id));
    setSelectedImportIds(allSelected ? [] : eligibleIds);
  };

  const clearImportPreview = () => {
    setPendingImportWorkouts([]);
    setSelectedImportIds([]);
    setPreviewAssignedShoes({});
    setCurrentPage('dashboard');
  };

  useEffect(() => {
    if (activeShoes.length !== 1 || pendingImportWorkouts.length === 0) {
      return;
    }

    const onlyShoeId = activeShoes[0].id;
    setPreviewAssignedShoes((prev) => {
      const next = { ...prev };
      let changed = false;

      pendingImportWorkouts.forEach((candidate) => {
        if ((candidate.status === 'ready' || candidate.status === 'deleted') && !next[candidate.previewId]) {
          next[candidate.previewId] = onlyShoeId;
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [activeShoes, pendingImportWorkouts]);

  const topModalStyle = [styles.modalOverlay, styles.modalOverlayTop, { paddingTop: Math.max(insets.top + 18, 56) }];
  const cancelWorkoutSync = () => {
    syncRequestIdRef.current += 1;
    setIsSyncingWorkouts(false);
    setBusyMessage('');
    setLoading(false);
  };

  const isActiveSyncRequest = (requestId) => syncRequestIdRef.current === requestId;

  const renderBusyOverlay = () => {
    if (!busyMessage && !isSyncingWorkouts) {
      return null;
    }

    return (
      <View style={styles.busyOverlay}>
        <ExpoImage source={LOADING_IMAGE} style={styles.loadingArtFullScreen} contentFit="contain" />
        {isSyncingWorkouts ? (
          <TouchableOpacity style={styles.loadingCancelBtn} onPress={cancelWorkoutSync}>
            <Text style={styles.loadingCancelBtnText}>CANCEL</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  const loadGameStats = async (userId) => {
    try {
      const docRef = await getDoc(doc(db, 'users', userId, 'gameStats', 'data'));
      if (docRef.exists()) {
        const data = docRef.data() || {};
        const normalizedStats = {
          coins: 0,
          achievements: [],
          healthLinked: false,
          autoSyncHealthOnOpen: false,
          ...data,
        };
        setGameStats(normalizedStats);
        setHealthAuthorized(Boolean(normalizedStats.healthLinked));
      } else {
        setGameStats({ coins: 0, achievements: [], healthLinked: false, autoSyncHealthOnOpen: false });
        setHealthAuthorized(false);
      }
    } catch (error) {
      console.error('Load stats error:', error);
      setGameStats({ coins: 0, achievements: [], healthLinked: false, autoSyncHealthOnOpen: false });
      setHealthAuthorized(false);
    }
  };

  const persistGameStatsPatch = async (patch) => {
    const nextStats = { ...gameStats, ...patch };
    setGameStats(nextStats);
    if (user?.uid) {
      await setDoc(doc(db, 'users', user.uid, 'gameStats', 'data'), nextStats, { merge: true });
    }
    return nextStats;
  };

  const clearHealthLinkState = async (options = {}) => {
    const { showAlert = false } = options;
    setHealthAuthorized(false);
    await persistGameStatsPatch({ healthLinked: false, autoSyncHealthOnOpen: false });
    autoSyncAttemptedRef.current = '';
    healthAccessValidationRef.current = '';

    if (showAlert) {
      Alert.alert('Apple Health disconnected', HEALTH_RECONNECT_MESSAGE);
    }
  };

  const queueCelebration = (payload) => {
    setCelebrationQueue((prev) => [...prev, payload]);
  };

  const closeCelebration = () => {
    setCelebrationQueue((prev) => prev.slice(1));
  };

  const handleAuth = async () => {
    try {
      if (!email || !password) {
        Alert.alert('Error', 'Enter your email and password.');
        return;
      }
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      setEmail('');
      setPassword('');
    } catch (error) {
      Alert.alert('Error', error?.message || String(error));
    }
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert('Forgot password', 'Enter your email first, then tap FORGOT PASSWORD again.');
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email, {
        url: 'https://shoe-tracker-10000.firebaseapp.com',
        handleCodeInApp: false,
        iOS: {
          bundleId: 'com.caddy515.ShoeTrackerHealth',
        },
      });
      Alert.alert('Email sent', 'Password reset instructions were sent. Check your inbox, spam, and promotions folders.');
    } catch (error) {
      Alert.alert('Reset failed', error?.message || String(error));
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setShoes([]);
      setLogs([]);
      setHealthWorkouts([]);
      setGameStats({ coins: 0, achievements: [], healthLinked: false, autoSyncHealthOnOpen: false });
      setHealthAuthorized(false);
      autoSyncAttemptedRef.current = '';
      setShowStats(false);
      setCurrentPage('dashboard');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setDeleteAccountPassword('');
    } catch (error) {
      Alert.alert('Error', error?.message || String(error));
    }
  };

  const persistPickedPhotoAsset = async (asset) => {
    const uri = asset?.uri;
    if (!uri) return '';
    if (!uri.startsWith('file://') && !uri.startsWith('ph://')) return uri;

    try {
      const documentDirectory = FileSystem.documentDirectory;
      if (!documentDirectory) {
        return uri;
      }

      const targetDirectory = `${documentDirectory}shoe-photos/`;
      const rawName = asset?.fileName || uri.split('/').pop() || `shoe-photo-${Date.now()}.jpg`;
      const extensionMatch = rawName.match(/\.(png|jpg|jpeg|webp|gif)$/i);
      const fileExtension = extensionMatch?.[1] || 'jpg';
      const destination = `${targetDirectory}${user?.uid || 'local'}-${Date.now()}.${fileExtension}`;
      const directoryInfo = await FileSystem.getInfoAsync(targetDirectory);

      if (!directoryInfo.exists) {
        await FileSystem.makeDirectoryAsync(targetDirectory, { intermediates: true });
      }

      await FileSystem.copyAsync({ from: uri, to: destination });
      return destination;
    } catch (error) {
      console.warn('Immediate local photo persistence failed, keeping picked URI:', error);
      return uri;
    }
  };

  const pickShoePhotoFromLibrary = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Please allow photo library access to add a shoe photo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.7,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        const localPhotoUrl = await persistPickedPhotoAsset(result.assets[0]);
        setNewShoe((prev) => ({ ...prev, photoUrl: localPhotoUrl }));
      }
    } catch (error) {
      Alert.alert('Error', error?.message || String(error));
    }
  };

  const takeShoePhotoWithCamera = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Please allow camera access to take a shoe photo.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.7,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        const localPhotoUrl = await persistPickedPhotoAsset(result.assets[0]);
        setNewShoe((prev) => ({ ...prev, photoUrl: localPhotoUrl }));
      }
    } catch (error) {
      Alert.alert('Error', error?.message || String(error));
    }
  };

  const uploadShoePhotoIfNeeded = async (uri) => {
    if (!uri) return '';
    if (!uri.startsWith('file://') && !uri.startsWith('ph://')) return uri;

    const persistPhotoLocally = async () => {
      try {
        const documentDirectory = FileSystem.documentDirectory;
        if (!documentDirectory) {
          return uri;
        }

        const targetDirectory = `${documentDirectory}shoe-photos/`;
        const fileExtension = uri.match(/\.(png|jpg|jpeg|webp|gif)$/i)?.[1] || 'jpg';
        const destination = `${targetDirectory}${user.uid}-${Date.now()}.${fileExtension}`;
        const directoryInfo = await FileSystem.getInfoAsync(targetDirectory);

        if (!directoryInfo.exists) {
          await FileSystem.makeDirectoryAsync(targetDirectory, { intermediates: true });
        }

        if (uri.startsWith('ph://')) {
          const copied = await FileSystem.copyAsync({ from: uri, to: destination }).then(() => destination).catch(() => null);
          if (copied) {
            return copied;
          }
        }

        await FileSystem.copyAsync({ from: uri, to: destination });
        return destination;
      } catch (localError) {
        console.warn('Local photo persistence failed, keeping original URI:', localError);
        return uri;
      }
    };

    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const storageRef = ref(storage, `users/${user.uid}/shoe-photos/${Date.now()}.jpg`);
      await uploadBytes(storageRef, blob);
      return await getDownloadURL(storageRef);
    } catch (error) {
      console.warn('Photo upload failed, persisting local photo instead:', error);
      return await persistPhotoLocally();
    }
  };

  const pickEditShoePhotoFromLibrary = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Please allow photo library access to add a shoe photo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.7,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        const localPhotoUrl = await persistPickedPhotoAsset(result.assets[0]);
        setEditingShoe((prev) => (prev ? { ...prev, photoUrl: localPhotoUrl } : prev));
      }
    } catch (error) {
      Alert.alert('Error', error?.message || String(error));
    }
  };

  const takeEditShoePhotoWithCamera = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Please allow camera access to take a shoe photo.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.7,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        const localPhotoUrl = await persistPickedPhotoAsset(result.assets[0]);
        setEditingShoe((prev) => (prev ? { ...prev, photoUrl: localPhotoUrl } : prev));
      }
    } catch (error) {
      Alert.alert('Error', error?.message || String(error));
    }
  };

  const handleDeleteShoe = async (shoeId) => {
    Alert.alert('Delete shoe', 'Delete this shoe and all of its logs?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'users', user.uid, 'shoes', shoeId));

            const shoeLogs = logs.filter((log) => log.shoeId === shoeId);
            for (const log of shoeLogs) {
              if (log.sourceCollection === 'health-workouts' && log.sourceRecordId) {
                await archiveWorkoutDeletion(log.sourceRecordId, log.id);
                continue;
              }

              if (log.id) {
                await deleteDoc(doc(db, 'users', user.uid, 'logs', log.id));
              }
            }

            setShoes((prev) => prev.filter((shoe) => shoe.id !== shoeId));
            setLogs((prev) => prev.filter((log) => log.shoeId !== shoeId));
            await loadHealthWorkouts(user.uid);
            await loadShoes(user.uid);
            await loadLogs(user.uid);
            setShowEditShoe(false);
            setEditingShoe(null);
            setSelectedShoe(null);
            setCurrentPage('dashboard');
          } catch (error) {
            Alert.alert('Error', error?.message || String(error));
          }
        },
      },
    ]);
  };

  const requestHealthKitPermission = async (options = {}) => {
    const { silentSuccess = false, suppressErrorAlert = false } = options;
    try {
      if (Platform.OS !== 'ios') {
        if (!suppressErrorAlert) {
          Alert.alert('Unsupported', 'Apple Health is available on iOS only.');
        }
        return false;
      }

      if (isIpadDevice()) {
        if (!suppressErrorAlert) {
          Alert.alert('Health sync on iPhone', IPAD_HEALTH_SYNC_MESSAGE);
        }
        return false;
      }

      const healthKit = resolveAppleHealthKit();
      console.log('HealthKit module keys:', Object.keys(healthKit || {}), 'init:', typeof healthKit?.initHealthKit, 'workouts:', typeof healthKit?.getWorkouts, 'samples:', typeof healthKit?.getSamples);

      if (!healthKit || typeof healthKit.initHealthKit !== 'function') {
        if (!suppressErrorAlert) {
          Alert.alert(
            'HealthKit unavailable',
            'This build does not include the Apple Health native module. Install an EAS iOS build (not Expo Go) and try again.'
          );
        }
        return false;
      }

      const healthKitPermissions = healthKit?.Constants?.Permissions || {};
      const workoutPermission = healthKitPermissions.HKWorkoutTypeIdentifier || healthKitPermissions.Workout || 'Workout';
      console.log('[HealthAuth] requesting workout permission', { workoutPermission });

      const permissions = {
        permissions: {
          read: [workoutPermission],
        },
      };

      const granted = await new Promise((resolve) => {
        healthKit.initHealthKit(permissions, async (err) => {
          if (err) {
            console.error('HealthKit init error:', err);
            await clearHealthLinkState();
            if (!suppressErrorAlert) {
              Alert.alert('Error', 'Could not access Apple Health. Please enable in Settings.');
            }
            resolve(false);
            return;
          }

          setHealthAuthorized(true);
          await persistGameStatsPatch({ healthLinked: true });
          awardAchievement('linked');
          if (!silentSuccess) {
            Alert.alert('Success', 'Apple Health authorized for workouts.');
          }
          resolve(true);
        });
      });

      return granted;
    } catch (error) {
      console.error('Health permission error:', error);
      if (!suppressErrorAlert) {
        Alert.alert('Error', error?.message || String(error));
      }
      return false;
    }
  };

  const getWorkoutDistanceMeters = (workout) => {
    const possibleDistance =
      workout?.distance ??
      workout?.totalDistance ??
      workout?.distanceWalkingRunning ??
      workout?.quantity ??
      workout?.valueMiles ??
      workout?.value ??
      workout?.metadata?.distance;

    const distance = Number(possibleDistance);
    if (!Number.isFinite(distance)) {
      return 0;
    }

    const declaredUnit = String(workout?.unit || workout?.distanceUnit || '').toLowerCase();
    if (declaredUnit.includes('meter')) {
      return distance * MILES_PER_METER;
    }

    return distance;
  };

  const getWorkoutStartDate = (workout) => {
    const rawDate = workout?.startDate ?? workout?.start ?? workout?.endDate;
    const date = rawDate ? new Date(rawDate) : null;
    return date && !Number.isNaN(date.getTime()) ? date : null;
  };

  const buildWorkoutFingerprint = (workout) => {
    const startDate = getWorkoutStartDate(workout);
    const start = startDate ? startDate.toISOString() : 'unknown-start';
    const duration = workout?.duration || 0;
    const activity = workout?.activityName || workout?.workoutActivityType || workout?.type || 'workout';
    const distance = getWorkoutDistanceMeters(workout);
    return `${start}|${duration}|${activity}|${distance}`;
  };

  const callHealthKitCallbackMethod = (healthKit, methodName, options) =>
    new Promise((resolve, reject) => {
      if (typeof healthKit?.[methodName] !== 'function') {
        resolve(null);
        return;
      }

      healthKit[methodName](options, (err, results) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(results);
      });
    });

  const callHealthKitCallbackMethodWithTimeout = async (healthKit, methodName, options, timeoutMs = 8000) => {
    let timeoutId;
    const startedAt = Date.now();

    console.log('[HealthSync] starting method', {
      methodName,
      timeoutMs,
      startDate: options?.startDate,
      endDate: options?.endDate,
      limit: options?.limit,
      type: options?.type,
      period: options?.period,
      includeManuallyAdded: options?.includeManuallyAdded,
    });

    try {
      const result = await Promise.race([
        callHealthKitCallbackMethod(healthKit, methodName, options),
        new Promise((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error(`${methodName} timed out`)), timeoutMs);
        }),
      ]);

      console.log('[HealthSync] method success', {
        methodName,
        durationMs: Date.now() - startedAt,
        resultCount: Array.isArray(result) ? result.length : result ? 1 : 0,
      });

      return result;
    } catch (error) {
      console.error('[HealthSync] method failed', {
        methodName,
        durationMs: Date.now() - startedAt,
        message: error?.message || String(error),
      });
      throw error;
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  };

  const mergeWorkoutResults = (...resultSets) => {
    const merged = [];
    const seen = new Set();

    resultSets.flat().filter(Boolean).forEach((workout) => {
      const fingerprint = buildWorkoutFingerprint(workout);
      if (seen.has(fingerprint)) {
        return;
      }

      seen.add(fingerprint);
      merged.push(workout);
    });

    return merged;
  };

  const fetchHealthKitWorkoutCandidates = async (healthKit, options) => {
    const errors = [];
    const resultSets = [];

    console.log('[HealthSync] candidate fetch starting', {
      startDate: options?.startDate,
      endDate: options?.endDate,
      limit: options?.limit,
      syncDays,
    });

    try {
      const workoutSamples = await callHealthKitCallbackMethodWithTimeout(healthKit, 'getSamples', {
        ...options,
        type: 'Workout',
        unit: 'mile',
      }, 10000);
      if (Array.isArray(workoutSamples) && workoutSamples.length > 0) {
        resultSets.push(workoutSamples);
      }
      console.log('[HealthSync] primary workout query finished', {
        workoutCount: Array.isArray(workoutSamples) ? workoutSamples.length : 0,
      });
    } catch (error) {
      errors.push(error);
    }

    const merged = mergeWorkoutResults(...resultSets).map((workout) => ({
      ...workout,
      sourceLabel: normalizeWorkoutSourceLabel(workout),
      sourceKind: 'workout',
    }));

    console.log('[HealthSync] candidate fetch complete', {
      mergedCount: merged.length,
      errorCount: errors.length,
    });

    return { results: merged, errors };
  };

  const describeHealthKitReadError = (error) => {
    const message = error?.message || String(error || '');

    if (message.includes('error getting samples')) {
      return 'No workout samples were returned. Check Health app permissions for this app, confirm workouts exist in the selected date range, and try again.';
    }

    if (message.includes('HealthKit workout APIs unavailable')) {
      return 'This build does not include Apple Health workout APIs. Install a fresh EAS iOS build and try again.';
    }

    return 'Could not fetch workouts from Apple Health.';
  };

  const isEmptyHealthKitWorkoutRead = (error) => {
    const message = error?.message || String(error || '');
    return message.includes('error getting samples');
  };

  const validateStoredHealthAccess = async (options = {}) => {
    const { showAlert = false } = options;

    if (Platform.OS !== 'ios' || isIpadDevice() || !user?.uid || !gameStats.healthLinked) {
      return true;
    }

    const healthKit = resolveAppleHealthKit();
    if (!healthKit || typeof healthKit.getSamples !== 'function') {
      await clearHealthLinkState({ showAlert });
      return false;
    }

    const now = new Date();
    const rangeStartDate = new Date(now);
    rangeStartDate.setFullYear(rangeStartDate.getFullYear() - 10);

    try {
      await callHealthKitCallbackMethodWithTimeout(healthKit, 'getSamples', {
        startDate: rangeStartDate.toISOString(),
        endDate: now.toISOString(),
        ascending: false,
        limit: 1,
        type: 'Workout',
        unit: 'mile',
      }, 5000);
      setHealthAuthorized(true);
      return true;
    } catch (error) {
      console.warn('Stored HealthKit access validation failed:', error);
      if (isEmptyHealthKitWorkoutRead(error)) {
        await clearHealthLinkState({ showAlert });
      }
      return false;
    }
  };

  const fetchWorkoutCandidatesWithTimeout = (healthKit, options, timeoutMs = 15000) =>
    Promise.race([
      fetchHealthKitWorkoutCandidates(healthKit, options),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Apple Health request timed out')), timeoutMs);
      }),
    ]);

  const syncWorkouts = async () => {
    if (Platform.OS !== 'ios') {
      Alert.alert('Unsupported', 'Apple Health sync is available on iOS only.');
      return;
    }

    if (isIpadDevice()) {
      Alert.alert('Health sync on iPhone', IPAD_HEALTH_SYNC_MESSAGE);
      return;
    }

    if (!healthAuthorized) {
      const granted = await requestHealthKitPermission({ silentSuccess: true, suppressErrorAlert: true });
      if (!granted) {
        Alert.alert('Error', 'Please authorize Apple Health first.');
        return;
      }
    }

    if (!user?.uid) {
      Alert.alert('Error', 'Please log in again and retry sync.');
      return;
    }

    const requestId = syncRequestIdRef.current + 1;
    syncRequestIdRef.current = requestId;
    setLoading(false);
    setIsSyncingWorkouts(true);
    try {
      const now = new Date();
      const rangeStartDate = new Date(now);
      rangeStartDate.setHours(0, 0, 0, 0);
      rangeStartDate.setDate(rangeStartDate.getDate() - Math.max(syncDays - 1, 0));

      const options = {
        startDate: rangeStartDate.toISOString(),
        endDate: now.toISOString(),
        ascending: false,
        limit: 250,
      };

      console.log('[HealthSync] sync requested', {
        syncDays,
        startDate: options.startDate,
        endDate: options.endDate,
      });

      const healthKit = resolveAppleHealthKit();

      if (!healthKit || typeof healthKit.getSamples !== 'function') {
        Alert.alert('HealthKit unavailable', 'This build does not include Apple Health workout APIs.');
        return;
      }

      try {
        setBusyMessage('Loading Apple Health workouts...');
        const { results, errors } = await fetchWorkoutCandidatesWithTimeout(healthKit, options);

        if (!isActiveSyncRequest(requestId)) {
          return;
        }

        console.log('[HealthSync] sync fetch returned', {
          resultCount: Array.isArray(results) ? results.length : 0,
          errorCount: errors.length,
          errorMessages: errors.map((error) => error?.message || String(error)),
        });

        if ((!results || results.length === 0) && errors.length > 0) {
          const err = errors[0];
          console.error('Get workouts error:', {
            error: err,
            message: err?.message || String(err),
            hasGetSamples: typeof healthKit?.getSamples === 'function',
            options,
          });
          if (isEmptyHealthKitWorkoutRead(err)) {
            await clearHealthLinkState();
          }
          Alert.alert(
            isEmptyHealthKitWorkoutRead(err) ? 'No workouts found' : 'Apple Health sync failed',
            isEmptyHealthKitWorkoutRead(err) ? HEALTH_RECONNECT_MESSAGE : describeHealthKitReadError(err)
          );
          setBusyMessage('');
          return;
        }

        if (!results || results.length === 0) {
          setPendingImportWorkouts([]);
          setSelectedImportIds([]);
          setPreviewAssignedShoes({});
          setCurrentPage('syncPreview');
          setBusyMessage('');
          return;
        }

        const existingSnapshot = await getDocs(query(collection(db, 'users', user.uid, 'health-workouts')));
        const existingWorkoutMap = new Map(
          existingSnapshot.docs
            .map((workoutDoc) => {
              const data = workoutDoc.data();
              return data?.sourceWorkoutId ? [data.sourceWorkoutId, { id: workoutDoc.id, ...data }] : null;
            })
            .filter(Boolean)
        );
        const previewCandidates = results.map((workout, index) => {
          const sourceWorkoutId = buildWorkoutFingerprint(workout);
          const workoutStartDate = getWorkoutStartDate(workout);
          const distanceMiles = getWorkoutDistanceMeters(workout);
          const validDistance = Number.isFinite(distanceMiles) ? distanceMiles : 0;
          const existingWorkout = existingWorkoutMap.get(sourceWorkoutId) || null;
          const normalizedType = normalizeWorkoutType(workout);
          let status = 'ready';

          if (!isRunningWorkoutType(workout) || !workoutStartDate || validDistance <= 0) {
            status = 'invalid';
          } else if (existingWorkout?.deleted) {
            status = 'deleted';
          } else if (existingWorkout) {
            status = 'update';
          }

          return {
            previewId: `${sourceWorkoutId}-${index}`,
            sourceWorkoutId,
            type: normalizedType,
            date: workoutStartDate ? workoutStartDate.toISOString().split('T')[0] : 'Unknown date',
            distance: Number(validDistance.toFixed(2)),
            duration: workout?.duration || 0,
            sourceLabel: normalizeWorkoutSourceLabel(workout),
            sourceKind: workout?.sourceKind || 'workout',
            existingRecordId: existingWorkout?.id || null,
            existingAssigned: Boolean(existingWorkout?.assigned),
            existingAssignedShoeId: existingWorkout?.assignedShoeId || null,
            existingAssignedLogId: existingWorkout?.assignedLogId || null,
            status,
          };
        });

        console.log('[HealthSync] preview candidates built', {
          candidateCount: previewCandidates.length,
          readyCount: previewCandidates.filter((candidate) => candidate.status === 'ready').length,
          updateCount: previewCandidates.filter((candidate) => candidate.status === 'update').length,
          invalidCount: previewCandidates.filter((candidate) => candidate.status === 'invalid').length,
          deletedCount: previewCandidates.filter((candidate) => candidate.status === 'deleted').length,
          sampleSources: previewCandidates.slice(0, 5).map((candidate) => ({
            date: candidate.date,
            distance: candidate.distance,
            sourceLabel: candidate.sourceLabel,
            status: candidate.status,
          })),
        });

        setPendingImportWorkouts(previewCandidates);
        setSelectedImportIds(previewCandidates.filter((candidate) => candidate.status === 'ready' || candidate.status === 'deleted').map((candidate) => candidate.previewId));
        setPreviewAssignedShoes(
          Object.fromEntries(
            previewCandidates.map((candidate) => [candidate.previewId, candidate.existingAssignedShoeId || ''])
          )
        );
        setCurrentPage('syncPreview');
      } catch (innerError) {
        if (!isActiveSyncRequest(requestId)) {
          return;
        }
        console.error('Sync processing error:', innerError);
        const message = innerError?.message || 'Failed while loading workouts.';
        Alert.alert(
          'Apple Health sync failed',
          message === 'Apple Health request timed out'
            ? 'Apple Health did not finish the workout query in time. Try again, narrow the timeframe, or re-open the app and retry.'
            : message
        );
      } finally {
        if (isActiveSyncRequest(requestId)) {
          setBusyMessage('');
        }
      }
    } catch (error) {
      if (!isActiveSyncRequest(requestId)) {
        return;
      }
      console.error('Sync error:', error);
      Alert.alert('Error', error?.message || String(error));
    } finally {
      if (isActiveSyncRequest(requestId)) {
        setIsSyncingWorkouts(false);
        setLoading(false);
      }
    }
  };

  const archiveWorkoutDeletion = async (workoutId, assignedLogId = null) => {
    if (assignedLogId) {
      await deleteDoc(doc(db, 'users', user.uid, 'logs', assignedLogId));
    }

    await setDoc(
      doc(db, 'users', user.uid, 'health-workouts', workoutId),
      {
        deleted: true,
        assigned: false,
        assignedShoeId: null,
        assignedLogId: null,
        deletedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  };

  const handleAddShoe = async () => {
    if (!newShoe.name || !newShoe.brand) {
      Alert.alert('Error', 'Fill all fields');
      return;
    }

    try {
      const persistedPhotoUrl = await uploadShoePhotoIfNeeded(newShoe.photoUrl || '');
      const normalizedPurchaseDate = formatPurchaseDateDisplay(newShoe.purchaseDate);
      const docRef = await addDoc(collection(db, 'users', user.uid, 'shoes'), {
        name: newShoe.name,
        brand: newShoe.brand,
        purchaseDate: normalizedPurchaseDate,
        targetMileage: parseFloat(newShoe.targetMileage),
        photoUrl: persistedPhotoUrl,
        createdAt: new Date().toISOString(),
      });

      const updatedShoes = [...shoes, { ...newShoe, id: docRef.id, purchaseDate: normalizedPurchaseDate, targetMileage: parseFloat(newShoe.targetMileage), photoUrl: persistedPhotoUrl }];
      setShoes(updatedShoes);
      if (updatedShoes.length === 3) {
        awardAchievement('collector');
      }
      setNewShoe({ name: '', brand: '', purchaseDate: '', targetMileage: '300', photoUrl: '' });
      closePurchaseDatePicker();
      setShowAddShoe(false);
      setCurrentPage('dashboard');
      Keyboard.dismiss();
      await loadShoes(user.uid);
    } catch (error) {
      Alert.alert('Error', error?.message || String(error));
    }
  };

  const handleSaveShoeEdits = async () => {
    if (!editingShoe?.id || !editingShoe?.name || !editingShoe?.brand) {
      Alert.alert('Error', 'Shoe must have a name and brand.');
      return;
    }

    try {
      setBusyMessage('Saving shoe...');
      setShowEditShoe(false);
      const persistedPhotoUrl = await uploadShoePhotoIfNeeded(editingShoe.photoUrl || '');
      const normalizedPurchaseDate = formatPurchaseDateDisplay(editingShoe.purchaseDate || '');
      const payload = {
        name: editingShoe.name,
        brand: editingShoe.brand,
        purchaseDate: normalizedPurchaseDate,
        targetMileage: parseFloat(editingShoe.targetMileage || '300'),
        photoUrl: persistedPhotoUrl,
        retired: Boolean(editingShoe.retired),
      };

      await setDoc(doc(db, 'users', user.uid, 'shoes', editingShoe.id), payload, { merge: true });
      setShoes((prev) => prev.map((shoe) => (shoe.id === editingShoe.id ? { ...shoe, ...payload } : shoe)));
      setShowEditShoe(false);
      setEditingShoe(null);
      Keyboard.dismiss();
    } catch (error) {
      Alert.alert('Error', error?.message || String(error));
    } finally {
      setBusyMessage('');
    }
  };

  const handleRetireToggle = async () => {
    if (!editingShoe?.id) return;

    try {
      const retired = !editingShoe.retired;
      await setDoc(doc(db, 'users', user.uid, 'shoes', editingShoe.id), { retired }, { merge: true });
      setShoes((prev) => prev.map((shoe) => (shoe.id === editingShoe.id ? { ...shoe, retired } : shoe)));
      setEditingShoe((prev) => (prev ? { ...prev, retired } : prev));
      Alert.alert('Success', retired ? 'Shoe moved to retired.' : 'Shoe moved back to active.');
    } catch (error) {
      Alert.alert('Error', error?.message || String(error));
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

      await ensureFirstStepAchievement(updatedLogs.length);
      const totalMiles = updatedLogs.reduce((sum, log) => sum + log.mileage, 0);
      if (totalMiles >= 13.1) await awardAchievement('halfMiler');
      if (shoes.length >= 3) await awardAchievement('collector');

      setNewLog({ shoeId: '', mileage: '', date: new Date().toISOString().split('T')[0], notes: '' });
      setShowAddLog(false);
      Keyboard.dismiss();
    } catch (error) {
      Alert.alert('Error', error?.message || String(error));
    }
  };

  const handleSaveLogEdits = async () => {
    if (!editingLog?.id || !editingLog?.shoeId || !editingLog?.mileage || !editingLog?.date) {
      Alert.alert('Error', 'Mileage, date, and shoe are required.');
      return;
    }

    try {
      setBusyMessage('Updating activity...');
      setShowEditLog(false);
      const mileage = parseFloat(editingLog.mileage);
      if (!Number.isFinite(mileage) || mileage <= 0) {
        Alert.alert('Error', 'Mileage must be a valid number greater than zero.');
        return;
      }

      const logPayload = {
        shoeId: editingLog.shoeId,
        mileage,
        date: editingLog.date,
        notes: editingLog.notes || '',
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'users', user.uid, 'logs', editingLog.id), logPayload, { merge: true });

      if (editingLog.sourceCollection === 'health-workouts' && editingLog.sourceRecordId) {
        await setDoc(
          doc(db, 'users', user.uid, 'health-workouts', editingLog.sourceRecordId),
          {
            distance: mileage,
            date: editingLog.date,
            assigned: true,
            assignedShoeId: editingLog.shoeId,
            assignedLogId: editingLog.id,
            deleted: false,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }

      await loadLogs(user.uid);
      await loadHealthWorkouts(user.uid);
      setEditingLog(null);
      Alert.alert('Success', 'Workout updated.');
    } catch (error) {
      Alert.alert('Error', error?.message || String(error));
    } finally {
      setBusyMessage('');
    }
  };

  const handleDeleteLogEntry = () => {
    if (!editingLog?.id) return;

    Alert.alert('Delete entry', 'Delete this activity log entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            if (editingLog.sourceCollection === 'health-workouts' && editingLog.sourceRecordId) {
              await archiveWorkoutDeletion(editingLog.sourceRecordId, editingLog.id);
              await loadHealthWorkouts(user.uid);
            } else {
              await deleteDoc(doc(db, 'users', user.uid, 'logs', editingLog.id));
            }

            await loadLogs(user.uid);
            setShowEditLog(false);
            setEditingLog(null);
          } catch (error) {
            Alert.alert('Error', error?.message || String(error));
          }
        },
      },
    ]);
  };

  const importSelectedWorkouts = async () => {
    const candidatesToImport = pendingImportWorkouts.filter(
      (candidate) =>
        selectedImportIds.includes(candidate.previewId) &&
        (candidate.status === 'ready' || candidate.status === 'deleted')
    );

    if (candidatesToImport.length === 0) {
      Alert.alert('No workouts selected', 'Choose at least one workout to import.');
      return;
    }

    const missingAssignments = candidatesToImport.filter((candidate) => !previewAssignedShoes[candidate.previewId]);
    if (missingAssignments.length > 0) {
      Alert.alert('Assign shoes first', 'Choose an active shoe for every selected workout before importing.');
      return;
    }

    try {
      setBusyMessage('Importing selected workouts...');
      let createdLogCount = 0;
      let importedMiles = 0;

      for (const workout of candidatesToImport) {
        const assignedShoeId = previewAssignedShoes[workout.previewId];
        const workoutPayload = {
          type: workout.type,
          activityType: workout.type,
          distance: workout.distance,
          date: workout.date,
          duration: workout.duration,
          source: 'Apple Health',
          sourceLabel: workout.sourceLabel || 'Apple Health',
          sourceKind: workout.sourceKind || 'workout',
          sourceWorkoutId: workout.sourceWorkoutId,
          importedAt: new Date().toISOString(),
          assigned: true,
          assignedShoeId,
          assignedLogId: null,
          deleted: false,
        };

        let healthWorkoutId = workout.existingRecordId || null;
        if (healthWorkoutId) {
          await setDoc(
            doc(db, 'users', user.uid, 'health-workouts', healthWorkoutId),
            {
              ...workoutPayload,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        } else {
          const createdWorkoutRef = await addDoc(collection(db, 'users', user.uid, 'health-workouts'), workoutPayload);
          healthWorkoutId = createdWorkoutRef.id;
        }

        const logRef = await addDoc(collection(db, 'users', user.uid, 'logs'), {
          ...buildHealthWorkoutLogPayload(
            {
              ...workout,
              id: healthWorkoutId,
            },
            assignedShoeId
          ),
          createdAt: new Date().toISOString(),
        });

        await setDoc(
          doc(db, 'users', user.uid, 'health-workouts', healthWorkoutId),
          {
            assigned: true,
            assignedShoeId,
            assignedLogId: logRef.id,
            deleted: false,
            assignedAt: new Date().toISOString(),
          },
          { merge: true }
        );

        createdLogCount += 1;
        importedMiles += Number(workout.distance) || 0;
      }

      if (createdLogCount > 0) {
        const bonusCoins = createdLogCount * 10 + Math.floor(importedMiles);
        const newStats = { ...gameStats, coins: (gameStats.coins || 0) + bonusCoins };
        setGameStats(newStats);
        await setDoc(doc(db, 'users', user.uid, 'gameStats', 'data'), newStats, { merge: true });
        await ensureFirstStepAchievement(logs.length + createdLogCount);
      }

      await loadLogs(user.uid);
      await loadHealthWorkouts(user.uid);
      await loadGameStats(user.uid);
      clearImportPreview();
      Alert.alert('Success', `Imported ${candidatesToImport.length} workout(s).`);
    } catch (error) {
      Alert.alert('Error', error?.message || String(error));
    } finally {
      setBusyMessage('');
    }
  };

  const handleUpdatePassword = async () => {
    if (!user?.email) {
      Alert.alert('Error', 'No signed-in user found.');
      return;
    }

    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      Alert.alert('Error', 'Enter your current password and a new password.');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      Alert.alert('Error', 'New password and confirmation must match.');
      return;
    }

    try {
      const credential = EmailAuthProvider.credential(user.email, passwordForm.currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, passwordForm.newPassword);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      Alert.alert('Success', 'Password updated.');
    } catch (error) {
      Alert.alert('Password update failed', error?.message || String(error));
    }
  };

  const deleteUserCollectionDocs = async (userId, collectionName) => {
    const snapshot = await getDocs(query(collection(db, 'users', userId, collectionName)));
    for (const docSnapshot of snapshot.docs) {
      await deleteDoc(docSnapshot.ref);
    }
  };

  const deleteStoragePhotoByUrl = async (photoUrl) => {
    if (!photoUrl || String(photoUrl).startsWith('file://')) {
      return;
    }

    try {
      await deleteObject(ref(storage, photoUrl));
    } catch (error) {
      console.warn('Account deletion photo cleanup skipped:', error);
    }
  };

  const deleteUserStoragePhotos = async (userId) => {
    try {
      const photoFolderRef = ref(storage, `users/${userId}/shoe-photos`);
      const listedPhotos = await listAll(photoFolderRef);
      for (const itemRef of listedPhotos.items) {
        await deleteObject(itemRef);
      }
    } catch (error) {
      console.warn('Account deletion storage cleanup skipped:', error);
    }
  };

  const deleteUserAppData = async (userId) => {
    const shoeSnapshot = await getDocs(query(collection(db, 'users', userId, 'shoes')));
    await deleteUserCollectionDocs(userId, 'logs');
    await deleteUserCollectionDocs(userId, 'health-workouts');
    await deleteUserCollectionDocs(userId, 'gameStats');
    for (const docSnapshot of shoeSnapshot.docs) {
      await deleteStoragePhotoByUrl(docSnapshot.data()?.photoUrl);
      await deleteDoc(docSnapshot.ref);
    }
    await deleteDoc(doc(db, 'users', userId));
    await deleteUserStoragePhotos(userId);
  };

  const confirmDeleteAccount = async () => {
    if (!user?.email || !auth.currentUser) {
      Alert.alert('Error', 'No signed-in user found.');
      return;
    }

    if (!deleteAccountPassword) {
      Alert.alert('Password required', 'Enter your current password before deleting your account.');
      return;
    }

    try {
      Keyboard.dismiss();
      setBusyMessage('Deleting account...');
      const userId = auth.currentUser.uid;
      const credential = EmailAuthProvider.credential(user.email, deleteAccountPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await deleteUserAppData(userId);
      await deleteUser(auth.currentUser);

      setShoes([]);
      setLogs([]);
      setHealthWorkouts([]);
      setGameStats({ coins: 0, achievements: [], healthLinked: false, autoSyncHealthOnOpen: false });
      setHealthAuthorized(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setDeleteAccountPassword('');
      setCurrentPage('login');
      Alert.alert('Account deleted', 'Your account and Shoe Tracker 10000 data have been deleted.');
    } catch (error) {
      Alert.alert('Account deletion failed', error?.message || String(error));
    } finally {
      setBusyMessage('');
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete account',
      'This permanently deletes your account, shoes, run logs, Apple Health workout imports, game stats, and uploaded shoe photos. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete account', style: 'destructive', onPress: confirmDeleteAccount },
      ]
    );
  };

  const awardAchievement = async (achievementId) => {
    if (!gameStats.achievements || !gameStats.achievements.includes(achievementId)) {
      const achievement = ACHIEVEMENTS[achievementId];
      setUnlockedAchievement(achievement);
      const newCoins = (gameStats.coins || 0) + achievement.coins;
      const newAchievements = [...(gameStats.achievements || []), achievementId];
      const newStats = { coins: newCoins, achievements: newAchievements };
      const previousLevel = getRunnerLevelDetails(gameStats.coins || 0);
      const nextLevel = getRunnerLevelDetails(newCoins);
      setGameStats(newStats);
      await setDoc(doc(db, 'users', user.uid, 'gameStats', 'data'), newStats, { merge: true });
      queueCelebration({
        id: `achievement-${achievement.id}-${Date.now()}`,
        title: 'ACHIEVEMENT UNLOCKED',
        name: achievement.name,
        description: getCelebrationMessage('achievement', achievement.name),
        buttonLabel: 'LETS GO',
        image: CELEBRATION_IMAGE,
      });
      if (nextLevel.levelNumber > previousLevel.levelNumber) {
        queueCelebration({
          id: `level-${nextLevel.levelNumber}-${Date.now()}`,
          title: 'LEVEL UP',
          name: `${nextLevel.title}`,
          description: getCelebrationMessage('level', nextLevel.title),
          buttonLabel: 'LETS GO',
          image: CELEBRATION_IMAGE,
        });
      }
      setTimeout(() => setUnlockedAchievement(null), 3000);
    }
  };

  const ensureFirstStepAchievement = async (logCount) => {
    if ((Number(logCount) || 0) >= 1 && !(gameStats.achievements || []).includes('firstStep')) {
      await awardAchievement('firstStep');
    }
  };

  const isHealthLinked = Boolean(healthAuthorized || gameStats.healthLinked);

  const handleHealthSettingsButton = async () => {
    if (isHealthLinked) {
      Alert.alert(
        'Manage Apple Health access',
        'To remove access, open the Apple Health app, go to Sharing, tap Apps and Services, choose Shoe Tracker 10000, and turn access off there.',
        [
          { text: 'OK', style: 'cancel' },
          { text: 'I TURNED IT OFF', style: 'destructive', onPress: () => clearHealthLinkState({ showAlert: true }) },
        ]
      );
      return;
    }

    await requestHealthKitPermission();
  };

  const toggleAutoSyncOnOpen = async () => {
    if (!gameStats.autoSyncHealthOnOpen && !isHealthLinked) {
      Alert.alert('Authorize Apple Health first', 'Connect Apple Health before turning on automatic workout sync.');
      return;
    }

    const nextValue = !gameStats.autoSyncHealthOnOpen;
    await persistGameStatsPatch({ autoSyncHealthOnOpen: nextValue });
    Alert.alert('Saved', nextValue ? 'Automatic workout sync is now on when you open the app.' : 'Automatic workout sync is now off.');
  };

  validateStoredHealthAccessRef.current = validateStoredHealthAccess;
  requestHealthKitPermissionRef.current = requestHealthKitPermission;
  syncWorkoutsRef.current = syncWorkouts;

  useEffect(() => {
    if (!user?.uid || loading || !gameStats.healthLinked) {
      return;
    }

    const validationKey = `${user.uid}:${gameStats.healthLinked}`;
    if (healthAccessValidationRef.current === validationKey) {
      return;
    }

    healthAccessValidationRef.current = validationKey;
    validateStoredHealthAccessRef.current?.();
  }, [user, loading, gameStats.healthLinked]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && user?.uid && gameStats.healthLinked) {
        validateStoredHealthAccessRef.current?.();
      }
    });

    return () => subscription.remove();
  }, [user, gameStats.healthLinked]);

  useEffect(() => {
    if (!user?.uid || loading) {
      return;
    }

    if (!gameStats.autoSyncHealthOnOpen || !gameStats.healthLinked) {
      return;
    }

    if (autoSyncAttemptedRef.current === user.uid) {
      return;
    }

    autoSyncAttemptedRef.current = user.uid;

    (async () => {
      const granted = healthAuthorized
        ? true
        : await requestHealthKitPermissionRef.current?.({ silentSuccess: true, suppressErrorAlert: true });

      if (granted) {
        await syncWorkoutsRef.current?.();
      }
    })();
  }, [user, loading, gameStats.autoSyncHealthOnOpen, gameStats.healthLinked, healthAuthorized]);

  if (loading || !fontsLoaded) {
    return (
      <View style={styles.container}>
        <View style={styles.busyOverlayStatic}>
          <ExpoImage source={STARTUP_IMAGE} style={styles.startupIcon} contentFit="contain" />
        </View>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.loginKeyboardWrap}>
          <ScrollView contentContainerStyle={styles.loginScrollContent} keyboardShouldPersistTaps="handled">
            <View style={styles.loginHeader}>
              <ExpoImage source={LOGIN_APP_IMAGE} style={styles.loginHeroImage} contentFit="contain" />
              <Text style={styles.loginSubtitle}>Record your shoe mileage, and play to win!</Text>
            </View>

            <View style={styles.loginForm}>
              <TextInput
                style={styles.input}
                placeholder="EMAIL"
                placeholderTextColor="#666"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
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
              {!isSignUp ? (
                <TouchableOpacity style={styles.forgotPasswordBtn} onPress={handleForgotPassword}>
                  <Text style={styles.forgotPasswordText}>FORGOT PASSWORD?</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
                <Text style={styles.toggleAuth}>{isSignUp ? 'HAVE ACCOUNT' : 'NEW PLAYER'}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
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
        {activeCelebration ? (
          <Modal visible transparent animationType="fade">
            <View style={styles.celebrationOverlay}>
              <View style={styles.celebrationCard}>
                <Text style={styles.celebrationTitle}>{activeCelebration.title}</Text>
                <ExpoImage source={activeCelebration.image} style={styles.celebrationImage} contentFit="contain" />
                <Text style={styles.celebrationName}>{activeCelebration.name}</Text>
                <Text style={styles.celebrationDescription}>{activeCelebration.description}</Text>
                <TouchableOpacity style={styles.celebrationBtn} onPress={closeCelebration}>
                  <Text style={styles.celebrationBtnText}>{activeCelebration.buttonLabel || 'LETS GO'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        ) : null}

        <View style={[styles.header, { minHeight: headerMinHeight, paddingTop: Math.max(14, insets.top + 8) }]}>
          <View style={styles.headerBrand}>
            <ExpoImage source={HEADER_MAIN_MENU_IMAGE} style={styles.headerBrandImage} contentFit="contain" />
          </View>
          <View style={styles.headerInfo}>
            <TouchableOpacity style={styles.profileButton} onPress={() => setCurrentPage('profile')}>
              <Text style={styles.profileButtonLabel}>MY PROFILE</Text>
            </TouchableOpacity>
            <Text style={styles.headerStatLine}>{user.email}</Text>
            <Text style={styles.headerStatLine}>LEVEL: {runnerLevel.levelNumber} - {runnerLevel.title}</Text>
            <View style={styles.headerCoinsRow}>
              <GoldCoinIcon compact />
              <Text style={styles.headerCoinsText}>COINS: {gameStats.coins || 0}</Text>
            </View>
            <TouchableOpacity style={styles.helpBtnHeader} onPress={() => setCurrentPage('help')}>
              <Text style={styles.helpBtnText}>HELP</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.imageOnlyButton} onPress={() => setShowStats(!showStats)}>
            <ExpoImage
              source={showStats ? BACK_TO_MAIN_MENU_IMAGE : GO_TO_SCORECARD_IMAGE}
              style={styles.scorecardToggleImage}
              contentFit="contain"
            />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {showStats && (
            <View style={styles.statsCard}>
              <Text style={styles.statsTitle}>YOUR SCORECARD</Text>
              <Text style={styles.statLine}>PLAYER LEVEL: {runnerLevel.levelNumber} - {runnerLevel.title}</Text>
              <Text style={styles.statLine}>TOTAL COINS: {gameStats.coins || 0}</Text>
              
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

              <View style={styles.coinLegend}>
                <Text style={styles.legendTitle}>HOW TO EARN COINS</Text>
                <View style={styles.legendBulletRow}>
                  <Text style={styles.legendBullet}>•</Text>
                  <Text style={styles.legendText}>+10 coins per activity log entry</Text>
                </View>
                <View style={styles.legendBulletRow}>
                  <Text style={styles.legendBullet}>•</Text>
                  <Text style={styles.legendText}>+1 coin per mile logged</Text>
                </View>
                <View style={styles.legendBulletRow}>
                  <Text style={styles.legendBullet}>•</Text>
                  <Text style={styles.legendText}>+achievement bonuses for milestones</Text>
                </View>
              </View>

              <View style={styles.coinLegend}>
                <Text style={styles.legendTitle}>WHAT COINS GET YOU</Text>
                <View style={styles.legendBulletRow}>
                  <Text style={styles.legendBullet}>•</Text>
                  <Text style={styles.legendText}>Coins unlock higher runner levels and better status titles.</Text>
                </View>
                <View style={styles.legendBulletRow}>
                  <Text style={styles.legendBullet}>•</Text>
                  <Text style={styles.legendText}>Current level: {runnerLevel.title}</Text>
                </View>
                <View style={styles.legendBulletRow}>
                  <Text style={styles.legendBullet}>•</Text>
                  <Text style={styles.legendText}>
                    {runnerLevel.nextCoins ? `Next level at ${runnerLevel.nextCoins} coins: ${runnerLevel.nextTitle}` : 'You reached the top level.'}
                  </Text>
                </View>
              </View>

              <View style={styles.levelTrack}>
                {RUNNER_LEVELS.map((level) => (
                  <View key={level.minCoins} style={styles.levelTrackRow}>
                    <Text style={styles.levelTrackCoins}>{level.minCoins}+</Text>
                    <Text style={styles.levelTrackName}>{level.title}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {!showStats && activeShoes.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>👟</Text>
              <Text style={styles.emptyTitle}>NO SHOES</Text>
              <Text style={styles.emptyText}>ADD YOUR FIRST SHOE</Text>
              <TouchableOpacity style={styles.btnPrimary} onPress={() => setShowAddShoe(true)}>
                <Text style={styles.btnPrimaryText}>ADD SHOE</Text>
              </TouchableOpacity>
            </View>
          ) : !showStats ? (
            <>
              <View style={styles.statsGrid}>
                <View style={styles.statCard2}>
                  <Text style={styles.statLabel}>SHOES</Text>
                  <Text style={styles.statValue}>{activeShoes.length}</Text>
                </View>
                <View style={styles.statCard2}>
                  <Text style={styles.statLabel}>MILES</Text>
                  <Text style={styles.statValue}>{Math.round(logs.reduce((total, log) => total + log.mileage, 0))}</Text>
                </View>
                <View style={styles.statCard2}>
                  <Text style={styles.statLabel}>LOGS</Text>
                  <Text style={styles.statValue}>{logs.length}</Text>
                </View>
              </View>

              <View style={styles.section}>
                <ExpoImage source={SHOES_READY_IMAGE} style={styles.sectionTitleImageShoes} contentFit="contain" />

                {activeShoes.map(shoe => {
                  const totalMileageNumber = getShoeMileageNumber(shoe.id);
                  const totalMileage = Math.round(totalMileageNumber);
                  const shoeLifetime = parseFloat(shoe.targetMileage || 300);
                  const rawPercentage = shoeLifetime > 0 ? (totalMileageNumber / shoeLifetime) * 100 : 0;
                  const percentage = Math.min(rawPercentage, 100);
                  const overflowPercentage = Math.min(Math.max(rawPercentage - 100, 0), 100);
                  const overflowMiles = Math.max(totalMileageNumber - shoeLifetime, 0).toFixed(1);
                  const milesRemaining = Math.max(shoeLifetime - totalMileageNumber, 0).toFixed(1);
                  const usagePercentage = shoeLifetime > 0 ? rawPercentage.toFixed(1) : '0.0';

                  return (
                    <TouchableOpacity key={shoe.id} style={styles.shoeCard} onPress={() => { setSelectedShoe(shoe.id); setCurrentPage('detail'); }}>
                      <Text style={styles.shoeBannerText}>{shoe.name} / {shoe.brand}</Text>
                      <View style={styles.shoeCardTopRow}>
                        <View style={styles.shoePhotoWrap}>
                          {shoe.photoUrl ? <ExpoImage source={{ uri: shoe.photoUrl }} style={styles.shoeHeroImage} contentFit="cover" /> : <View style={styles.shoeHeroPlaceholder}><Text style={styles.shoeHeroPlaceholderText}>NO PHOTO</Text></View>}
                        </View>
                        <View style={styles.shoeCardMeta}>
                          <View style={styles.shoeMileageSummary}>
                            <Text style={styles.progressText}>CURRENT MILEAGE: {totalMileage}</Text>
                            <Text style={styles.progressText}>USAGE %: {usagePercentage}%</Text>
                            <Text style={styles.progressText}>MILES REMAINING: {milesRemaining}</Text>
                            <Text style={styles.progressText}>SHOE LIFETIME: {Math.round(shoeLifetime)}</Text>
                          </View>
                          <View style={styles.shoeActionStack}>
                            <TouchableOpacity style={styles.editShoeBtn} onPress={() => { setEditingShoe({ ...shoe, targetMileage: String(shoe.targetMileage || '300') }); setShowEditShoe(true); }}>
                              <Text style={styles.editShoeBtnText}>EDIT</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.logBtn} onPress={() => { setNewLog({ ...newLog, shoeId: shoe.id }); setShowAddLog(true); }}>
                              <Text style={styles.logBtnText}>LOG MANUAL MILEAGE</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>

                      <Text style={styles.progressMeterTitle}>SHOE LIFE METER</Text>
                      <View style={styles.progressBarWide}>
                        <View style={[styles.progressFill, { width: `${percentage}%` }]} />
                      </View>
                      {overflowPercentage > 0 ? (
                        <>
                          <View style={styles.progressOverflowBar}>
                            <View style={[styles.progressOverflowFill, { width: `${overflowPercentage}%` }]} />
                          </View>
                          <Text style={styles.progressOverflowText}>OVER LIFETIME: {overflowMiles} MI</Text>
                        </>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}

                <TouchableOpacity style={styles.btnAddBottom} onPress={() => setShowAddShoe(true)}>
                  <Text style={styles.btnAddText}>ADD SHOE</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.section}>
                <ExpoImage source={HEALTH_SYNC_IMAGE} style={styles.sectionTitleImage} contentFit="contain" />
                {isIpadDevice() ? (
                  <Text style={styles.iPadHealthNote}>APPLE HEALTH WORKOUT SYNC IS AVAILABLE ON IPHONE. LOG WORKOUTS MANUALLY ON IPAD.</Text>
                ) : null}
                {!isIpadDevice() ? (
                  <>
                    <Text style={styles.syncRangeLabel}>Choose the duration for the workout sync</Text>
                    {gameStats.autoSyncHealthOnOpen ? (
                      <Text style={styles.autoSyncNote}>AUTO SYNC ACTIVE, EDIT IN MY PROFILE</Text>
                    ) : null}
                    <View style={styles.syncRangeRow}>
                      {[1, 7, 30, 90, 365].map((days) => (
                        <TouchableOpacity key={days} style={[styles.syncRangeBtn, syncDays === days && styles.syncRangeBtnActive]} onPress={() => setSyncDays(days)}>
                          <Text style={[styles.syncRangeBtnText, syncDays !== days && styles.syncRangeBtnTextInactive]}>{days === 365 ? '1Y' : `${days}D`}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    {!isHealthLinked ? (
                      <TouchableOpacity
                        style={styles.btnPrimary}
                        onPress={requestHealthKitPermission}
                      >
                        <Text style={styles.btnPrimaryText}>AUTHORIZE HEALTH</Text>
                      </TouchableOpacity>
                    ) : null}
                    <TouchableOpacity
                      style={styles.btnPrimary}
                      onPress={syncWorkouts}
                    >
                      <Text style={styles.btnPrimaryText}>SYNC WORKOUTS</Text>
                    </TouchableOpacity>
                  </>
                ) : null}
              </View>

              {logs.length > 0 && (
                <View style={styles.section}>
                  <ExpoImage source={ACTIVITY_LOG_IMAGE} style={styles.sectionTitleImage} contentFit="contain" />
                  {sortedLogs.slice(0, 5).map((log, index) => {
                    const shoe = shoes.find(s => s.id === log.shoeId);
                    return (
                      <TouchableOpacity key={index} style={styles.logItem} onPress={() => openEditLogModal(log)}>
                        <View>
                          <Text style={styles.logTitle}>{shoe?.name} - {log.mileage} MI</Text>
                          <Text style={styles.logDate}>{log.date}</Text>
                          <Text style={styles.logSourceTag}>{String(getLogSourceText(log)).toUpperCase()}</Text>
                        </View>
                        <Text style={styles.logActionEdit}>EDIT</Text>
                      </TouchableOpacity>
                    );
                  })}
                  <TouchableOpacity style={styles.btnSecondary} onPress={() => setCurrentPage('activity')}>
                    <Text style={styles.btnSecondaryText}>SHOW ALL ACTIVITY</Text>
                  </TouchableOpacity>
                </View>
              )}

              {retiredShoes.length > 0 && (
                <View style={styles.section}>
                  <ExpoImage source={RETIRED_SHOES_IMAGE} style={styles.sectionTitleImage} contentFit="contain" />
                  {retiredShoes.slice(0, 2).map((shoe) => (
                    <TouchableOpacity key={shoe.id} style={styles.retiredCard} onPress={() => { setEditingShoe({ ...shoe, targetMileage: String(shoe.targetMileage || '300') }); setShowEditShoe(true); }}>
                      <Text style={styles.retiredTitle}>{shoe.name} / {shoe.brand}</Text>
                      <Text style={styles.retiredText}>Tap to edit, restore, or delete.</Text>
                    </TouchableOpacity>
                  ))}
                  {retiredShoes.length > 2 ? (
                    <TouchableOpacity style={styles.btnSecondary} onPress={() => setCurrentPage('retired')}>
                      <Text style={styles.btnSecondaryText}>SHOW ALL RETIRED SHOES</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              )}
            </>
          ) : null}
        </ScrollView>

        <Modal visible={showAddShoe} transparent animationType="slide">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={topModalStyle}>
            <ScrollView contentContainerStyle={styles.modalScrollContent} keyboardShouldPersistTaps="handled">
            <View style={[styles.modalContent, styles.modalTopContent]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>ADD SHOE</Text>
                <TouchableOpacity onPress={() => setShowAddShoe(false)}>
                  <Text style={styles.closeBtn}>X</Text>
                </TouchableOpacity>
              </View>
              <TextInput style={styles.input} placeholder="SHOE NAME" placeholderTextColor="#666" value={newShoe.name} onChangeText={(text) => setNewShoe({ ...newShoe, name: text })} />
              <TextInput style={styles.input} placeholder="BRAND" placeholderTextColor="#666" value={newShoe.brand} onChangeText={(text) => setNewShoe({ ...newShoe, brand: text })} />
              <Text style={styles.fieldLabel}>PURCHASE DATE</Text>
              <TextInput
                style={styles.input}
                placeholder="MM/DD/YYYY"
                placeholderTextColor="#666"
                value={newShoe.purchaseDate}
                keyboardType="number-pad"
                onChangeText={(text) => setNewShoe({ ...newShoe, purchaseDate: formatPurchaseDateInput(text) })}
              />
              <Text style={styles.inputHint}>PURCHASE DATE FORMAT: MM/DD/YYYY</Text>
              <Text style={styles.fieldLabel}>SHOE LIFETIME</Text>
              <TextInput style={styles.input} placeholder="SHOE LIFETIME (miles)" placeholderTextColor="#666" keyboardType="decimal-pad" value={newShoe.targetMileage} onChangeText={(text) => setNewShoe({ ...newShoe, targetMileage: text })} />
              <Text style={styles.inputHint}>Distance should be entered in miles. Tip: most running shoes last about 250 to 450 miles depending on the type of shoe.</Text>
              <TextInput style={styles.input} placeholder="PHOTO URL (optional)" placeholderTextColor="#666" value={newShoe.photoUrl} onChangeText={(text) => setNewShoe({ ...newShoe, photoUrl: text })} />
              {newShoe.photoUrl ? <ExpoImage source={{ uri: newShoe.photoUrl }} style={styles.newShoePreview} contentFit="cover" /> : null}
              <View style={styles.photoBtnRow}>
                <TouchableOpacity style={styles.photoBtn} onPress={pickShoePhotoFromLibrary}><Text style={styles.photoBtnText}>PHOTO LIBRARY</Text></TouchableOpacity>
                <TouchableOpacity style={styles.photoBtn} onPress={takeShoePhotoWithCamera}><Text style={styles.photoBtnText}>CAMERA</Text></TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.doneBtn} onPress={() => Keyboard.dismiss()}>
                <Text style={styles.doneBtnText}>DONE</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleAddShoe}>
                <Text style={styles.submitBtnText}>ADD SHOE</Text>
              </TouchableOpacity>
            </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>

        <Modal visible={showEditShoe} transparent animationType="slide">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={topModalStyle}>
            <ScrollView contentContainerStyle={styles.modalScrollContent} keyboardShouldPersistTaps="handled">
              <View style={[styles.modalContent, styles.modalTopContent]}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>EDIT SHOE</Text>
                  <TouchableOpacity onPress={() => { setShowEditShoe(false); setEditingShoe(null); }}>
                    <Text style={styles.closeBtn}>X</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.fieldLabel}>SHOE NAME</Text>
                <TextInput style={styles.input} placeholder="SHOE NAME" placeholderTextColor="#666" value={editingShoe?.name || ''} onChangeText={(text) => setEditingShoe((prev) => ({ ...(prev || {}), name: text }))} />
                <Text style={styles.fieldLabel}>BRAND</Text>
                <TextInput style={styles.input} placeholder="BRAND" placeholderTextColor="#666" value={editingShoe?.brand || ''} onChangeText={(text) => setEditingShoe((prev) => ({ ...(prev || {}), brand: text }))} />
                <Text style={styles.fieldLabel}>SHOE LIFETIME</Text>
                <TextInput style={styles.input} placeholder="SHOE LIFETIME (miles)" placeholderTextColor="#666" keyboardType="decimal-pad" value={String(editingShoe?.targetMileage || '300')} onChangeText={(text) => setEditingShoe((prev) => ({ ...(prev || {}), targetMileage: text }))} />
                <Text style={styles.inputHint}>Distance should be entered in miles. Tip: most running shoes last about 250 to 450 miles depending on the type of shoe.</Text>
                <Text style={styles.fieldLabel}>PURCHASE DATE</Text>
                <TextInput
                  style={styles.input}
                  placeholder="MM/DD/YYYY"
                  placeholderTextColor="#666"
                  value={editingShoe?.purchaseDate || ''}
                  keyboardType="number-pad"
                  onChangeText={(text) => setEditingShoe((prev) => ({ ...(prev || {}), purchaseDate: formatPurchaseDateInput(text) }))}
                />
                <Text style={styles.inputHint}>PURCHASE DATE FORMAT: MM/DD/YYYY</Text>
                <Text style={styles.fieldLabel}>PHOTO</Text>
                {editingShoe?.photoUrl ? <ExpoImage source={{ uri: editingShoe.photoUrl }} style={styles.newShoePreview} contentFit="cover" /> : <Text style={styles.emptyText}>NO PHOTO SAVED</Text>}
                <TextInput style={styles.input} placeholder="PHOTO URL (optional)" placeholderTextColor="#666" value={editingShoe?.photoUrl || ''} onChangeText={(text) => setEditingShoe((prev) => ({ ...(prev || {}), photoUrl: text }))} />
                <View style={styles.photoBtnRow}>
                  <TouchableOpacity style={styles.photoBtn} onPress={pickEditShoePhotoFromLibrary}><Text style={styles.photoBtnText}>{editingShoe?.photoUrl ? 'REPLACE FROM LIBRARY' : 'PHOTO LIBRARY'}</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.photoBtn} onPress={takeEditShoePhotoWithCamera}><Text style={styles.photoBtnText}>{editingShoe?.photoUrl ? 'RETAKE WITH CAMERA' : 'CAMERA'}</Text></TouchableOpacity>
                </View>
                {editingShoe?.photoUrl ? (
                  <TouchableOpacity style={styles.btnDanger} onPress={() => setEditingShoe((prev) => ({ ...(prev || {}), photoUrl: '' }))}>
                    <Text style={styles.btnDangerText}>REMOVE CURRENT PHOTO</Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity style={styles.submitBtn} onPress={handleSaveShoeEdits}>
                  <Text style={styles.submitBtnText}>DONE</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnSecondary} onPress={handleRetireToggle}>
                  <Text style={styles.btnSecondaryText}>{editingShoe?.retired ? 'RETURN TO ACTIVE' : 'RETIRE SHOE'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnDanger} onPress={() => handleDeleteShoe(editingShoe?.id)}>
                  <Text style={styles.btnDangerText}>DELETE SHOE</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>

        <Modal visible={showAddLog} transparent animationType="slide">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
            <View style={[styles.modalContent, styles.modalTopContent]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>LOG MILEAGE</Text>
                <TouchableOpacity onPress={() => setShowAddLog(false)}>
                  <Text style={styles.closeBtn}>X</Text>
                </TouchableOpacity>
              </View>
              <TextInput style={styles.input} placeholder="MILEAGE" placeholderTextColor="#666" keyboardType="decimal-pad" value={newLog.mileage} onChangeText={(text) => setNewLog({ ...newLog, mileage: text })} />
              <TextInput style={styles.input} placeholder="DATE" placeholderTextColor="#666" value={newLog.date} onChangeText={(text) => setNewLog({ ...newLog, date: text })} />
              <TouchableOpacity style={styles.doneBtn} onPress={() => Keyboard.dismiss()}>
                <Text style={styles.doneBtnText}>DONE</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleAddLog}>
                <Text style={styles.submitBtnText}>LOG IT</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        <Modal visible={showEditLog} transparent animationType="slide">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={topModalStyle}>
            <ScrollView contentContainerStyle={styles.modalScrollContent} keyboardShouldPersistTaps="handled">
              <View style={[styles.modalContent, styles.modalTopContent]}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>EDIT ACTIVITY</Text>
                  <TouchableOpacity onPress={() => { setShowEditLog(false); setEditingLog(null); }}>
                    <Text style={styles.closeBtn}>X</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.fieldLabel}>DISTANCE</Text>
                <TextInput style={styles.input} placeholder="MILEAGE" placeholderTextColor="#666" keyboardType="decimal-pad" value={editingLog?.mileage || ''} onChangeText={(text) => setEditingLog((prev) => ({ ...(prev || {}), mileage: text }))} />
                <Text style={styles.fieldLabel}>DATE</Text>
                <TextInput style={styles.input} placeholder="DATE" placeholderTextColor="#666" value={editingLog?.date || ''} onChangeText={(text) => setEditingLog((prev) => ({ ...(prev || {}), date: text }))} />
                <Text style={styles.fieldLabel}>ASSIGNED SHOE</Text>
                <ScrollView style={{ maxHeight: 180 }}>
                  {activeShoes.map((shoeOption) => (
                    <TouchableOpacity key={shoeOption.id} style={[styles.shoeOption, editingLog?.shoeId === shoeOption.id && styles.shoeOptionActive]} onPress={() => setEditingLog((prev) => ({ ...(prev || {}), shoeId: shoeOption.id }))}>
                      <Text style={styles.shoeOptionText}>{shoeOption.name} • {shoeOption.brand}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity style={styles.btnSecondary} onPress={handleSaveLogEdits}>
                  <Text style={styles.btnSecondaryText}>SAVE ACTIVITY</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnDanger} onPress={handleDeleteLogEntry}>
                  <Text style={styles.btnDangerText}>DELETE ACTIVITY</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>

        {renderPurchaseDatePicker()}
        {renderBusyOverlay()}
      </View>
    );
  }

  if (currentPage === 'profile') {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { minHeight: headerMinHeight, paddingTop: Math.max(14, insets.top + 8) }]}>
          <TouchableOpacity onPress={() => setCurrentPage('dashboard')}>
            <Text style={styles.backBtn}>MAIN MENU</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>PROFILE</Text>
          <View style={styles.headerStats}>
            <Text style={styles.headerStatLine}>LEVEL: {runnerLevel.levelNumber}</Text>
          </View>
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>ACCOUNT</Text>
            <Text style={styles.profileEmailText}>{user?.email || 'No email found'}</Text>
          </View>

          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>APPLE HEALTH</Text>
            <Text style={styles.statLine}>STATUS: {isHealthLinked ? 'AUTHORIZED' : 'NOT AUTHORIZED'}</Text>
            <TouchableOpacity style={styles.btnSecondary} onPress={handleHealthSettingsButton}>
              <Text style={styles.btnSecondaryText}>{isHealthLinked ? 'DEAUTHORIZE IN HEALTH APP' : 'AUTHORIZE HEALTH'}</Text>
            </TouchableOpacity>
            <Text style={styles.statLine}>AUTO SYNC ON APP OPEN: {gameStats.autoSyncHealthOnOpen ? 'ON' : 'OFF'}</Text>
            <TouchableOpacity style={styles.btnSecondary} onPress={toggleAutoSyncOnOpen}>
              <Text style={styles.btnSecondaryText}>{gameStats.autoSyncHealthOnOpen ? 'TURN AUTO SYNC OFF' : 'TURN AUTO SYNC ON'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>UPDATE PASSWORD</Text>
            <Text style={styles.fieldLabel}>CURRENT PASSWORD</Text>
            <TextInput style={styles.input} placeholder="CURRENT PASSWORD" placeholderTextColor="#666" secureTextEntry value={passwordForm.currentPassword} onChangeText={(text) => setPasswordForm((prev) => ({ ...prev, currentPassword: text }))} />
            <Text style={styles.fieldLabel}>NEW PASSWORD</Text>
            <TextInput style={styles.input} placeholder="NEW PASSWORD" placeholderTextColor="#666" secureTextEntry value={passwordForm.newPassword} onChangeText={(text) => setPasswordForm((prev) => ({ ...prev, newPassword: text }))} />
            <Text style={styles.fieldLabel}>CONFIRM NEW PASSWORD</Text>
            <TextInput style={styles.input} placeholder="CONFIRM PASSWORD" placeholderTextColor="#666" secureTextEntry value={passwordForm.confirmPassword} onChangeText={(text) => setPasswordForm((prev) => ({ ...prev, confirmPassword: text }))} />
            <TouchableOpacity style={styles.btnSecondary} onPress={handleUpdatePassword}>
              <Text style={styles.btnSecondaryText}>UPDATE PASSWORD</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>DELETE ACCOUNT</Text>
            <Text style={styles.accountDeleteCopy}>Permanently deletes your account, shoes, run logs, Apple Health imports, game stats, and uploaded shoe photos.</Text>
            <Text style={styles.fieldLabel}>CURRENT PASSWORD</Text>
            <TextInput style={styles.input} placeholder="CURRENT PASSWORD" placeholderTextColor="#666" secureTextEntry value={deleteAccountPassword} onChangeText={setDeleteAccountPassword} />
            <TouchableOpacity style={styles.btnDanger} onPress={handleDeleteAccount}>
              <Text style={styles.btnDangerText}>DELETE ACCOUNT</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.btnDanger} onPress={handleLogout}>
            <Text style={styles.btnDangerText}>LOG OFF</Text>
          </TouchableOpacity>
        </ScrollView>
        {renderBusyOverlay()}
      </View>
    );
  }

  if (currentPage === 'help') {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { minHeight: headerMinHeight, paddingTop: Math.max(14, insets.top + 8) }]}>
          <TouchableOpacity onPress={() => setCurrentPage('dashboard')}>
            <Text style={styles.backBtn}>MAIN MENU</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>HELP</Text>
          <View style={styles.headerStats}>
            <Text style={styles.headerStatLine}>QUICK START</Text>
          </View>
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>HOW TO USE THE APP</Text>
            <Text style={styles.helpStep}>1. Add your shoes first so imported runs can be assigned correctly.</Text>
            <Text style={styles.helpStep}>2. Tap AUTHORIZE HEALTH and allow workout access in Apple Health.</Text>
            <Text style={styles.helpStep}>3. Choose a timeframe like 1D, 7D, 30D, 90D, or 1Y.</Text>
            <Text style={styles.helpStep}>4. Tap SYNC WORKOUTS to open the import preview before anything is saved.</Text>
            <Text style={styles.helpStep}>5. Review the valid workouts, select the ones you want, and choose an active shoe for each one right there in the preview.</Text>
            <Text style={styles.helpStep}>6. PREVIOUSLY DELETED workouts can be restored if you select them again and assign a shoe.</Text>
            <Text style={styles.helpStep}>7. Tap IMPORT SELECTED to bring those runs straight into your Activity Log.</Text>
            <Text style={styles.helpStep}>8. Use ACTIVITY LOG to edit shoe, date, or miles later if you make a mistake.</Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  if (currentPage === 'activity') {
    const allLogs = sortedLogs;

    return (
      <View style={styles.container}>
        <View style={[styles.header, styles.stackedHeader, { minHeight: headerMinHeight, paddingTop: Math.max(14, insets.top + 8) }]}>
          <Text style={styles.headerTitle}>ALL ACTIVITY</Text>
          <View style={styles.stackedHeaderRow}>
            <TouchableOpacity onPress={() => setCurrentPage('dashboard')}>
              <Text style={styles.backBtn}>GO BACK TO MAIN MENU</Text>
            </TouchableOpacity>
            <Text style={styles.headerStatLine}>ENTRIES: {logs.length}</Text>
          </View>
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>FULL ACTIVITY HISTORY</Text>
            {allLogs.length === 0 ? (
              <Text style={styles.emptyText}>NO ACTIVITY YET</Text>
            ) : (
              allLogs.map((log, index) => {
                const shoe = shoes.find((item) => item.id === log.shoeId);
                return (
                  <TouchableOpacity key={log.id || index} style={styles.logItem} onPress={() => openEditLogModal(log)}>
                    <View>
                      <Text style={styles.logTitle}>{shoe?.name || 'Unassigned Shoe'} - {log.mileage} MI</Text>
                      <Text style={styles.logDate}>{log.date}</Text>
                      <Text style={styles.logSourceTag}>{String(getLogSourceText(log)).toUpperCase()}</Text>
                    </View>
                    <Text style={styles.logActionEdit}>EDIT</Text>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </ScrollView>

        <Modal visible={showEditLog} transparent animationType="slide">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={topModalStyle}>
            <ScrollView contentContainerStyle={styles.modalScrollContent} keyboardShouldPersistTaps="handled">
              <View style={[styles.modalContent, styles.modalTopContent]}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>EDIT ACTIVITY</Text>
                  <TouchableOpacity onPress={() => { setShowEditLog(false); setEditingLog(null); }}>
                    <Text style={styles.closeBtn}>X</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.fieldLabel}>DISTANCE</Text>
                <TextInput style={styles.input} placeholder="MILEAGE" placeholderTextColor="#666" keyboardType="decimal-pad" value={editingLog?.mileage || ''} onChangeText={(text) => setEditingLog((prev) => ({ ...(prev || {}), mileage: text }))} />
                <Text style={styles.fieldLabel}>DATE</Text>
                <TextInput style={styles.input} placeholder="DATE" placeholderTextColor="#666" value={editingLog?.date || ''} onChangeText={(text) => setEditingLog((prev) => ({ ...(prev || {}), date: text }))} />
                <Text style={styles.fieldLabel}>ASSIGNED SHOE</Text>
                <ScrollView style={{ maxHeight: 180 }}>
                  {activeShoes.map((shoeOption) => (
                    <TouchableOpacity key={shoeOption.id} style={[styles.shoeOption, editingLog?.shoeId === shoeOption.id && styles.shoeOptionActive]} onPress={() => setEditingLog((prev) => ({ ...(prev || {}), shoeId: shoeOption.id }))}>
                      <Text style={styles.shoeOptionText}>{shoeOption.name} • {shoeOption.brand}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity style={styles.btnSecondary} onPress={handleSaveLogEdits}>
                  <Text style={styles.btnSecondaryText}>SAVE ACTIVITY</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnDanger} onPress={handleDeleteLogEntry}>
                  <Text style={styles.btnDangerText}>DELETE ACTIVITY</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    );
  }

  if (currentPage === 'syncPreview') {
    const previewDisplayCandidates = pendingImportWorkouts.filter((candidate) => candidate.status !== 'invalid' && candidate.status !== 'update');
    const allSelectablePreviewIds = previewDisplayCandidates.map((candidate) => candidate.previewId);
    const allPreviewSelected = allSelectablePreviewIds.length > 0 && allSelectablePreviewIds.every((id) => selectedImportIds.includes(id));

    if (previewDisplayCandidates.length === 0) {
      return (
        <View style={styles.container}>
          <View style={styles.emptyImportState}>
            <Text style={styles.emptyImportTitle}>Nothing new to import</Text>
            <TouchableOpacity style={styles.submitBtn} onPress={clearImportPreview}>
              <Text style={styles.submitBtnText}>GO BACK TO MAIN MENU</Text>
            </TouchableOpacity>
          </View>
          {renderBusyOverlay()}
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <View style={[styles.header, styles.stackedHeader, { minHeight: headerMinHeight, paddingTop: Math.max(14, insets.top + 8) }]}>
          <Text style={styles.headerTitle}>IMPORT PREVIEW</Text>
          <View style={styles.stackedHeaderRow}>
            <TouchableOpacity onPress={clearImportPreview}>
              <Text style={styles.backBtn}>GO BACK TO MAIN MENU</Text>
            </TouchableOpacity>
            <Text style={styles.headerStatLine}>READY: {previewDisplayCandidates.filter((item) => item.status === 'ready').length}</Text>
          </View>
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>REVIEW BEFORE IMPORT</Text>
            <TouchableOpacity style={styles.btnSecondary} onPress={selectAllEligibleImports}>
              <Text style={styles.btnSecondaryText}>{allPreviewSelected ? 'UNSELECT ALL' : 'SELECT ALL'}</Text>
            </TouchableOpacity>
            {previewDisplayCandidates.map((candidate) => {
              const isSelected = selectedImportIds.includes(candidate.previewId);
              const isSelectable = candidate.status === 'ready' || candidate.status === 'deleted';
              const assignedShoeId = previewAssignedShoes[candidate.previewId];
              const assignedShoe = activeShoes.find((shoe) => shoe.id === assignedShoeId) || null;
              const statusLabel =
                candidate.status === 'deleted'
                    ? 'PREVIOUSLY DELETED'
                    : 'READY';

              return (
                <TouchableOpacity
                  key={candidate.previewId}
                  style={[
                    styles.importPreviewCard,
                    isSelected && styles.importPreviewCardSelected,
                  ]}
                  onPress={() => (isSelectable ? toggleImportSelection(candidate.previewId) : null)}
                >
                  <View style={styles.importPreviewMainCol}>
                    <Text style={styles.workoutMileage}>{candidate.distance} MI</Text>
                    <Text style={styles.workoutDate}>{candidate.date} • {candidate.type}</Text>
                    <Text style={styles.workoutDate}>SOURCE: {candidate.sourceLabel}</Text>
                    <Text style={styles.workoutAssignment}>{statusLabel}</Text>
                    <Text style={styles.pickShoeText}>ASSIGN TO ACTIVE SHOE</Text>
                    {assignedShoe ? (
                      <Text style={styles.selectedShoeSummary}>SELECTED SHOE: {assignedShoe.name}</Text>
                    ) : (
                      <Text style={styles.selectedShoeSummaryMuted}>NO SHOE SELECTED YET</Text>
                    )}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.previewShoePickerRow}>
                      {activeShoes.map((shoe) => {
                        const selected = assignedShoeId === shoe.id;
                        return (
                          <TouchableOpacity
                            key={`${candidate.previewId}-${shoe.id}`}
                            style={[styles.previewShoeChip, selected ? styles.previewShoeChipActive : styles.previewShoeChipInactive]}
                            onPress={() => setPreviewAssignedShoes((prev) => ({ ...prev, [candidate.previewId]: shoe.id }))}
                          >
                            <Text style={styles.previewShoeChipText}>{shoe.name}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                    <TouchableOpacity
                      style={[styles.importPreviewSelectBtn, isSelected && styles.importPreviewSelectBtnActive]}
                      onPress={() => (isSelectable ? toggleImportSelection(candidate.previewId) : null)}
                    >
                      <Text style={styles.importSelectLabel}>{isSelected ? 'SELECTED' : candidate.status === 'deleted' ? 'RESTORE' : 'SELECT'}</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity style={styles.submitBtn} onPress={importSelectedWorkouts}>
              <Text style={styles.submitBtnText}>IMPORT SELECTED</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitBtn} onPress={clearImportPreview}>
              <Text style={styles.submitBtnText}>GO BACK TO MAIN MENU</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
        {renderBusyOverlay()}
      </View>
    );
  }

  if (currentPage === 'detail' && selectedShoe) {
    const shoe = shoes.find(s => s.id === selectedShoe);
    if (!shoe) {
      setCurrentPage('dashboard');
      return null;
    }
    const shoeLogs = logs.filter(log => log.shoeId === selectedShoe);
    const totalMileageNumber = getShoeMileageNumber(selectedShoe);
    const totalMileage = Math.round(totalMileageNumber);
    const shoeLifetime = Math.round(parseFloat(shoe.targetMileage || 300));
    const averageMilesPerUse = getShoeAverageMilesPerUse(selectedShoe).toFixed(1);
    const longestDistance = getShoeLongestDistance(selectedShoe).toFixed(1);
    const shoeAge = getShoeAgeDetails(shoe.purchaseDate);
    const usagePercentage = shoeLifetime > 0 ? Math.round((totalMileageNumber / shoeLifetime) * 100) : 0;
    const milesRemaining = Math.max(Math.round(shoeLifetime - totalMileageNumber), 0);

    return (
      <View style={styles.container}>
        <View style={[styles.header, styles.detailHeaderCompact, { paddingTop: Math.max(10, insets.top + 4), justifyContent: 'flex-start' }]}>
          <TouchableOpacity onPress={() => setCurrentPage('dashboard')}>
            <Text style={styles.backBtn}>BACK TO MAIN MENU</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {shoe.photoUrl ? <ExpoImage source={{ uri: shoe.photoUrl }} style={styles.detailShoeImage} contentFit="cover" /> : null}
          <Text style={styles.detailTitle}>{shoe.name}</Text>
          <Text style={styles.detailBrand}>{shoe.brand}</Text>

          <View style={styles.statsGrid}>
            <View style={styles.statCard2}>
              <Text style={styles.statLabel}>CURRENT MILEAGE</Text>
              <Text style={styles.statValue}>{totalMileage}</Text>
            </View>
            <View style={styles.statCard2}>
              <Text style={styles.statLabel}>SHOE LIFETIME</Text>
              <Text style={styles.statValue}>{shoeLifetime}</Text>
            </View>
            <View style={styles.statCard2}>
              <Text style={styles.statLabel}>USAGE %</Text>
              <Text style={styles.statValue}>{usagePercentage}%</Text>
            </View>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statCard2}>
              <Text style={styles.statLabel}>MILES REMAINING</Text>
              <Text style={styles.statValue}>{milesRemaining}</Text>
            </View>
            <View style={styles.statCard2}>
              <Text style={styles.statLabel}>AVERAGE MILES PER USE</Text>
              <Text style={styles.statDetailValue}>{averageMilesPerUse}</Text>
            </View>
            <View style={styles.statCard2}>
              <Text style={styles.statLabel}>LONGEST DISTANCE</Text>
              <Text style={styles.statDetailValue}>{longestDistance}</Text>
            </View>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statCard2}>
              <Text style={styles.statLabel}>AGE OF SHOE</Text>
              <Text style={styles.statDetailValue}>{shoeAge.label}</Text>
            </View>
            <View style={styles.statCard2}>
              <Text style={styles.statLabel}>PURCHASE DATE</Text>
              <Text style={styles.statDetailValue}>{formatPurchaseDateForDetailCard(shoe.purchaseDate) || 'NOT SET'}</Text>
            </View>
            <View style={styles.statCard2}>
              <Text style={styles.statLabel}>LOGS</Text>
              <Text style={styles.statValue}>{shoeLogs.length}</Text>
            </View>
          </View>

          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${Math.min((parseFloat(totalMileage) / shoeLifetime) * 100, 100)}%` }]} />
          </View>

          <TouchableOpacity style={styles.btnPrimary} onPress={() => { setEditingShoe({ ...shoe, targetMileage: String(shoe.targetMileage || '300') }); setShowEditShoe(true); }}>
            <Text style={styles.btnPrimaryText}>EDIT SHOE</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.btnPrimary} onPress={() => { setNewLog({ ...newLog, shoeId: selectedShoe }); setShowAddLog(true); }}>
            <Text style={styles.btnPrimaryText}>LOG MILEAGE</Text>
          </TouchableOpacity>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>MILEAGE LOGS</Text>
                {shoeLogs.length === 0 ? (
                  <Text style={styles.emptyText}>NO LOGS YET</Text>
                ) : (
                  sortLogsByWorkoutDateDesc(shoeLogs).map((log, i) => (
                    <TouchableOpacity key={i} style={styles.logItem} onPress={() => openEditLogModal(log)}>
                      <View>
                        <Text style={styles.logMileage}>{log.mileage} MI</Text>
                        <Text style={styles.logDate}>{log.date}</Text>
                        <Text style={styles.logSourceTag}>{String(getLogSourceText(log)).toUpperCase()}</Text>
                      </View>
                      <Text style={styles.logActionEdit}>EDIT</Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>
        </ScrollView>

        <Modal visible={showAddLog} transparent animationType="slide">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
            <View style={[styles.modalContent, styles.modalTopContent]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>LOG MILEAGE</Text>
                <TouchableOpacity onPress={() => setShowAddLog(false)}>
                  <Text style={styles.closeBtn}>X</Text>
                </TouchableOpacity>
              </View>
              <TextInput style={styles.input} placeholder="MILEAGE" placeholderTextColor="#666" keyboardType="decimal-pad" value={newLog.mileage} onChangeText={(text) => setNewLog({ ...newLog, mileage: text })} />
              <TouchableOpacity style={styles.doneBtn} onPress={() => Keyboard.dismiss()}>
                <Text style={styles.doneBtnText}>DONE</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleAddLog}>
                <Text style={styles.submitBtnText}>LOG IT</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Modal>
        <Modal visible={showEditShoe} transparent animationType="slide">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={topModalStyle}>
            <ScrollView contentContainerStyle={styles.modalScrollContent} keyboardShouldPersistTaps="handled">
              <View style={[styles.modalContent, styles.modalTopContent]}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>EDIT SHOE</Text>
                  <TouchableOpacity onPress={() => { setShowEditShoe(false); setEditingShoe(null); }}>
                    <Text style={styles.closeBtn}>X</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.fieldLabel}>SHOE NAME</Text>
                <TextInput style={styles.input} placeholder="SHOE NAME" placeholderTextColor="#666" value={editingShoe?.name || ''} onChangeText={(text) => setEditingShoe((prev) => ({ ...(prev || {}), name: text }))} />
                <Text style={styles.fieldLabel}>BRAND</Text>
                <TextInput style={styles.input} placeholder="BRAND" placeholderTextColor="#666" value={editingShoe?.brand || ''} onChangeText={(text) => setEditingShoe((prev) => ({ ...(prev || {}), brand: text }))} />
                <Text style={styles.fieldLabel}>SHOE LIFETIME</Text>
                <TextInput style={styles.input} placeholder="SHOE LIFETIME (miles)" placeholderTextColor="#666" keyboardType="decimal-pad" value={String(editingShoe?.targetMileage || '300')} onChangeText={(text) => setEditingShoe((prev) => ({ ...(prev || {}), targetMileage: text }))} />
                <Text style={styles.inputHint}>Distance should be entered in miles. Tip: most running shoes last about 250 to 450 miles depending on the type of shoe.</Text>
                <Text style={styles.fieldLabel}>PURCHASE DATE</Text>
                <TextInput
                  style={styles.input}
                  placeholder="MM/DD/YYYY"
                  placeholderTextColor="#666"
                  value={editingShoe?.purchaseDate || ''}
                  keyboardType="number-pad"
                  onChangeText={(text) => setEditingShoe((prev) => ({ ...(prev || {}), purchaseDate: formatPurchaseDateInput(text) }))}
                />
                <Text style={styles.inputHint}>PURCHASE DATE FORMAT: MM/DD/YYYY</Text>
                <Text style={styles.fieldLabel}>PHOTO</Text>
                {editingShoe?.photoUrl ? <ExpoImage source={{ uri: editingShoe.photoUrl }} style={styles.newShoePreview} contentFit="cover" /> : <Text style={styles.emptyText}>NO PHOTO SAVED</Text>}
                {editingShoe?.photoUrl ? (
                  <TouchableOpacity style={styles.btnDanger} onPress={() => setEditingShoe((prev) => ({ ...(prev || {}), photoUrl: '' }))}>
                    <Text style={styles.btnDangerText}>REMOVE CURRENT PHOTO</Text>
                  </TouchableOpacity>
                ) : (
                  <>
                    <TextInput style={styles.input} placeholder="PHOTO URL (optional)" placeholderTextColor="#666" value={editingShoe?.photoUrl || ''} onChangeText={(text) => setEditingShoe((prev) => ({ ...(prev || {}), photoUrl: text }))} />
                    <View style={styles.photoBtnRow}>
                      <TouchableOpacity style={styles.photoBtn} onPress={pickEditShoePhotoFromLibrary}><Text style={styles.photoBtnText}>PHOTO LIBRARY</Text></TouchableOpacity>
                      <TouchableOpacity style={styles.photoBtn} onPress={takeEditShoePhotoWithCamera}><Text style={styles.photoBtnText}>CAMERA</Text></TouchableOpacity>
                    </View>
                  </>
                )}
                <TouchableOpacity style={styles.submitBtn} onPress={handleSaveShoeEdits}>
                  <Text style={styles.submitBtnText}>DONE</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnSecondary} onPress={handleRetireToggle}>
                  <Text style={styles.btnSecondaryText}>{editingShoe?.retired ? 'RETURN TO ACTIVE' : 'RETIRE SHOE'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnDanger} onPress={() => handleDeleteShoe(editingShoe?.id)}>
                  <Text style={styles.btnDangerText}>DELETE SHOE</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>
        <Modal visible={showEditLog} transparent animationType="slide">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={topModalStyle}>
            <ScrollView contentContainerStyle={styles.modalScrollContent} keyboardShouldPersistTaps="handled">
              <View style={[styles.modalContent, styles.modalTopContent]}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>EDIT ACTIVITY</Text>
                  <TouchableOpacity onPress={() => { setShowEditLog(false); setEditingLog(null); }}>
                    <Text style={styles.closeBtn}>X</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.fieldLabel}>DISTANCE</Text>
                <TextInput style={styles.input} placeholder="MILEAGE" placeholderTextColor="#666" keyboardType="decimal-pad" value={editingLog?.mileage || ''} onChangeText={(text) => setEditingLog((prev) => ({ ...(prev || {}), mileage: text }))} />
                <Text style={styles.fieldLabel}>DATE</Text>
                <TextInput style={styles.input} placeholder="DATE" placeholderTextColor="#666" value={editingLog?.date || ''} onChangeText={(text) => setEditingLog((prev) => ({ ...(prev || {}), date: text }))} />
                <Text style={styles.fieldLabel}>ASSIGNED SHOE</Text>
                <ScrollView style={{ maxHeight: 180 }}>
                  {activeShoes.map((shoeOption) => (
                    <TouchableOpacity key={shoeOption.id} style={[styles.shoeOption, editingLog?.shoeId === shoeOption.id && styles.shoeOptionActive]} onPress={() => setEditingLog((prev) => ({ ...(prev || {}), shoeId: shoeOption.id }))}>
                      <Text style={styles.shoeOptionText}>{shoeOption.name} • {shoeOption.brand}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity style={styles.btnSecondary} onPress={handleSaveLogEdits}>
                  <Text style={styles.btnSecondaryText}>SAVE ACTIVITY</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnDanger} onPress={handleDeleteLogEntry}>
                  <Text style={styles.btnDangerText}>DELETE ACTIVITY</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>
        {renderPurchaseDatePicker()}
        {renderBusyOverlay()}
      </View>
    );
  }

  if (currentPage === 'retired') {
    return (
      <View style={styles.container}>
        <View style={[styles.header, styles.stackedHeader, { minHeight: headerMinHeight, paddingTop: Math.max(14, insets.top + 8) }]}>
          <Text style={styles.headerTitle}>RETIRED SHOES</Text>
          <View style={styles.stackedHeaderRow}>
            <TouchableOpacity onPress={() => setCurrentPage('dashboard')}>
              <Text style={styles.backBtn}>GO BACK TO MAIN MENU</Text>
            </TouchableOpacity>
            <Text style={styles.headerStatLine}>TOTAL: {retiredShoes.length}</Text>
          </View>
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.section}>
            {retiredShoes.length === 0 ? (
              <Text style={styles.emptyText}>NO RETIRED SHOES</Text>
            ) : (
              retiredShoes.map((shoe) => (
                <TouchableOpacity key={shoe.id} style={styles.retiredCard} onPress={() => { setEditingShoe({ ...shoe, targetMileage: String(shoe.targetMileage || '300') }); setShowEditShoe(true); }}>
                  <Text style={styles.retiredTitle}>{shoe.name} / {shoe.brand}</Text>
                  <Text style={styles.retiredText}>Tap to edit, restore, or delete.</Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        </ScrollView>
        {renderPurchaseDatePicker()}
        {renderBusyOverlay()}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loginKeyboardWrap: { flex: 1 },
  loginScrollContent: { flexGrow: 1, justifyContent: 'center', paddingBottom: 36 },
  loginHeader: { alignItems: 'center', marginTop: 78, marginBottom: 10, paddingHorizontal: 20 },
  loginHeroImage: { width: 220, height: 220, marginBottom: 8 },
  loginTitle: { fontSize: 28, fontWeight: 'bold', color: '#0ff', marginBottom: 10, textAlign: 'center' },
  loginSubtitle: { fontSize: 24, color: '#ffff00', textAlign: 'center', paddingHorizontal: 20, fontFamily: ARCADE_FONT_FAMILY, lineHeight: 32 },
  loginForm: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 30 },
  forgotPasswordBtn: { marginBottom: 12, alignItems: 'center', borderWidth: 2, borderColor: '#ffff00', backgroundColor: '#181818', paddingHorizontal: 14, paddingVertical: 10, shadowColor: '#ffff00', shadowOpacity: 0.2, shadowRadius: 3, shadowOffset: { width: 0, height: 0 }, elevation: 4 },
  forgotPasswordText: { color: '#ffff00', fontSize: 11, fontFamily: ARCADE_FONT_FAMILY, textAlign: 'center' },
  input: { backgroundColor: '#000', borderWidth: 2, borderColor: '#0ff', color: '#0ff', padding: 12, marginBottom: 15, borderRadius: 0, fontSize: 12, fontFamily: ARCADE_FONT_FAMILY },
  inputHint: { color: '#ffff00', fontSize: 10, lineHeight: 16, marginTop: -8, marginBottom: 14, fontFamily: ARCADE_FONT_FAMILY },
  submitBtn: { backgroundColor: '#ff00ff', borderWidth: 3, borderColor: '#ffff00', padding: 15, marginTop: 20, marginBottom: 15, shadowColor: '#ff00ff', shadowOpacity: 0.25, shadowRadius: 4, shadowOffset: { width: 0, height: 0 }, elevation: 5 },
  submitBtnText: { color: '#000', fontWeight: 'bold', textAlign: 'center', fontSize: 14, fontFamily: ARCADE_FONT_FAMILY },
  doneBtn: { backgroundColor: '#00ff00', padding: 12, marginBottom: 10, alignItems: 'center' },
  doneBtnText: { color: '#000', fontWeight: 'bold', fontSize: 12, fontFamily: ARCADE_FONT_FAMILY },
  toggleAuth: { textAlign: 'center', color: '#00ff00', fontSize: 22, marginTop: 10, fontFamily: ARCADE_FONT_FAMILY, lineHeight: 28 },
  fieldLabel: { fontSize: 10, color: '#ffff00', marginBottom: 6, marginLeft: 2, fontWeight: 'bold', fontFamily: ARCADE_FONT_FAMILY },
  goldCoin: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#f6c443', borderWidth: 2, borderColor: '#ffd76a', shadowColor: '#f6c443', shadowOpacity: 0.6, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } },
  goldCoinCompact: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#f6c443', borderWidth: 1, borderColor: '#ffd76a', marginRight: 4 },
  runnerGifWrap: { width: 140, height: 140, marginBottom: 20 },
  runnerGif: { width: '100%', height: '100%' },
  runnerFallback: { fontSize: 28, color: '#0ff', textAlign: 'center', lineHeight: 136, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontWeight: 'bold' },
  runnerGifWrapCompact: { width: 46, height: 46, marginBottom: 6 },
  runnerGifCompact: { width: '100%', height: '100%' },
  runnerFallbackCompact: { fontSize: 10, color: '#0ff', textAlign: 'center', lineHeight: 44, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontWeight: 'bold' },
  header: { backgroundColor: '#10142a', borderBottomWidth: 3, borderBottomColor: '#ff00ff', paddingVertical: 6, paddingHorizontal: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 0 },
  detailHeaderCompact: { minHeight: 0, paddingBottom: 4, paddingVertical: 4 },
  headerBrand: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, paddingRight: 10, minWidth: 0 },
  headerBrandImage: { width: '100%', maxWidth: 180, height: 110 },
  headerTitleWrap: { flex: 1, minWidth: 0 },
  headerTitle: { fontSize: 16, fontWeight: '900', color: '#ffffff', flexShrink: 1, letterSpacing: 0.4, fontFamily: ARCADE_FONT_FAMILY },
  headerInfo: { alignItems: 'flex-end', gap: 4, flexShrink: 1, width: '48%', maxWidth: '48%' },
  profileButton: { borderWidth: 2, borderColor: '#ffff00', backgroundColor: '#181818', paddingHorizontal: 10, paddingVertical: 7, minWidth: 90, alignItems: 'center', shadowColor: '#ffff00', shadowOpacity: 0.2, shadowRadius: 3, shadowOffset: { width: 0, height: 0 }, elevation: 4 },
  profileButtonLabel: { fontSize: 8, color: '#ffff00', fontWeight: 'bold', fontFamily: ARCADE_FONT_FAMILY },
  headerStats: { alignItems: 'flex-end' },
  headerStatLine: { fontSize: 9, color: '#ffff00', textAlign: 'right', lineHeight: 14, fontFamily: ARCADE_FONT_FAMILY, flexWrap: 'wrap', width: '100%' },
  headerCoinsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', alignSelf: 'stretch' },
  headerCoinsText: { fontSize: 9, color: '#ffff00', textAlign: 'right', lineHeight: 14, fontFamily: ARCADE_FONT_FAMILY, marginLeft: 4, flexShrink: 1 },
  headerButtons: { flexDirection: 'row', paddingHorizontal: 15, paddingVertical: 6, gap: 10 },
  imageOnlyButton: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 6, backgroundColor: 'transparent' },
  scorecardToggleImage: { width: '100%', height: 64 },
  helpBtnHeader: { borderWidth: 2, borderColor: '#ffff00', backgroundColor: '#181818', paddingHorizontal: 10, paddingVertical: 7, minWidth: 90, alignItems: 'center', marginTop: 2, shadowColor: '#ffff00', shadowOpacity: 0.2, shadowRadius: 3, shadowOffset: { width: 0, height: 0 }, elevation: 4 },
  helpBtnText: { color: '#ffff00', fontWeight: 'bold', fontSize: 8, fontFamily: ARCADE_FONT_FAMILY },
  btnText: { color: '#0ff', fontWeight: 'bold', fontSize: 14, fontFamily: ARCADE_FONT_FAMILY },
  btnAddBottom: { backgroundColor: '#ff00ff', borderColor: '#ffff00', borderWidth: 2, paddingHorizontal: 15, paddingVertical: 8, alignItems: 'center', marginTop: 8, shadowColor: '#ff00ff', shadowOpacity: 0.2, shadowRadius: 3, shadowOffset: { width: 0, height: 0 }, elevation: 4 },
  btnAddText: { color: '#000', fontWeight: 'bold', fontSize: 12, fontFamily: ARCADE_FONT_FAMILY },
  btnPrimary: { backgroundColor: '#ff00ff', borderWidth: 2, borderColor: '#ffff00', padding: 15, marginBottom: 12, alignItems: 'center', shadowColor: '#ff00ff', shadowOpacity: 0.2, shadowRadius: 3, shadowOffset: { width: 0, height: 0 }, elevation: 4 },
  btnPrimaryText: { color: '#000', fontWeight: 'bold', fontSize: 12, fontFamily: ARCADE_FONT_FAMILY },
  btnDisabled: { backgroundColor: '#666', padding: 15, marginBottom: 12, alignItems: 'center' },
  content: { flex: 1, paddingHorizontal: 15, paddingTop: 15 },
  statsCard: { backgroundColor: '#1a1a2e', borderWidth: 3, borderColor: '#0ff', padding: 15, marginBottom: 20, shadowColor: '#0ff', shadowOpacity: 0.14, shadowRadius: 3, shadowOffset: { width: 0, height: 0 }, elevation: 3 },
  statsTitle: { fontSize: 14, fontWeight: 'bold', color: '#ffff00', marginBottom: 10, fontFamily: ARCADE_FONT_FAMILY },
  statLine: { fontSize: 11, color: '#0ff', marginBottom: 8, fontFamily: ARCADE_FONT_FAMILY, lineHeight: 16 },
  coinLegend: { backgroundColor: '#000', borderWidth: 2, borderColor: '#ffff00', padding: 12, marginVertical: 15 },
  legendTitle: { fontSize: 12, fontWeight: 'bold', color: '#ffff00', marginBottom: 8, fontFamily: ARCADE_FONT_FAMILY },
  legendBulletRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  legendBullet: { width: 14, fontSize: 12, color: '#0ff', fontFamily: ARCADE_FONT_FAMILY, lineHeight: 16 },
  legendText: { flex: 1, fontSize: 10, color: '#0ff', marginBottom: 0, fontFamily: ARCADE_FONT_FAMILY, lineHeight: 16 },
  helpStep: { fontSize: 12, color: '#0ff', marginBottom: 12, lineHeight: 22, fontFamily: ARCADE_FONT_FAMILY },
  levelTrack: { backgroundColor: '#000', borderWidth: 2, borderColor: '#0ff', padding: 12, marginBottom: 15 },
  levelTrackRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  levelTrackCoins: { color: '#ffff00', fontSize: 10, fontWeight: 'bold', fontFamily: ARCADE_FONT_FAMILY },
  levelTrackName: { color: '#0ff', fontSize: 10, flexShrink: 1, textAlign: 'right', fontFamily: ARCADE_FONT_FAMILY },
  achievementCount: { fontSize: 11, color: '#ffff00', marginBottom: 12, fontFamily: ARCADE_FONT_FAMILY },
  achievementGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  achievementCard: { width: '48%', backgroundColor: '#000', borderWidth: 2, borderColor: '#00ff00', padding: 10, alignItems: 'center' },
  achievementCardLocked: { opacity: 0.4, borderColor: '#666' },
  achievementCardIcon: { fontSize: 28, marginBottom: 5 },
  achievementCardName: { fontSize: 9, fontWeight: 'bold', color: '#0ff', textAlign: 'center', fontFamily: ARCADE_FONT_FAMILY },
  achievementCardDesc: { fontSize: 8, color: '#ffff00', textAlign: 'center', marginTop: 3, fontFamily: ARCADE_FONT_FAMILY, lineHeight: 14 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 80, marginBottom: 20 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#0ff', marginBottom: 10, fontFamily: ARCADE_FONT_FAMILY },
  emptyText: { fontSize: 11, color: '#ffff00', marginBottom: 20, fontFamily: ARCADE_FONT_FAMILY, lineHeight: 16 },
  statsGrid: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard2: { flex: 1, backgroundColor: '#1a1a2e', borderWidth: 2, borderColor: '#0ff', padding: 10, alignItems: 'center', justifyContent: 'center', minHeight: 92, shadowColor: '#0ff', shadowOpacity: 0.12, shadowRadius: 2, shadowOffset: { width: 0, height: 0 }, elevation: 2 },
  statLabel: { fontSize: 10, color: '#ffff00', marginBottom: 8, fontWeight: 'bold', textTransform: 'uppercase', fontFamily: ARCADE_FONT_FAMILY, textAlign: 'center', lineHeight: 14 },
  statValue: { fontSize: 22, fontWeight: 'bold', color: '#00ff00', fontFamily: ARCADE_FONT_FAMILY, textAlign: 'center' },
  statDetailValue: { fontSize: 14, fontWeight: 'bold', color: '#00ff00', textAlign: 'center', fontFamily: ARCADE_FONT_FAMILY, lineHeight: 18 },
  section: { marginBottom: 25 },
  sectionTitle: { fontSize: 17, fontWeight: 'bold', color: '#ffff00', fontFamily: ARCADE_FONT_FAMILY },
  sectionTitleImage: { width: '100%', height: 56, marginBottom: 12, alignSelf: 'center' },
  sectionTitleImageShoes: { width: '100%', height: 92, marginBottom: 6, alignSelf: 'center' },
  shoeCard: { backgroundColor: '#1a1a2e', borderWidth: 2, borderColor: '#00ff00', padding: 12, marginBottom: 12, shadowColor: '#00ff00', shadowOpacity: 0.14, shadowRadius: 3, shadowOffset: { width: 0, height: 0 }, elevation: 3 },
  shoeBannerText: { fontSize: 18, color: '#0ff', marginBottom: 12, fontWeight: 'bold', fontFamily: ARCADE_FONT_FAMILY, textAlign: 'center' },
  shoeCardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'stretch', gap: 14, marginBottom: 10 },
  shoePhotoWrap: { width: 128, height: 96 },
  shoeHeroImage: { width: '100%', height: '100%', borderWidth: 2, borderColor: '#0ff', backgroundColor: '#000' },
  shoeHeroPlaceholder: { width: '100%', height: '100%', borderWidth: 2, borderColor: '#0ff', backgroundColor: '#111', alignItems: 'center', justifyContent: 'center' },
  shoeHeroPlaceholderText: { color: '#ffff00', fontSize: 10, fontWeight: 'bold', fontFamily: ARCADE_FONT_FAMILY },
  shoeCardMeta: { flex: 1, alignItems: 'stretch', justifyContent: 'space-between' },
  shoeActionStack: { gap: 8, marginTop: 10 },
  deleteShoeBtn: { backgroundColor: '#5a0f0f', borderWidth: 1, borderColor: '#ff5a5a', paddingHorizontal: 10, paddingVertical: 5 },
  deleteShoeBtnText: { color: '#ffd5d5', fontSize: 9, fontWeight: 'bold', fontFamily: ARCADE_FONT_FAMILY },
  editShoeBtn: { backgroundColor: '#102a5a', borderWidth: 2, borderColor: '#5aa2ff', paddingHorizontal: 10, paddingVertical: 8, alignItems: 'center', shadowColor: '#5aa2ff', shadowOpacity: 0.2, shadowRadius: 3, shadowOffset: { width: 0, height: 0 }, elevation: 4 },
  editShoeBtnText: { color: '#d5e8ff', fontSize: 9, fontWeight: 'bold', fontFamily: ARCADE_FONT_FAMILY, textAlign: 'center' },
  progressBar: { height: 10, backgroundColor: '#000', borderWidth: 1, borderColor: '#0ff', marginBottom: 8, overflow: 'hidden' },
  progressBarWide: { height: 12, backgroundColor: '#000', borderWidth: 1, borderColor: '#0ff', marginBottom: 8, overflow: 'hidden' },
  progressOverflowBar: { height: 8, backgroundColor: '#220800', borderWidth: 1, borderColor: '#ff8c00', marginBottom: 6, overflow: 'hidden' },
  progressOverflowFill: { height: '100%', backgroundColor: '#ff8c00' },
  progressOverflowText: { fontSize: 9, color: '#ffb347', marginBottom: 8, fontWeight: 'bold', fontFamily: ARCADE_FONT_FAMILY },
  progressFill: { height: '100%', backgroundColor: '#00ff00' },
  shoeMileageSummary: { gap: 4 },
  progressMeterTitle: { fontSize: 9, color: '#ffff00', fontFamily: ARCADE_FONT_FAMILY, marginBottom: 4, marginTop: 2 },
  progressLabel: { flexDirection: 'row', justifyContent: 'space-between', fontSize: 9, color: '#ffff00', marginBottom: 10 },
  progressText: { fontSize: 9, color: '#ffff00', fontFamily: ARCADE_FONT_FAMILY, lineHeight: 14 },
  logBtn: { backgroundColor: '#00ff00', paddingVertical: 8, paddingHorizontal: 6, alignItems: 'center', borderWidth: 2, borderColor: '#ffff00', shadowColor: '#00ff00', shadowOpacity: 0.22, shadowRadius: 3, shadowOffset: { width: 0, height: 0 }, elevation: 4 },
  logBtnText: { color: '#000', fontWeight: 'bold', fontSize: 9, fontFamily: ARCADE_FONT_FAMILY, textAlign: 'center', lineHeight: 14 },
  retiredCard: { backgroundColor: '#171717', borderWidth: 1, borderColor: '#666', padding: 12, marginBottom: 10, shadowColor: '#666', shadowOpacity: 0.12, shadowRadius: 2, shadowOffset: { width: 0, height: 0 }, elevation: 2 },
  retiredTitle: { color: '#cccccc', fontSize: 12, fontWeight: 'bold', marginBottom: 4, fontFamily: ARCADE_FONT_FAMILY },
  retiredText: { color: '#999999', fontSize: 10, fontFamily: ARCADE_FONT_FAMILY, lineHeight: 14 },
  workoutCard: { backgroundColor: '#1a1a2e', borderWidth: 2, borderColor: '#ff00ff', padding: 12, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 12 },
  workoutCardAssigned: { borderColor: '#00ff00' },
  workoutMainCol: { flex: 1, paddingRight: 12 },
  workoutMileage: { fontSize: 14, fontWeight: 'bold', color: '#0ff', fontFamily: ARCADE_FONT_FAMILY },
  workoutDate: { fontSize: 10, color: '#ffff00', marginTop: 3, fontFamily: ARCADE_FONT_FAMILY, lineHeight: 14 },
  workoutAssignment: { fontSize: 9, color: '#00ff00', marginTop: 4, fontWeight: 'bold', fontFamily: ARCADE_FONT_FAMILY, lineHeight: 14 },
  workoutTap: { fontSize: 9, color: '#ff00ff', fontWeight: 'bold', fontFamily: ARCADE_FONT_FAMILY },
  workoutRightCol: { alignItems: 'flex-end', gap: 6 },
  workoutDelete: { fontSize: 9, color: '#ff7a7a', fontWeight: 'bold', fontFamily: ARCADE_FONT_FAMILY },
  workoutDetail: { fontSize: 12, color: '#0ff', marginBottom: 8, textAlign: 'center', fontFamily: ARCADE_FONT_FAMILY, lineHeight: 18 },
  workoutStatus: { fontSize: 10, color: '#00ff00', marginBottom: 12, textAlign: 'center', fontWeight: 'bold', fontFamily: ARCADE_FONT_FAMILY },
  pickShoeText: { fontSize: 11, fontWeight: 'bold', color: '#ffff00', marginBottom: 10, textAlign: 'center', fontFamily: ARCADE_FONT_FAMILY },
  shoeOption: { backgroundColor: '#000', borderWidth: 2, borderColor: '#00ff00', padding: 12, marginBottom: 8, shadowColor: '#00ff00', shadowOpacity: 0.14, shadowRadius: 2, shadowOffset: { width: 0, height: 0 }, elevation: 2 },
  shoeOptionActive: { borderColor: '#ffff00', backgroundColor: '#13131d', borderWidth: 5, shadowColor: '#ffff00', shadowOpacity: 1, shadowRadius: 14, shadowOffset: { width: 0, height: 0 }, elevation: 12 },
  shoeOptionText: { fontSize: 12, color: '#00ff00', fontWeight: 'bold', fontFamily: ARCADE_FONT_FAMILY, lineHeight: 18 },
  achievementPopup: { position: 'absolute', top: 100, left: 20, right: 20, backgroundColor: '#ff00ff', borderWidth: 3, borderColor: '#ffff00', padding: 20, alignItems: 'center', zIndex: 999, shadowColor: '#ffff00', shadowOpacity: 0.2, shadowRadius: 3, shadowOffset: { width: 0, height: 0 }, elevation: 4 },
  achievementIcon: { fontSize: 40, marginBottom: 10 },
  achievementTitle: { fontSize: 12, fontWeight: 'bold', color: '#000', marginBottom: 5, fontFamily: ARCADE_FONT_FAMILY, textAlign: 'center' },
  achievementName: { fontSize: 13, fontWeight: 'bold', color: '#000', marginBottom: 8, fontFamily: ARCADE_FONT_FAMILY, textAlign: 'center' },
  achievementCoins: { fontSize: 11, fontWeight: 'bold', color: '#000', fontFamily: ARCADE_FONT_FAMILY },
  detailTitle: { fontSize: 20, fontWeight: 'bold', color: '#0ff', textAlign: 'center', marginVertical: 15, fontFamily: ARCADE_FONT_FAMILY },
  detailBrand: { fontSize: 14, color: '#ffff00', textAlign: 'center', marginBottom: 20, fontFamily: ARCADE_FONT_FAMILY },
  detailShoeImage: { width: '100%', height: 200, borderWidth: 2, borderColor: '#0ff', marginBottom: 10, backgroundColor: '#111' },
  levelText: { fontSize: 11, fontWeight: 'bold' },
  backBtn: { fontSize: 12, color: '#0ff', fontWeight: 'bold', fontFamily: ARCADE_FONT_FAMILY },
  logItem: { backgroundColor: '#1a1a2e', borderLeftWidth: 3, borderLeftColor: '#00ff00', padding: 12, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', shadowColor: '#00ff00', shadowOpacity: 0.1, shadowRadius: 2, shadowOffset: { width: 0, height: 0 }, elevation: 2 },
  logTitle: { fontSize: 11, fontWeight: 'bold', color: '#0ff', fontFamily: ARCADE_FONT_FAMILY, lineHeight: 16 },
  logDate: { fontSize: 9, color: '#ffff00', marginTop: 3, fontFamily: ARCADE_FONT_FAMILY, lineHeight: 14 },
  logMileage: { fontSize: 16, fontWeight: 'bold', color: '#00ff00', fontFamily: ARCADE_FONT_FAMILY },
  logSourceTag: { fontSize: 9, color: '#0ff', marginTop: 4, fontWeight: 'bold', fontFamily: ARCADE_FONT_FAMILY },
  logActionCol: { alignItems: 'flex-end', justifyContent: 'center', gap: 8 },
  logActionEdit: { fontSize: 9, color: '#5aa2ff', fontWeight: 'bold', fontFamily: ARCADE_FONT_FAMILY },
  profileEmailText: { color: '#0ff', fontSize: 13, fontWeight: 'bold', fontFamily: ARCADE_FONT_FAMILY, lineHeight: 20 },
  accountDeleteCopy: { color: '#ffd5d5', fontSize: 10, lineHeight: 17, marginBottom: 12, fontFamily: ARCADE_FONT_FAMILY },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'flex-end' },
  modalOverlayTop: { justifyContent: 'flex-start', paddingTop: 40 },
  modalContent: { backgroundColor: '#000', borderTopWidth: 3, borderTopColor: '#0ff', padding: 20 },
  modalScrollContent: { flexGrow: 1, justifyContent: 'flex-start' },
  modalTopContent: { paddingBottom: 30 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, borderBottomWidth: 2, borderBottomColor: '#ff00ff', paddingBottom: 10 },
  modalTitle: { fontSize: 14, fontWeight: 'bold', color: '#0ff', fontFamily: ARCADE_FONT_FAMILY },
  closeBtn: { fontSize: 40, color: '#ff0000', fontWeight: 'bold', lineHeight: 40, paddingHorizontal: 8 },
  photoBtnRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  photoBtn: { flex: 1, backgroundColor: '#1a1a2e', borderWidth: 2, borderColor: '#0ff', paddingVertical: 10, alignItems: 'center' },
  photoBtnText: { color: '#0ff', fontSize: 10, fontWeight: 'bold', fontFamily: ARCADE_FONT_FAMILY },
  newShoePreview: { width: '100%', height: 150, borderWidth: 2, borderColor: '#0ff', marginBottom: 10, backgroundColor: '#111', borderRadius: 12 },
  datePickerBtn: { backgroundColor: '#000', borderWidth: 2, borderColor: '#0ff', padding: 12, marginBottom: 15 },
  datePickerBtnText: { color: '#0ff', fontSize: 12, fontFamily: ARCADE_FONT_FAMILY },
  btnSecondary: { backgroundColor: '#102a5a', borderWidth: 2, borderColor: '#5aa2ff', padding: 12, marginTop: 12, marginBottom: 12, alignItems: 'center', shadowColor: '#5aa2ff', shadowOpacity: 0.2, shadowRadius: 3, shadowOffset: { width: 0, height: 0 }, elevation: 4 },
  btnSecondaryText: { color: '#d5e8ff', fontWeight: 'bold', fontSize: 12, fontFamily: ARCADE_FONT_FAMILY },
  btnDanger: { backgroundColor: '#5a0f0f', borderWidth: 2, borderColor: '#ff5a5a', padding: 12, marginBottom: 12, alignItems: 'center', shadowColor: '#ff5a5a', shadowOpacity: 0.2, shadowRadius: 3, shadowOffset: { width: 0, height: 0 }, elevation: 4 },
  btnDangerText: { color: '#ffd5d5', fontWeight: 'bold', fontSize: 12, fontFamily: ARCADE_FONT_FAMILY },
  syncRangeLabel: { color: '#ffff00', fontSize: 10, marginBottom: 10, fontFamily: ARCADE_FONT_FAMILY, lineHeight: 16 },
  iPadHealthNote: { color: '#ffff00', fontSize: 10, marginBottom: 10, fontFamily: ARCADE_FONT_FAMILY, lineHeight: 16 },
  autoSyncNote: { color: '#00ff00', fontSize: 10, marginBottom: 10, fontFamily: ARCADE_FONT_FAMILY, lineHeight: 16 },
  syncRangeRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  syncRangeBtn: { borderWidth: 1, borderColor: '#0ff', paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#111' },
  syncRangeBtnActive: { backgroundColor: '#0ff' },
  syncRangeBtnText: { color: '#000', fontWeight: 'bold', fontSize: 10, fontFamily: ARCADE_FONT_FAMILY },
  syncRangeBtnTextInactive: { color: '#0ff' },
  importPreviewCard: { backgroundColor: '#1a1a2e', borderWidth: 2, borderColor: '#0ff', padding: 12, marginBottom: 10, shadowColor: '#0ff', shadowOpacity: 0.12, shadowRadius: 2, shadowOffset: { width: 0, height: 0 }, elevation: 2 },
  importPreviewCardSelected: { borderColor: '#ffff00', borderWidth: 5, shadowColor: '#ffff00', shadowOpacity: 0.8, shadowRadius: 14, shadowOffset: { width: 0, height: 0 }, elevation: 12 },
  importPreviewCardDisabled: { opacity: 0.5 },
  importPreviewMainCol: { width: '100%' },
  importPreviewSelectBtn: { marginTop: 10, backgroundColor: '#111', borderWidth: 2, borderColor: '#ffff00', paddingVertical: 12, alignItems: 'center', shadowColor: '#ffff00', shadowOpacity: 0.18, shadowRadius: 2, shadowOffset: { width: 0, height: 0 }, elevation: 3 },
  importPreviewSelectBtnActive: { backgroundColor: '#2a2a00', borderWidth: 4, shadowColor: '#ffff00', shadowOpacity: 0.85, shadowRadius: 12, shadowOffset: { width: 0, height: 0 }, elevation: 10 },
  importSelectLabel: { color: '#ffff00', fontWeight: 'bold', fontSize: 10, fontFamily: ARCADE_FONT_FAMILY, textAlign: 'center' },
  calendarOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.88)', justifyContent: 'center', paddingHorizontal: 20 },
  calendarCard: { backgroundColor: '#000', borderWidth: 3, borderColor: '#0ff', padding: 16 },
  celebrationOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  celebrationCard: { width: '100%', backgroundColor: '#140c24', borderWidth: 3, borderColor: '#ffff00', padding: 20, alignItems: 'center', shadowColor: '#ffff00', shadowOpacity: 0.16, shadowRadius: 3, shadowOffset: { width: 0, height: 0 }, elevation: 3 },
  celebrationTitle: { color: '#ffff00', fontSize: 14, fontFamily: ARCADE_FONT_FAMILY, textAlign: 'center', marginBottom: 16 },
  celebrationImage: { width: 160, height: 160, marginBottom: 16 },
  celebrationName: { color: '#0ff', fontSize: 13, fontFamily: ARCADE_FONT_FAMILY, textAlign: 'center', marginBottom: 10, lineHeight: 20 },
  celebrationDescription: { color: '#ffffff', fontSize: 10, fontFamily: ARCADE_FONT_FAMILY, textAlign: 'center', marginBottom: 16, lineHeight: 18 },
  celebrationBtn: { backgroundColor: '#00ff00', borderWidth: 2, borderColor: '#ffff00', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  celebrationBtnText: { color: '#000', fontSize: 11, fontFamily: ARCADE_FONT_FAMILY, textAlign: 'center' },
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  calendarTitle: { color: '#ffff00', fontSize: 12, fontFamily: ARCADE_FONT_FAMILY, textAlign: 'center', flex: 1 },
  calendarNav: { color: '#0ff', fontSize: 20, fontFamily: ARCADE_FONT_FAMILY, paddingHorizontal: 12 },
  calendarWeekRow: { flexDirection: 'row', marginBottom: 8 },
  calendarWeekday: { flex: 1, color: '#ffff00', textAlign: 'center', fontSize: 10, fontFamily: ARCADE_FONT_FAMILY },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 14 },
  calendarDay: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#1a1a2e' },
  calendarDayActive: { backgroundColor: '#ff00ff', borderColor: '#ffff00' },
  calendarDayDisabled: { opacity: 0.2 },
  calendarDayText: { color: '#0ff', fontSize: 10, fontFamily: ARCADE_FONT_FAMILY },
  calendarDayTextActive: { color: '#000' },
  busyOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', zIndex: 2000 },
  busyOverlayStatic: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  busyCard: { backgroundColor: '#111827', borderWidth: 3, borderColor: '#ffff00', padding: 20, width: '78%', alignItems: 'center' },
  loadingArt: { width: 220, height: 220, marginBottom: 12 },
  loadingArtFullScreen: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%', alignSelf: 'center' },
  startupIcon: { width: 250, height: 250 },
  emptyImportState: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  emptyImportTitle: { color: '#ffff00', fontSize: 24, fontFamily: ARCADE_FONT_FAMILY, textAlign: 'center', lineHeight: 36, marginBottom: 28 },
  stackedHeader: { flexDirection: 'column', alignItems: 'stretch', justifyContent: 'center', gap: 8 },
  stackedHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  previewShoePickerRow: { gap: 8, paddingTop: 6, paddingBottom: 2, minWidth: '100%' },
  previewShoeChip: { backgroundColor: '#111', borderWidth: 2, borderColor: '#0ff', paddingHorizontal: 12, paddingVertical: 10, marginRight: 8, minWidth: 128, alignItems: 'center', justifyContent: 'center' },
  previewShoeChipInactive: { opacity: 0.7 },
  previewShoeChipActive: { borderColor: '#ffff00', backgroundColor: '#2a2a00', borderWidth: 5, shadowColor: '#ffff00', shadowOpacity: 1, shadowRadius: 14, shadowOffset: { width: 0, height: 0 }, elevation: 12 },
  previewShoeChipText: { color: '#0ff', fontSize: 10, fontFamily: ARCADE_FONT_FAMILY, textAlign: 'center' },
  selectedShoeSummary: { color: '#00ff00', fontSize: 10, fontFamily: ARCADE_FONT_FAMILY, lineHeight: 16, marginBottom: 8 },
  selectedShoeSummaryMuted: { color: '#ff9f43', fontSize: 10, fontFamily: ARCADE_FONT_FAMILY, lineHeight: 16, marginBottom: 8 },
  loadingCancelBtn: { position: 'absolute', bottom: 44, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.68)', borderWidth: 2, borderColor: '#ffff00', paddingHorizontal: 24, paddingVertical: 12 },
  loadingCancelBtnText: { color: '#ffff00', fontSize: 16, fontWeight: 'bold', fontFamily: ARCADE_FONT_FAMILY },
  busyTitle: { fontSize: 28, color: '#0ff', fontWeight: 'bold', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', marginBottom: 8 },
  busyText: { fontSize: 12, color: '#ffff00', textAlign: 'center', fontFamily: ARCADE_FONT_FAMILY, lineHeight: 18 },
  title: { fontSize: 20, color: '#0ff', textAlign: 'center', marginTop: 20 },
});
