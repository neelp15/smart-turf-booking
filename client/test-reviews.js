import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from "fs";

const firebaseConfig = {
  apiKey: "AIzaSyAXAB_h4bTNdogq3nfgg41DPy95CwICbMg",
  authDomain: "smart-turf-booking-e448d.firebaseapp.com",
  projectId: "smart-turf-booking-e448d",
  storageBucket: "smart-turf-booking-e448d.firebasestorage.app",
  messagingSenderId: "1048136523655",
  appId: "1:1048136523655:web:cd6ea48d964f1af7f5bd22"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function test() {
  console.log("Fetching turfs...");
  const snapshot = await getDocs(collection(db, "turfs"));
  const turfs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log("Total turfs:", turfs.length);
  fs.writeFileSync("turfs.json", JSON.stringify(turfs, null, 2));
  process.exit(0);
}

test().catch(console.error);
