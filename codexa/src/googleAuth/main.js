import { initializeApp } from "firebase/app";
import { 
  browserLocalPersistence, 
  getAuth, 
  setPersistence,
  fetchSignInMethodsForEmail 
} from "firebase/auth";
import { getFirestore, collection, addDoc, updateDoc, doc, getDocs, query, where, orderBy, serverTimestamp, getDoc, arrayUnion } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Set persistence to LOCAL
setPersistence(auth, browserLocalPersistence)
  .then(() => console.log("Firebase persistence set to LOCAL"))
  .catch(error => console.error("Error setting persistence:", error));

const db = getFirestore(app);
const conversationsRef = collection(db, "conversations");

export { 
  auth, 
  db, 
  fetchSignInMethodsForEmail, 
  conversationsRef,
  collection,
  addDoc,
  updateDoc,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  getDoc,
  arrayUnion,
};