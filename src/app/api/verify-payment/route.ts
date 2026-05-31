import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();

    const key_secret = process.env.RAZORPAY_SECRET || "";

    if (!key_secret) {
        console.error("Razorpay secret is missing in environment variables.");
        return NextResponse.json({ verified: false, message: "Server configuration error: Missing Secret" }, { status: 500 });
    }

    const generated_signature = crypto
      .createHmac("sha256", key_secret)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (generated_signature === razorpay_signature) {
      // In a fully locked down system with Firebase Admin SDK, we would update the Firestore DB here.
      // E.g., await admin.firestore().collection('users').doc(userId).update({ plan, isPaid: true })
      
      return NextResponse.json({ verified: true, message: "Payment successfully verified." });
    } else {
      return NextResponse.json({ verified: false, message: "Invalid Signature." }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Verification Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
