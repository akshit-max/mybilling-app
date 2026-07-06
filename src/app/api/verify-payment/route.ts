import { NextResponse } from "next/server";
import crypto from "crypto";
import { adminDb } from "@/lib/firebaseAdmin";

export async function POST(req: Request) {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature
    } = await req.json();

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
      // Look up the transaction intent created by the server
      const transactionRef = adminDb.collection('transactions').doc(razorpay_order_id);
      const transactionDoc = await transactionRef.get();

      if (!transactionDoc.exists) {
        return NextResponse.json({ verified: false, message: "Order not found." }, { status: 404 });
      }

      const transactionData = transactionDoc.data();
      
      // Idempotency Check
      if (transactionData?.status === "SUCCESS") {
        return NextResponse.json({ verified: true, message: "Payment already processed." });
      }

      const { uid, plan, cycle, formData } = transactionData as any;

      if (uid) {
        // Atomic update of user plan and transaction status
        const batch = adminDb.batch();

        const userRef = adminDb.collection('users').doc(uid);
        batch.set(userRef, {
          businessName: formData?.businessName || "",
          state: formData?.state || "",
          pincode: formData?.pincode || "",
          gstNumber: formData?.hasGst ? (formData?.gstNumber || "") : "",
          streetAddress: formData?.streetAddress || "",
          city: formData?.city || "",
          plan: plan || "Diamond",
          subscriptionCycle: cycle || "Monthly",
          isPaid: true,
          subscriptionStartDate: new Date().toISOString()
        }, { merge: true });

        batch.update(transactionRef, {
          status: "SUCCESS",
          paymentId: razorpay_payment_id,
          verifiedAt: new Date().toISOString()
        });

        await batch.commit();
      }

      return NextResponse.json({ verified: true, message: "Payment successfully verified and subscription activated." });
    } else {
      return NextResponse.json({ verified: false, message: "Invalid Signature." }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Verification Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
