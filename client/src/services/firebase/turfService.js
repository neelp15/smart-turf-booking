import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  doc, 
  updateDoc, 
  deleteDoc, 
  getDoc,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  onSnapshot,
  runTransaction
} from "firebase/firestore";
import { db } from "../../lib/firebase";

/**
 * Adds a new turf listing to Firestore.
 * @param {Object} turfData 
 * @returns {Promise<string>} - The ID of the newly created turf document.
 */
export const addTurf = async (turfData) => {
  try {
    const docRef = await addDoc(collection(db, "turfs"), {
      ...turfData,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding turf:", error);
    throw error;
  }
};

/**
 * Fetches turfs belonging to a specific owner.
 * @param {string} ownerUid 
 * @returns {Promise<Array>}
 */
export const getOwnerTurfs = async (ownerUid) => {
  try {
    const q = query(collection(db, "turfs"), where("ownerUid", "==", ownerUid));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error fetching owner turfs:", error);
    throw error;
  }
};

/**
 * Fetches a single turf by ID.
 * @param {string} turfId 
 * @returns {Promise<Object|null>}
 */
export const getTurfById = async (turfId) => {
  try {
    const docRef = doc(db, "turfs", turfId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (error) {
    console.error("Error fetching turf by ID:", error);
    throw error;
  }
};

/**
 * Updates an existing turf listing.
 * @param {string} turfId 
 * @param {Object} updateData 
 * @returns {Promise<void>}
 */
export const updateTurf = async (turfId, updateData) => {
  try {
    const docRef = doc(db, "turfs", turfId);
    await updateDoc(docRef, {
      ...updateData,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating turf:", error);
    throw error;
  }
};

/**
 * Toggles a turf as a favorite for a user.
 * @param {string} userId 
 * @param {string} turfId 
 * @param {boolean} isFavorite - true if currently favorite, false otherwise.
 * @returns {Promise<void>}
 */
export const toggleFavorite = async (userId, turfId, isFavorite) => {
  try {
    const userRef = doc(db, "players", userId);
    // Use setDoc with merge: true to avoid "No document to update" error if the user profile doesn't exist yet
    if (isFavorite) {
      // If it's currently a favorite, remove it
      await setDoc(userRef, {
        favorites: arrayRemove(turfId)
      }, { merge: true });
    } else {
      // If it's not a favorite, add it
      await setDoc(userRef, {
        favorites: arrayUnion(turfId)
      }, { merge: true });
    }
  } catch (error) {
    console.error("Error toggling favorite:", error);
    throw error;
  }
};

/**
 * Fetches all favorite turfs for a given user.
 * @param {string} userId 
 * @returns {Promise<Array>} - An array of favorite turf objects.
 */
export const getUserFavorites = async (userId) => {
  try {
    const userDoc = await getDoc(doc(db, "players", userId));
    const userData = userDoc.data();
    if (!userData) {
      console.warn("User profile not found in players collection for favorites.");
      return [];
    }
    const favoriteIds = userData.favorites || [];

    if (favoriteIds.length === 0) {
      return [];
    }

    // Fetch turf details for each favorite ID
    const q = query(collection(db, "turfs"), where("__name__", "in", favoriteIds));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error fetching user favorites:", error);
    throw error;
  }
};

/**
 * Creates a new booking with atomic slot validation using a transaction.
 * Prevents double-booking by checking a 'reserved_slots' collection.
 * @param {Object} bookingData 
 * @returns {Promise<Object>}
 */
export const checkAndCreateBooking = async (bookingData) => {
  const { turfId, date, slots } = bookingData;
  
  try {
    const result = await runTransaction(db, async (transaction) => {
      // 1. Check all requested slots
      for (const slot of slots) {
        // Create a unique id for the slot to prevent duplicates
        const slotId = `${turfId}_${date}_${slot.replace(/[:\s]/g, '')}`.toLowerCase();
        const slotRef = doc(db, "reserved_slots", slotId);
        const slotSnap = await transaction.get(slotRef);
        
        if (slotSnap.exists()) {
          throw new Error("SLOT_TAKEN");
        }
      }

      // 2. Clear to proceed. Reserve slots and create booking.
      const bookingRef = doc(collection(db, "bookings"));
      
      // Mark slots as taken
      for (const slot of slots) {
        const slotId = `${turfId}_${date}_${slot.replace(/[:\s]/g, '')}`.toLowerCase();
        const slotRef = doc(db, "reserved_slots", slotId);
        transaction.set(slotRef, { 
          bookingId: bookingRef.id, 
          turfId, 
          date, 
          slot 
        });
      }

      // Finalize booking
      const finalBookingData = {
        ...bookingData,
        status: "confirmed",
        createdAt: new Date().toISOString() // Use ISO string as serverTimestamp isn't always reliable in complex transactions
      };
      
      transaction.set(bookingRef, finalBookingData);
      return { id: bookingRef.id, ...finalBookingData };
    });

    return result;
  } catch (error) {
    console.error("Transaction failed: ", error);
    if (error.code === 'permission-denied') {
      console.error("PERMISSION DENIED: You must add the target collection 'reserved_slots' to your Firestore Rules. See firestore.rules file for code.");
    }
    throw error;
  }
};

/**
 * Creates a new booking in Firestore (Deprecated: Use checkAndCreateBooking for safety).
 * @param {Object} bookingData 
 * @returns {Promise<Object>}
 */
export const createBooking = async (bookingData) => {
  return checkAndCreateBooking(bookingData);
};

/**
 * Fetches all bookings for a user.
 * @param {string} userId 
 * @returns {Promise<Array>}
 */
export const getUserBookings = async (userId) => {
  if (!userId) {
    console.warn("getUserBookings called without userId");
    return [];
  }
  
  try {
    const q = query(collection(db, "bookings"), where("userUid", "==", userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error fetching user bookings for userId", userId, ":", error);
    // If it's a permission error, it's 100% the Firestore rules in the console
    if (error.code === 'permission-denied') {
      console.error("PERMISSION DENIED: Please check your Firestore rules in the Firebase Console. Fields must match 'userUid'.");
    }
    throw error;
  }
};

/**
 * Fetches all bookings for a specific owner.
 * @param {string} ownerUid 
 * @returns {Promise<Array>}
 */
export const getOwnerBookings = async (ownerUid) => {
  if (!ownerUid) {
    console.warn("getOwnerBookings called without ownerUid");
    return [];
  }
  
  try {
    const q = query(collection(db, "bookings"), where("ownerUid", "==", ownerUid));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error fetching owner bookings:", error);
    throw error;
  }
};

/**
 * Subscribes to real-time updates for an owner's bookings.
 * @param {string} ownerUid 
 * @param {Function} callback 
 * @returns {Function} - Unsubscribe function.
 */
export const subscribeToOwnerBookings = (ownerUid, callback) => {
  if (!ownerUid) return () => {};
  
  const q = query(collection(db, "bookings"), where("ownerUid", "==", ownerUid));
  
  return onSnapshot(q, (snapshot) => {
    const bookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(bookings);
  }, (error) => {
    console.error("Error in bookings subscription:", error);
  });
};

/**
 * Updates the status of a booking.
 * @param {string} bookingId 
 * @param {string} status 
 * @returns {Promise<void>}
 */
export const updateBookingStatus = async (bookingId, status) => {
  try {
    const docRef = doc(db, "bookings", bookingId);
    await updateDoc(docRef, { status });
  } catch (error) {
    console.error("Error updating booking status:", error);
    throw error;
  }
};

/**
 * Updates the payment status of a booking.
 * @param {string} bookingId
 * @param {string} paymentStatus - 'paid' | 'pending'
 */
export const updateBookingPaymentStatus = async (bookingId, paymentStatus) => {
  try {
    const docRef = doc(db, "bookings", bookingId);
    await updateDoc(docRef, { paymentStatus });
  } catch (error) {
    console.error("Error updating payment status:", error);
    throw error;
  }
};

/**
 * Fetches all confirmed bookings for a specific turf on a specific date.
 * @param {string} turfId 
 * @param {string} date 
 * @returns {Promise<Array>}
 */
export const getTurfBookingsByDate = async (turfId, date) => {
  try {
    const q = query(
      collection(db, "bookings"), 
      where("turfId", "==", turfId),
      where("date", "==", date),
      where("status", "==", "confirmed")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error fetching turf bookings by date:", error);
    throw error;
  }
};

/**
 * Fetches all turfs for the explore page.
 * @returns {Promise<Array>}
 */
export const getAllTurfs = async () => {
  try {
    const q = query(collection(db, "turfs"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error fetching all turfs:", error);
    throw error;
  }
};

/**
 * Deletes a turf listing.
 * @param {string} turfId 
 * @returns {Promise<void>}
 */
export const deleteTurf = async (turfId) => {
  try {
    const docRef = doc(db, "turfs", turfId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error deleting turf:", error);
    throw error;
  }
};

/**
 * Submits a review for a turf.
 * @param {string} turfId 
 * @param {Object} reviewData - { userUid, userName, rating, comment, bookingId }
 * @returns {Promise<void>}
 */
export const submitReview = async (turfId, reviewData) => {
  try {
    // Write review document
    await addDoc(collection(db, "reviews"), {
      ...reviewData,
      turfId,
      createdAt: serverTimestamp(),
    });

    // Recalculate and update the turf's average rating
    const q = query(collection(db, "reviews"), where("turfId", "==", turfId));
    const snapshot = await getDocs(q);
    const allReviews = snapshot.docs.map(d => d.data());
    const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

    const turfRef = doc(db, "turfs", turfId);
    await updateDoc(turfRef, {
      rating: Math.round(avgRating * 10) / 10, // Round to 1 decimal
      reviews: allReviews.length,
    });
  } catch (error) {
    console.error("Error submitting review:", error);
    throw error;
  }
};

/**
 * Fetches all reviews for a turf.
 * @param {string} turfId
 * @returns {Promise<Array>}
 */
export const getTurfReviews = async (turfId) => {
  try {
    const q = query(
      collection(db, "reviews"),
      where("turfId", "==", turfId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error("Error fetching turf reviews:", error);
    throw error;
  }
};

/**
 * Checks if a user has already reviewed a specific turf.
 * @param {string} userId
 * @param {string} turfId
 * @returns {Promise<boolean>}
 */
export const hasUserReviewedTurf = async (userId, turfId) => {
  try {
    const q = query(
      collection(db, "reviews"),
      where("userUid", "==", userId),
      where("turfId", "==", turfId)
    );
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error("Error checking user review:", error);
    return false;
  }
};
