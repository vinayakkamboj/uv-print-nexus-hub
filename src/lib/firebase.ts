
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  // IMPORTANT: Replace with your Firebase configuration
  apiKey: "AIzaSyAz9n6m6nFCH3zrhcCa7egABB6hX9RxicA",
  authDomain: "micro-uv-printers.firebaseapp.com",
  projectId: "micro-uv-printers",
  storageBucket: "micro-uv-printers.firebasestorage.app",
  messagingSenderId: "999296557493",
  appId: "1:999296557493:web:271981a450c1692143b9fc",
  measurementId: "G-YPYH12FLLM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// Initialize Analytics conditionally (browser only)
export const initAnalytics = async () => {
  if (typeof window !== 'undefined') {
    const analyticsSupported = await isSupported();
    if (analyticsSupported) {
      return getAnalytics(app);
    }
  }
  return null;
};

// Utility function to check if we're in a production environment
export const isProduction = () => {
  return window.location.hostname !== 'localhost' && 
         !window.location.hostname.includes('127.0.0.1');
};

export default app;
