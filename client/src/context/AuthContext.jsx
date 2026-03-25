import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged
} from "firebase/auth";
import { doc, onSnapshot, getDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { getUserProfile, createUserProfile } from "../services/firebase/userService";
import axios from "axios";

const AuthContext = createContext(null);

// API Base URL (Standard for the project)
const API_URL = "http://127.0.0.1:5000/api/auth";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isVerified, setIsVerifiedState] = useState(() => {
    // Check sessionStorage for persistent verification in the same session
    return sessionStorage.getItem("otp_verified") === "true";
  });

  const setIsVerified = useCallback((value) => {
    setIsVerifiedState(value);
    sessionStorage.setItem("otp_verified", value ? "true" : "false");
  }, []);

  useEffect(() => {
    // Safety timeout to prevent infinite blank screen
    const timeoutId = setTimeout(() => {
      if (loading) {
        setLoading(false);
      }
    }, 5000);

    let unsubscribeProfile = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (firebaseUser) {
        setUser(firebaseUser);

        // Try to find profile in "players" or "owners"
        const findAndListenProfile = async () => {
          // 1. Try players first
          let collectionName = "players";
          let docRef = doc(db, collectionName, firebaseUser.uid);
          let docSnap = await getDoc(docRef);

          // 2. If not in players, try owners
          if (!docSnap.exists()) {
            collectionName = "owners";
            docRef = doc(db, collectionName, firebaseUser.uid);
            docSnap = await getDoc(docRef);
          }

          // 3. Start listening to whichever collection the user belongs to
          if (docSnap.exists()) {
            unsubscribeProfile = onSnapshot(docRef, (snapshot) => {
              if (snapshot.exists()) {
                const userData = snapshot.data();
                setRole(userData.role);
                setUser({
                  uid: firebaseUser.uid,
                  email: firebaseUser.email,
                  displayName: userData.name || firebaseUser.displayName,
                  ...userData
                });
              }
              setLoading(false);
            });
          } else {
            setUser(firebaseUser); // Even if no profile yet, set user
            setRole(null);
            setLoading(false);
          }
        };

        findAndListenProfile();
      } else {
        setUser(null);
        setRole(null);
        setLoading(false);
      }
      clearTimeout(timeoutId);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
      clearTimeout(timeoutId);
    };
  }, []);

  const login = useCallback(async (email, password, expectedRole) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      // Check if user exists in the expected collection for this role
      const collectionName = expectedRole === "owner" ? "owners" : "players";
      const docRef = doc(db, collectionName, firebaseUser.uid);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        // Sign out immediately if role mismatch
        await signOut(auth);
        const error = new Error(`This account is not registered as a ${expectedRole === 'owner' ? 'Turf Owner' : 'Player'}.`);
        throw error;
      }

      return firebaseUser;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  }, []);

  const signup = useCallback(async (name, email, password, selectedRole) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      const collectionName = selectedRole === "owner" ? "owners" : "players";

      // Store user profile and role in correct collection
      await createUserProfile(firebaseUser.uid, {
        name,
        email,
        role: selectedRole,
        createdAt: new Date().toISOString()
      }, collectionName);

      return firebaseUser;
    } catch (error) {
      console.error("Signup error:", error);
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
      setIsVerified(false);
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  }, []);

  /**
   * Triggers a password reset email via the CUSTOM server-side API.
   * This is more reliable than the client-side Firebase SDK call.
   */
  const resetPassword = useCallback(async (email) => {
    try {
      console.log(`Requesting server-side password reset for: ${email}`);
      const response = await axios.post(`${API_URL}/password-reset`, { email });
      console.log("Password reset response:", response.data);
      return response.data;
    } catch (error) {
      console.error("Password reset error:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Failed to send reset email");
    }
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      role, 
      login, 
      signup, 
      logout, 
      resetPassword,
      isAuthenticated: !!user,
      isVerified,
      setIsVerified,
      loading 
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
