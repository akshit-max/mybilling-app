import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { phone, message, customerName } = await req.json();

    if (!phone || !message) {
      return NextResponse.json(
        { error: "Phone number and message are required" },
        { status: 400 }
      );
    }

    // ────────────────────────────────────────────────────────
    // TODO: REPLACE WITH ACTUAL SMS GATEWAY LOGIC
    // Examples: Fast2SMS, Twilio, MSG91, Textlocal
    // ────────────────────────────────────────────────────────
    
    // const FAST2SMS_API_KEY = process.env.FAST2SMS_API_KEY;
    // const response = await fetch("https://www.fast2sms.com/dev/bulkV2", {
    //   method: "POST",
    //   headers: {
    //     "authorization": FAST2SMS_API_KEY,
    //     "Content-Type": "application/json"
    //   },
    //   body: JSON.stringify({
    //     route: "v3",
    //     sender_id: "TXTIND",
    //     message: message,
    //     language: "english",
    //     flash: 0,
    //     numbers: phone,
    //   })
    // });
    // const data = await response.json();
    // if (!data.return) throw new Error(data.message);

    // Mock successful response for now since no API key is provided
    console.log(`[SMS MOCK] Sending to ${phone}: ${message}`);

    return NextResponse.json({
      success: true,
      message: "SMS dispatched successfully",
    });
  } catch (error: any) {
    console.error("SMS sending error:", error);
    return NextResponse.json(
      { error: "Failed to send SMS" },
      { status: 500 }
    );
  }
}
