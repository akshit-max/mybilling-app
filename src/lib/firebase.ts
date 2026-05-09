// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import {
  initializeFirestore,
  persistentLocalCache,
} from "firebase/firestore";



const firebaseConfig = {
  apiKey:
    process.env
      .NEXT_PUBLIC_FIREBASE_API_KEY,

  authDomain:
    process.env
      .NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,

  projectId:
    process.env
      .NEXT_PUBLIC_FIREBASE_PROJECT_ID,

  storageBucket:
    process.env
      .NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,

  messagingSenderId:
    process.env
      .NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,

  appId:
    process.env
      .NEXT_PUBLIC_FIREBASE_APP_ID,
};
// // Initialize Firebase
// export const app = initializeApp(firebaseConfig);
// initialize app
export const app = initializeApp(firebaseConfig);

// ✅ THIS is what you were missing or wrong
export const auth = getAuth(app);
// export const db = getFirestore(app);
export const db =
  initializeFirestore(app, {
    localCache:
      persistentLocalCache(),
  });