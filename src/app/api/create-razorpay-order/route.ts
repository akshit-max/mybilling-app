import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export async function POST(req: Request) {
  try {
    const { plan, cycle, promo, uid, formData } = await req.json();

    if (!uid) {
      return NextResponse.json({ error: "User identity required" }, { status: 400 });
    }

    let originalPrice = 249;
    if (plan === "Diamond" && cycle === "Yearly") originalPrice = 2599;
    if (plan === "Platinum" && cycle === "Monthly") originalPrice = 299;
    if (plan === "Platinum" && cycle === "Yearly") originalPrice = 2999;
    if (plan === "Enterprise" && cycle === "Monthly") originalPrice = 750;
    if (plan === "Enterprise" && cycle === "Yearly") originalPrice = 4999;

    let totalPrice = 0;
    if (promo === "31DAYS2") {
      totalPrice = 2;
    } else {
      const gstAmount = Math.round(originalPrice * 0.18);
      totalPrice = originalPrice + gstAmount;
    }
    const amountInPaise = totalPrice * 100;

    const key_id = process.env.NEXT_PUBLIC_RAZORPAY_KEY || "";
    const key_secret = process.env.RAZORPAY_SECRET || "";

    if (!key_id || !key_secret) {
       console.error("Razorpay keys are missing in environment variables.");
       return NextResponse.json({ error: "Razorpay API keys are not configured in the server environment." }, { status: 500 });
    }

    const auth = Buffer.from(`${key_id}:${key_secret}`).toString("base64");

    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: "INR",
        receipt: `receipt_${Date.now()}`,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Razorpay Order Error:", data);
      return NextResponse.json({ error: "Failed to create Razorpay order" }, { status: 400 });
    }

    // Store transaction intent securely on server
    await adminDb.collection("transactions").doc(data.id).set({
      orderId: data.id,
      uid,
      plan: plan || "Diamond",
      cycle: cycle || "Monthly",
      amount: totalPrice,
      formData: formData || {},
      status: "PENDING",
      createdAt: new Date().toISOString()
    });

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
