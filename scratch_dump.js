const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  try {
    const usersSnap = await getDocs(collection(db, 'users'));
    console.log("--- USERS ---");
    usersSnap.forEach(doc => {
      console.log(`[User] Doc ID: ${doc.id}`);
      const data = doc.data();
      console.log(`  uid: ${data.uid}`);
      console.log(`  businessName: ${data.businessName}`);
      console.log(`  email: ${data.email || 'NOT_FOUND_IN_FIRESTORE'}`);
      console.log(`  plan: ${data.plan}`);
      console.log(`  isPaid: ${data.isPaid}`);
    });

    const subusersSnap = await getDocs(collection(db, 'subusers'));
    console.log("\n--- SUBUSERS ---");
    subusersSnap.forEach(doc => {
      console.log(`[Subuser] Doc ID: ${doc.id}`);
      const data = doc.data();
      console.log(`  adminId: ${data.adminId}`);
      console.log(`  role: ${data.role}`);
      console.log(`  username: ${data.username || data.name || 'NOT_FOUND'}`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
