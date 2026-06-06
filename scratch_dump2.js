const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, getDoc } = require('firebase/firestore');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
  }
});

const firebaseConfig = {
  apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  try {
    const usersSnap = await getDocs(collection(db, 'users'));
    console.log("--- USERS ---");
    const uids = [];
    usersSnap.forEach(doc => {
      console.log(`[User] Doc ID: ${doc.id}`);
      const data = doc.data();
      console.log(`  uid: ${data.uid || 'NO_UID_FIELD'}`);
      console.log(`  businessName: ${data.businessName || 'NONE'}`);
      console.log(`  email: ${data.email || 'NO_EMAIL_IN_FIRESTORE'}`);
      console.log(`  plan: ${data.plan || 'NONE'}`);
      console.log(`  isPaid: ${data.isPaid || 'false'}`);
      uids.push(doc.id);
    });

    const subusersSnap = await getDocs(collection(db, 'subusers'));
    console.log("\n--- SUBUSERS ---");
    subusersSnap.forEach(doc => {
      console.log(`[Subuser] Doc ID: ${doc.id}`);
      const data = doc.data();
      console.log(`  adminId: ${data.adminId || 'NONE'}`);
      console.log(`  role: ${data.role || 'NONE'}`);
      console.log(`  username: ${data.username || data.name || 'NONE'}`);
    });
    
    console.log("\n--- SETTINGS ---");
    for (const id of uids) {
      const s = await getDoc(doc(db, 'settings', id));
      if (s.exists()) {
        const d = s.data();
        console.log(`[Settings] Doc ID: ${s.id}`);
        console.log(`  email: ${d.email || 'NO_EMAIL_IN_SETTINGS'}`);
      }
    }
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
