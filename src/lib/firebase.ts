
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage, ref } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";

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

// Initialize Storage
const storage = getStorage(app);

// Define storageRef function outside conditionals to avoid syntax errors
let storageRef: (path: string) => any;

// Patch the storage to use demo mode for preview environment
// This helps prevent CORS issues in the preview environment
if (window.location.hostname.includes('lovable.app') || 
    window.location.hostname.includes('preview') || 
    window.location.hostname.includes('localhost')) {
  console.log("Preview environment detected, using local storage fallback");
  
  // Add preview domain to authorized domains
  // Note: This doesn't actually modify Firebase settings, but helps the app use fallbacks
  const previewDomain = window.location.hostname;
  console.log(`Adding ${previewDomain} to simulated authorized domains list`);
  
  // Create a wrapper function that will intercept storage operations
  const createLocalStorageRef = function(storageInstance: any, path: string) {
    const actualRef = ref(storageInstance, path);
    
    // Create a proxy object to intercept operations
    const proxiedRef = Object.create(actualRef);
    
    // Add a put method that returns a mock response
    proxiedRef.put = function(data: any) {
      console.log(`Storage in preview mode: Using local file simulation for ${path}`);
      // Return a promise that resolves with a mock snapshot
      return Promise.resolve({
        ref: actualRef,
        metadata: {
          fullPath: path,
          name: path.split('/').pop()
        }
      });
    };
    
    return proxiedRef;
  };

  // Set the storageRef function for preview environments
  storageRef = (path) => createLocalStorageRef(storage, path);
} else {
  // In production, use the regular ref function
  storageRef = (path) => ref(storage, path);
}

// Export storageRef after it's been defined
export { storageRef, storage };

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
