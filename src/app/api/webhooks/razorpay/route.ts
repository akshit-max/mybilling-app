import { NextResponse } from "next/server";
import crypto from "crypto";
import { adminDb } from "@/lib/firebaseAdmin";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "";
    if (!webhookSecret) {
      console.error("Missing RAZORPAY_WEBHOOK_SECRET");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    if (expectedSignature !== signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(rawBody);

    // We only care about payment.captured events
    if (event.event !== "payment.captured") {
      return NextResponse.json({ status: "ignored" }, { status: 200 });
    }

    const payment = event.payload.payment.entity;
    const orderId = payment.order_id;

    if (!orderId) {
      return NextResponse.json({ error: "Missing order_id" }, { status: 400 });
    }

    const transactionRef = adminDb.collection("transactions").doc(orderId);

    const result = await adminDb.runTransaction(async (t) => {
      const transactionDoc = await t.get(transactionRef);

      if (!transactionDoc.exists) {
        return { error: true, status: 404, payload: { error: "Order not found" } };
      }

      const transactionData = transactionDoc.data();

      // Idempotency Check: if already success (likely via frontend callback), exit early and return 200
      if (transactionData?.status === "SUCCESS") {
        return { error: true, status: 200, payload: { status: "already_processed" } };
      }

      const { uid, plan, cycle, formData } = transactionData as any;

      if (!uid) {
        console.error("Webhook transaction doc missing uid", orderId);
        return { error: true, status: 500, payload: { error: "Incomplete transaction record" } };
      }

      const userRef = adminDb.collection("users").doc(uid);

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
        paymentId: payment.id,
        verifiedAt: new Date().toISOString(),
        webhookProcessed: true
      });

      return { error: false };
    });

    if (result.error) {
      return NextResponse.json(result.payload, { status: result.status });
    }

    return NextResponse.json({ status: "success" }, { status: 200 });
  } catch (error: any) {
    console.error("Webhook Error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
