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

      const result = await adminDb.runTransaction(async (t) => {
        const transactionDoc = await t.get(transactionRef);

        if (!transactionDoc.exists) {
          return { error: true, status: 404, payload: { verified: false, message: "Order not found." } };
        }

        const transactionData = transactionDoc.data();
        
        // Idempotency Check
        if (transactionData?.status === "SUCCESS") {
          return { error: true, status: 200, payload: { verified: true, message: "Payment already processed." } };
        }

        const { uid, plan, cycle, formData } = transactionData as any;

        if (!uid) {
          console.error("Transaction doc missing uid — cannot activate subscription.", razorpay_order_id);
          return { error: true, status: 500, payload: { verified: false, message: "Transaction record is incomplete. Contact support." } };
        }

        const userRef = adminDb.collection('users').doc(uid);
        
        t.set(userRef, {
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

        t.update(transactionRef, {
          status: "SUCCESS",
          paymentId: razorpay_payment_id,
          verifiedAt: new Date().toISOString()
        });

        return { error: false };
      });

      if (result.error) {
        return NextResponse.json(result.payload, { status: result.status });
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
