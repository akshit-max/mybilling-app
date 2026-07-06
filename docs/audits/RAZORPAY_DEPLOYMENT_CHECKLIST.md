# Cloud Ledger – Razorpay Live Deployment Checklist

**Status:** Code Complete. Deployment Pending.  
**Date:** 2026-07-07  

All code-level blockers have been resolved. The remaining steps are purely deployment and configuration.

---

## Step 1 — Firebase Admin Credentials (Production Host)

Add these 3 environment variables to your **Vercel Project Settings → Environment Variables**.  
⚠️ Do NOT add to `.env.local`. These belong only in the production host.

| Variable | Where to get it |
|---|---|
| `FIREBASE_PROJECT_ID` | Firebase Console → Project Settings → General → Project ID |
| `FIREBASE_CLIENT_EMAIL` | Firebase Console → Project Settings → Service Accounts → Generate new private key |
| `FIREBASE_PRIVATE_KEY` | Same JSON file — the `private_key` field |

> **Important:** When pasting `FIREBASE_PRIVATE_KEY` into Vercel, the value must be the full multi-line string including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`. Vercel handles the newlines correctly if you paste the raw value. Do not manually escape `\n`.

---

## Step 2 — Deploy Firestore Security Rules

The `firestore.rules` file is now in the repository root but **has no effect until deployed**.

```bash
# One-time: install Firebase CLI if not already installed
npm install -g firebase-tools

# Authenticate
firebase login

# Deploy rules only (safe — does not touch hosting or functions)
firebase deploy --only firestore:rules --project billing-app-86a8e
```

**Verify after deploy:**  
Open Firebase Console → Firestore → Rules → confirm the new rules are live.

---

## Step 3 — End-to-End Test (Test Mode)

Before swapping to live keys, run this checklist using the current test credentials:

| Test | Expected Result |
|---|---|
| ✅ Successful payment | Toast "Payment successful!", plan updated in Firestore, dashboard reflects paid status |
| ✅ Cancel payment (close modal) | `isSubmitting` resets, no Firestore changes |
| ✅ Failed payment | No Firestore changes, appropriate error shown |
| ✅ Duplicate verify (call `/api/verify-payment` twice with same `order_id`) | Second call returns "Payment already processed." — no double update |
| ✅ Browser console test | Run `updateDoc(doc(db, "users", uid), { isPaid: false })` directly — should fail with Firestore **permission-denied** error |
| ✅ Dashboard sync | After payment, navigate to dashboard — subscription banner and plan badge update in real-time without refresh |
| ✅ Pricing page sync | Navigate to `/dashboard/settings/pricing` — active plan is shown correctly |

---

## Step 4 — Replace with Live Razorpay Keys

Only after all Step 3 tests pass:

In Vercel (or your production host), update:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_RAZORPAY_KEY` | `rzp_live_<client key>` |
| `RAZORPAY_SECRET` | `<client live secret>` |

Redeploy the application after updating environment variables.

---

## Step 5 — Create a Tagged Release

Before going live, create a Git tag so you have an instant rollback point:

```bash
git add .
git commit -m "feat: Razorpay production-safe integration with server-side billing authority"
git tag -a v1.0-razorpay-live -m "Production Razorpay integration complete"
git push origin --tags
```

---

## Summary of What Was Secured

| Item | Status |
|---|---|
| Backend owns billing state | ✅ Done |
| Frontend stripped of billing writes | ✅ Done |
| HMAC SHA-256 signature verification | ✅ Done |
| uid derived from verified Firebase ID Token | ✅ Done |
| Atomic Firestore batch writes | ✅ Done |
| Idempotency (duplicate order protection) | ✅ Done |
| Firestore rules block client billing writes | ✅ Created — needs deploy |
| Firebase Admin credentials | ⏳ Configure on production host |
| Live Razorpay keys | ⏳ After testing passes |
