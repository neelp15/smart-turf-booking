import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAXAB_h4bTNdogq3nfgg41DPy95CwICbMg",
  authDomain: "smart-turf-booking-e448d.firebaseapp.com",
  projectId: "smart-turf-booking-e448d",
  storageBucket: "smart-turf-booking-e448d.firebasestorage.app",
  messagingSenderId: "1048136523655",
  appId: "1:1048136523655:web:cd6ea48d964f1af7f5bd22",
  measurementId: "G-N58QQWB6L8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

let analytics = null;
try {
  analytics = getAnalytics(app);
} catch (e) {
  // Analytics failed to initialize (likely in a restrictive environment)
}

export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

export { analytics };
export default app;