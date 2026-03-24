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

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

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
      const user = userCredential.user;
      return user;
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
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      role, 
      login, 
      signup, 
      logout, 
      isAuthenticated: !!user,
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
