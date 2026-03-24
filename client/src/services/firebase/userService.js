import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";

/**
 * Fetches a user profile from Firestore by UID and collection.
 * @param {string} uid 
 * @param {string} collectionName - "players" or "owners"
 * @returns {Promise<Object|null>}
 */
export const getUserProfile = async (uid, collectionName = "players") => {
  try {
    const userDoc = await getDoc(doc(db, collectionName, uid));
    if (userDoc.exists()) {
      return { uid, ...userDoc.data() };
    }
    return null;
  } catch (error) {
    if (error.code === 'unavailable' || error.message?.includes('offline')) {
      console.warn("User is offline. Using cached data if available.");
      return null;
    }
    console.error(`Error fetching profile from ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Creates or updates a user profile in Firestore.
 * @param {string} uid 
 * @param {Object} data 
 * @param {string} collectionName - "players" or "owners"
 * @returns {Promise<void>}
 */
export const createUserProfile = async (uid, data, collectionName = "players") => {
  try {
    const profileData = {
      ...data,
      updatedAt: new Date().toISOString()
    };
    
    if (collectionName === "players") {
      profileData.favorites = [];
    }

    await setDoc(doc(db, collectionName, uid), profileData);
  } catch (error) {
    console.error(`Error creating profile in ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Updates an existing user profile in Firestore.
 * @param {string} uid 
 * @param {Object} data 
 * @param {string} collectionName - "players" or "owners"
 * @returns {Promise<void>}
 */
export const updateUserProfile = async (uid, data, collectionName = "players") => {
  try {
    const profileRef = doc(db, collectionName, uid);
    await setDoc(profileRef, {
      ...data,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.error(`Error updating profile in ${collectionName}:`, error);
    throw error;
  }
};
