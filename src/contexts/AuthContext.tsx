import { createContext, useContext, useEffect, useState } from "react";
import { 
  User, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

type UserData = {
  uid: string;
  name: string;
  email: string;
  phone: string;
  gstNumber: string;
  createdAt: any;
  address?: string; // Add address as an optional property
}

interface AuthContextProps {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  signup: (email: string, password: string, userData: Omit<UserData, 'uid' | 'createdAt'>) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  googleSignIn: () => Promise<void>;
  updateUserProfile: (updatedData: UserData) => void;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        try {
          const userDocRef = doc(db, "users", currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            setUserData(userDoc.data() as UserData);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      } else {
        setUserData(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signup = async (email: string, password: string, data: Omit<UserData, 'uid' | 'createdAt'>) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Save additional user data to Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name: data.name,
        email: data.email,
        phone: data.phone,
        gstNumber: data.gstNumber,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error during signup:", error);
      throw error;
    }
  };

  const login = async (email: string, password: string): Promise<void> => {
    await signInWithEmailAndPassword(auth, email, password);
    return;
  };

  const logout = async () => {
    return signOut(auth);
  };

  const googleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Check if user already exists in Firestore
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        // Save new user to Firestore
        await setDoc(userDocRef, {
          uid: user.uid,
          name: user.displayName || "",
          email: user.email || "",
          phone: "",
          gstNumber: "",
          createdAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error("Error during Google sign in:", error);
      throw error;
    }
  };

  // Add the updateUserProfile function
  const updateUserProfile = (updatedData: UserData) => {
    setUserData(updatedData);
  };

  const value = {
    user,
    userData,
    loading,
    signup,
    login,
    logout,
    googleSignIn,
    updateUserProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
