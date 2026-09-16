// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence, signInAnonymously } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAj_KSseuazkgp7UJW0HLctm7WFkuslIfA",
  authDomain: "chat-84eb5.firebaseapp.com",
  projectId: "chat-84eb5",
  storageBucket: "chat-84eb5.firebasestorage.app",
  messagingSenderId: "447569818634",
  appId: "1:447569818634:web:271cd1f65a17ed19691bf3",
  measurementId: "G-PEJDZS1JR5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
export const auth = getAuth(app);

// Enforce browser local persistence so users stay logged in across app restarts
if (typeof window !== 'undefined') {
  setPersistence(auth, browserLocalPersistence).catch((err) => {
    console.warn("Could not set auth persistence to browserLocalPersistence:", err);
  });
}

export const googleProvider = new GoogleAuthProvider();
export { signInAnonymously };