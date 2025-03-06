import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getDatabase, ref, set, onValue, push } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyDEOkHL0Ne_xuYunyaMl9XqICgbeEljq8I",
  authDomain: "meu-app-financeiro-526aa.firebaseapp.com",
  projectId: "meu-app-financeiro-526aa",
  storageBucket: "meu-app-financeiro-526aa.firebasestorage.app",
  messagingSenderId: "466982549813",
  appId: "1:466982549813:web:843016927fc6b5d6e2f47c",
  measurementId: "G-0WG2L9Q32R"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

export { auth, database, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, ref, set, onValue, push };