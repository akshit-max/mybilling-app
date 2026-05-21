// script to fetch and log some invoices from firebase
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, limit, query } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "dummy",
  projectId: "billing-app-43", // Let me find the real projectId. Actually, I shouldn't run this against prod Firebase if I don't have the config.
};
