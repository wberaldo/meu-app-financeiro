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

// --- Firebase Configuration ---
// Ensure your environment variables are correctly set up in your project (.env file)
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL, // Explicitly add databaseURL if needed/used
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID, // Optional
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

// --- Authentication Functions (Unchanged) ---

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
// Creates the basic structure with empty lists. Items added later will have category/tags.
const createInitialUserProfile = (userId) => {
  const profilesRef = ref(database, `users/${userId}/profiles`);
  // Use a known key like 'default' or push() for a unique ID if preferred
  // Using 'default' might simplify finding the first profile, but push() is safer for multiple profiles
  const defaultProfileKey = 'default'; // Or use push(profilesRef).key;
  const defaultProfileRef = ref(database, `users/${userId}/profiles/${defaultProfileKey}`);

  console.log(`Creating initial profile structure for user ${userId} at key ${defaultProfileKey}`);
  return set(defaultProfileRef, {
    name: 'Principal', // Default name
    createdAt: new Date().toISOString(), // Add creation timestamp
    financialData: {
      // Initialize with empty lists. Items added later will include category/tags.
      incomeList: [],
      expenseList: [],
      recurringList: [],
      // budgets: {}, // Placeholder for future budgeting feature
      // goals: [],   // Placeholder for future goals feature
    }
  });
};

// Function to create a new profile
// Creates a new profile node with empty lists.
const createProfile = (userId, profileName) => {
  const profilesRef = ref(database, `users/${userId}/profiles`);
  const newProfileRef = push(profilesRef); // Generate a unique key for the new profile

  console.log(`Creating new profile "${profileName}" for user ${userId} with key ${newProfileRef.key}`);
  const newProfileData = {
    name: profileName,
    createdAt: new Date().toISOString(), // Add creation timestamp
    financialData: {
      incomeList: [],
      expenseList: [],
      recurringList: [],
      // budgets: {}, // Placeholder
      // goals: [],   // Placeholder
    }
  };
  // Set the data at the unique key and return the key
  return set(newProfileRef, newProfileData).then(() => newProfileRef.key);
};

// Function to save financial data for a specific profile
// Saves the entire financialData object. Assumes the 'data' object passed from React
// already contains items with 'category' and 'tags' fields within the lists.
const saveFinancialData = (userId, profileId, data) => {
  if (!userId || !profileId) {
    console.error("Save Error: User ID and Profile ID are required.");
    return Promise.reject(new Error("User ID and Profile ID are required to save data."));
  }
  if (!data) {
      console.error("Save Error: No data provided to save.");
      return Promise.reject(new Error("No data provided to save."));
  }

  const dataRef = ref(database, `users/${userId}/profiles/${profileId}/financialData`);

  // Prepare data for saving: Ensure lists are arrays.
  // This structure now implicitly handles items within the lists
  // having 'category' and 'tags' because the entire list object is saved.
  const dataToSave = {
    incomeList: data.incomeList || [],
    expenseList: data.expenseList || [],
    recurringList: data.recurringList || [],
    // budgets: data.budgets || {}, // Include future structures
    // goals: data.goals || [],     // Include future structures
    // Add a timestamp for the last update?
    // lastUpdated: new Date().toISOString()
  };

  // Optional: Deep sanitization (more complex, usually handled client-side)
  // You could iterate through each item in each list here and ensure
  // only expected fields (id, amount, description, date, category, tags, etc.) are saved.
  // Example (pseudo-code):
  // dataToSave.expenseList = dataToSave.expenseList.map(item => ({
  //   id: item.id, amount: item.amount, ..., category: item.category, tags: item.tags
  // }));

  console.log(`Saving data for user ${userId}, profile ${profileId}:`, dataToSave);
  return set(dataRef, dataToSave);
};

// Function to listen for profile changes (Unchanged)
const listenToProfiles = (userId, callback) => {
  const profilesRef = ref(database, `users/${userId}/profiles`);
  const listener = onValue(profilesRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      // Map the object of profiles into an array
      const profilesArray = Object.entries(data).map(([key, value]) => ({
        id: key, // The unique key generated by push() or the 'default' key
        name: value.name || 'Unnamed Profile' // Provide default name if missing
      }));
      console.log(`Profiles loaded for user ${userId}:`, profilesArray);
      callback(profilesArray);
    } else {
      console.log(`No profiles found for user ${userId}.`);
      callback([]); // No profiles exist
    }
  }, (error) => {
      console.error(`Error listening to profiles for user ${userId}:`, error);
      callback([]); // Return empty array on error
  });
  // Return the unsubscribe function
  return () => {
      console.log(`Unsubscribing from profile listener for user ${userId}`);
      off(profilesRef, 'value', listener);
  }
};

// Function to listen for financial data changes for a specific profile
// Returns the data structure including lists where items might have 'category' and 'tags'.
const listenToFinancialData = (userId, profileId, callback) => {
  if (!userId || !profileId) {
      console.warn("Listener Warning: Cannot listen to financial data without User ID and Profile ID.");
      // Provide a default empty structure via callback immediately
      callback({ incomeList: [], expenseList: [], recurringList: [] /*, budgets: {}, goals: [] */ });
      return () => {}; // Return a no-op unsubscribe function
  }

  const financialDataRef = ref(database, `users/${userId}/profiles/${profileId}/financialData`);
  console.log(`Setting up listener for financial data: users/${userId}/profiles/${profileId}/financialData`);

  const listener = onValue(financialDataRef, (snapshot) => {
    const data = snapshot.val();
    console.log(`📥 Data received from Firebase (user ${userId}, profile ${profileId}):`, data);

    // Ensure the basic structure exists and lists are arrays, even if data is null/incomplete.
    // This correctly passes through items with category/tags if they exist in 'data'.
    const structuredData = {
        incomeList: data?.incomeList || [],
        expenseList: data?.expenseList || [],
        recurringList: data?.recurringList || [],
        // budgets: data?.budgets || {}, // Handle future structures
        // goals: data?.goals || [],     // Handle future structures
    };

    // It's good practice to validate list items here if needed, e.g., ensure amount is number.
    // Example (pseudo-code):
    // structuredData.expenseList = structuredData.expenseList.filter(item => typeof item.amount === 'number');

    callback(structuredData);
  }, (error) => {
      console.error(`Error listening to financial data (user ${userId}, profile ${profileId}):`, error);
      // Provide default empty structure on error
      callback({ incomeList: [], expenseList: [], recurringList: [] /*, budgets: {}, goals: [] */ });
  });

  // Return the unsubscribe function
  return () => {
      console.log(`Unsubscribing from financial data listener (user ${userId}, profile ${profileId})`);
      off(financialDataRef, 'value', listener);
  }
};


// --- Exports ---
export {
  // Firebase services/instances
  auth,
  database,

  // Firebase methods (optional, if needed directly in components)
  ref,
  set,
  get,
  push, // Export push if needed for generating keys client-side (usually not)
  off,  // Export off if manual listener cleanup is needed elsewhere (usually not)

  // Auth Actions
  signUp,
  logIn,
  logOut,
  onAuthStateChanged, // Exported for use in App.js

  // Database Actions
  createInitialUserProfile,
  createProfile,
  saveFinancialData,
  listenToProfiles,
  listenToFinancialData,
};
// --- END OF FILE firebase.js ---