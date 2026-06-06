import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

export async function GET() {
  try {
    await setDoc(doc(db, "platformSettings", "security"), { superAdminUid: null }, { merge: true });
    return NextResponse.json({ success: true, message: "Reset complete!" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}
