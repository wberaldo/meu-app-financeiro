// --- START OF FILE firebase.js ---

import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import {
  getDatabase,
  ref,
  set,
  onValue,
  push,
  get,
  off // Import 'off' for cleaning up listeners
} from 'firebase/database';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

// --- Authentication Functions ---

const signUp = (email, password) => {
  return createUserWithEmailAndPassword(auth, email, password);
};

const logIn = (email, password) => {
  return signInWithEmailAndPassword(auth, email, password);
};

const logOut = () => {
  return signOut(auth);
};

// --- Database Functions ---

// Function to create the initial user profile structure
const createInitialUserProfile = (userId) => {
  const defaultProfileRef = ref(database, `users/${userId}/profiles/default`);
  return set(defaultProfileRef, {
    name: 'Principal',
    financialData: {
      incomeList: [],
      expenseList: [],
      recurringList: [],
      installmentList: []
    }
  });
};

// Function to create a new profile
const createProfile = (userId, profileName) => {
  const profilesRef = ref(database, `users/${userId}/profiles`);
  const newProfileRef = push(profilesRef); // Get key first
  const newProfileData = {
    name: profileName,
    financialData: { incomeList: [], expenseList: [], recurringList: [], installmentList: [] }
  };
  return set(newProfileRef, newProfileData).then(() => newProfileRef.key); // Return the key on success
};

// Function to save financial data for a specific profile
const saveFinancialData = (userId, profileId, data) => {
  if (!userId || !profileId) {
    return Promise.reject(new Error("User ID and Profile ID are required to save data."));
  }
  const dataRef = ref(database, `users/${userId}/profiles/${profileId}/financialData`);
  // Ensure arrays are saved even if empty, prevent saving undefined
  const dataToSave = {
    incomeList: data.incomeList || [],
    expenseList: data.expenseList || [],
    recurringList: data.recurringList || [],
    installmentList: data.installmentList || [],
  };
  return set(dataRef, dataToSave);
};

// Function to listen for profile changes
const listenToProfiles = (userId, callback) => {
  const profilesRef = ref(database, `users/${userId}/profiles`);
  const listener = onValue(profilesRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      const profilesArray = Object.entries(data).map(([key, value]) => ({
        id: key,
        name: value.name
      }));
      callback(profilesArray);
    } else {
      callback([]); // No profiles found
    }
  }, (error) => {
      console.error("Error listening to profiles:", error);
      callback([]); // Pass empty array on error
  });
  // Return the unsubscribe function
  return () => off(profilesRef, 'value', listener);
};

// Function to listen for financial data changes
const listenToFinancialData = (userId, profileId, callback) => {
  if (!userId || !profileId) {
      console.warn("Cannot listen to financial data without User ID and Profile ID.");
      return () => {}; // Return empty unsubscribe function
  }
  const financialDataRef = ref(database, `users/${userId}/profiles/${profileId}/financialData`);
  const listener = onValue(financialDataRef, (snapshot) => {
    const data = snapshot.val();
    console.log("📥 Data received from Firebase:", data);
    // Ensure structure exists even if data is null/missing
    const structuredData = {
        incomeList: data?.incomeList || [],
        expenseList: data?.expenseList || [],
        recurringList: data?.recurringList || [],
        installmentList: data?.installmentList || [],
    };
    callback(structuredData);
  }, (error) => {
      console.error("Error listening to financial data:", error);
      // Optionally provide empty structure on error
      callback({ incomeList: [], expenseList: [], recurringList: [], installmentList: [] });
  });
  // Return the unsubscribe function
  return () => off(financialDataRef, 'value', listener);
};


export {
  auth, // Export auth instance for onAuthStateChanged
  database, // Export database instance if needed directly (try to avoid)
  ref, // Export ref for specific direct use cases if necessary
  set, // Export set for specific direct use cases if necessary
  get, // Export get for one-time reads if necessary

  // Auth Actions
  signUp,
  logIn,
  logOut,
  onAuthStateChanged,

  // Database Actions
  createInitialUserProfile,
  createProfile,
  saveFinancialData,
  listenToProfiles,
  listenToFinancialData,
};
// --- END OF FILE firebase.js ---