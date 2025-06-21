
import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
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

// Test database connection immediately
const testConnection = async () => {
  try {
    console.log("🔥 Firebase initialized successfully");
    console.log("📊 Project ID:", firebaseConfig.projectId);
    console.log("🔐 Auth Domain:", firebaseConfig.authDomain);
    
    // Log current auth state
    auth.onAuthStateChanged((user) => {
      console.log("🔐 Auth state changed:", user ? `User: ${user.uid}` : "No user");
    });
    
  } catch (error) {
    console.error("❌ Firebase initialization error:", error);
  }
};

testConnection();

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

export default app;
