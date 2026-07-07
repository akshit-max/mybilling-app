import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { DEFAULT_PRICING } from "@/lib/pricing";

export async function POST(req: Request) {
  try {
    const { plan, cycle, promo, formData } = await req.json();

    // Derive uid from server-verified Firebase ID Token — never trust client payload
    const authHeader = req.headers.get("Authorization");
    const idToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!idToken) {
      return NextResponse.json({ error: "Unauthorized: Missing token" }, { status: 401 });
    }

    let uid: string;
    try {
      const decoded = await getAuth(getApps()[0]).verifyIdToken(idToken);
      uid = decoded.uid;
    } catch {
      return NextResponse.json({ error: "Unauthorized: Invalid token" }, { status: 401 });
    }

    // Backend enforcement: reject if user already owns this exact plan and cycle
    const userDoc = await adminDb.collection("users").doc(uid).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      if (
        userData?.isPaid === true &&
        userData?.plan === plan &&
        userData?.subscriptionCycle === cycle
      ) {
        return NextResponse.json(
          { error: "You are already subscribed to this plan." },
          { status: 409 }
        );
      }
    }

    // Fetch pricing config from Firestore, fallback to defaults
    const pricingDoc = await adminDb.collection("platformSettings").doc("subscriptionPricing").get();
    let pricingData = DEFAULT_PRICING;
    if (pricingDoc.exists) {
      pricingData = pricingDoc.data() as typeof DEFAULT_PRICING;
    }

    // Validate plan
    if (!pricingData[plan as keyof typeof pricingData]) {
      return NextResponse.json({ error: "Invalid plan selected." }, { status: 400 });
    }

    const planConfig = pricingData[plan as keyof typeof pricingData];
    if (planConfig.enabled === false) {
      return NextResponse.json({ error: "This plan is currently disabled." }, { status: 400 });
    }

    if (cycle !== "Monthly" && cycle !== "Yearly") {
      return NextResponse.json({ error: "Invalid billing cycle selected." }, { status: 400 });
    }
    const billingCycle = cycle as "Monthly" | "Yearly";
    const originalPrice = planConfig[billingCycle];
    if (typeof originalPrice !== "number") {
      return NextResponse.json({ error: "Invalid billing cycle selected." }, { status: 400 });
    }

    // ── PRICING TRACE ── uncomment to debug pricing issues
    // console.log("[create-razorpay-order] PRICING TRACE", {
    //   plan,
    //   cycle,
    //   firestoreDocExists: pricingDoc.exists,
    //   firestorePricingData: JSON.stringify(pricingData),
    //   resolvedOriginalPrice: originalPrice,
    // });

    let totalPrice = 0;
    if (promo === "31DAYS2") {
      totalPrice = 2;
    } else {
      const gstAmount = Math.round(originalPrice * 0.18);
      totalPrice = originalPrice + gstAmount;
    }
    // ── AMOUNT TRACE ── uncomment to debug pricing issues
    // console.log("[create-razorpay-order] AMOUNT TRACE", {
    //   originalPrice,
    //   gstAmount: promo === "31DAYS2" ? 0 : Math.round(originalPrice * 0.18),
    //   totalPrice,
    //   amountInPaise: totalPrice * 100,
    // });
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
