import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from "fs";
import path from "path";

// Read .env.local manually
const envPath = path.resolve(process.cwd(), "../.env.local");
const envFile = fs.readFileSync(envPath, "utf-8");
const envVars = {};
envFile.split("\n").forEach(line => {
  if (line && line.includes("=") && !line.startsWith("#")) {
    const [key, ...rest] = line.split("=");
    envVars[key.trim()] = rest.join("=").trim();
  }
});

const firebaseConfig = {
  apiKey: envVars["NEXT_PUBLIC_FIREBASE_API_KEY"],
  authDomain: envVars["NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"],
  projectId: envVars["NEXT_PUBLIC_FIREBASE_PROJECT_ID"],
  storageBucket: envVars["NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"],
  messagingSenderId: envVars["NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"],
  appId: envVars["NEXT_PUBLIC_FIREBASE_APP_ID"],
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function main() {
  try {
    const sSnap = await getDocs(collection(db, "staffProfiles"));
    const profiles = sSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const tSnap = await getDocs(collection(db, "staffTransactions"));
    const txns = tSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const aSnap = await getDocs(collection(db, "attendanceRecords"));
    const attendance = aSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    console.log("=== PRE-JUNE 2026 RECORDS ===");
    let found = false;
    profiles.forEach(p => {
      const staffAtt = attendance.filter(a => a.staffId === p.id && a.date < '2026-06-01');
      const staffTx = txns.filter(t => t.staffId === p.id && t.date < '2026-06-01');
      
      if (staffAtt.length > 0 || staffTx.length > 0) {
        found = true;
        console.log(`\nStaff: ${p.name} (${p.id})`);
        
        let earn = 0;
        let wage = p.salaryType === 'Monthly' ? p.salaryAmount/30 : (p.salaryType === 'Per Day' ? p.salaryAmount : p.salaryAmount*8);

        console.log("  Raw Attendance (< June 1):");
        staffAtt.forEach(a => {
           console.log(`    Date: ${a.date}, Status: ${a.status}`);
           if (a.status === 'P' || a.status === 'PL' || a.status === 'WO') earn += wage;
           if (a.status === 'HD') earn += (wage/2);
        });
        
        let pay = 0;
        let col = 0;
        console.log("  Raw Transactions (< June 1):");
        staffTx.forEach(t => {
           console.log(`    Date: ${t.date}, Type: ${t.paymentType}, Amount: ${t.amount}`);
           if (t.paymentType === 'Collection') col += t.amount;
           else pay += t.amount;
        });

        console.log(`\n  Computed Previous Earnings: ₹${earn}`);
        console.log(`  Computed Previous Payments: ₹${pay}`);
        console.log(`  Computed Previous Collections: ₹${col}`);
        console.log(`  Expected Previous Balance: ₹${earn - pay + col}`);
      }
    });
    
    if (!found) {
       console.log("NO prior month records found for ANY employee!");
    }

    console.log("\nDone.");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
