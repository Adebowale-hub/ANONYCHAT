// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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


export const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();