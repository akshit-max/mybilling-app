import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBvoR7KSDMV7QQWJ1Ik5JgYTReWV2OXF_4",
  authDomain: "billing-app-86a8e.firebaseapp.com",
  projectId: "billing-app-86a8e",
  storageBucket: "billing-app-86a8e.firebasestorage.app",
  messagingSenderId: "966455162264",
  appId: "1:966455162264:web:8c6bc4476864eee4d2e7ed"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  console.log("Attempting to reset Platform Admin configuration in Firestore...");
  try {
    await setDoc(doc(db, "platformSettings", "security"), { superAdminUid: null }, { merge: true });
    console.log("SUCCESS! The database has been reset.");
  } catch (err) {
    console.error("FAILED to reset database. Check permissions.", err);
  }
  process.exit(0);
}

run();
