// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBvoR7KSDMV7QQWJ1Ik5JgYTReWV2OXF_4",
  authDomain: "billing-app-86a8e.firebaseapp.com",
  projectId: "billing-app-86a8e",
  storageBucket: "billing-app-86a8e.firebasestorage.app",
  messagingSenderId: "966455162264",
  appId: "1:966455162264:web:8c6bc4476864eee4d2e7ed"
};

// // Initialize Firebase
// export const app = initializeApp(firebaseConfig);
// initialize app
export const app = initializeApp(firebaseConfig);

// ✅ THIS is what you were missing or wrong
export const auth = getAuth(app);
export const db = getFirestore(app);