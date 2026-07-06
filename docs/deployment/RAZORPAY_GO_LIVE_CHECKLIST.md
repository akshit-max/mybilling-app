# Cloud Ledger – Razorpay Go-Live Checklist

**Application:** Cloud Ledger  
**Firebase Project:** `billing-app-86a8e`  

Complete every item in order. Do not skip steps.

---

## Stage 1 — Environment Variables (Vercel)

Configure these variables in **Vercel → Project → Settings → Environment Variables**.  
Set scope to **Production** only unless noted.

### Firebase Admin (Required for server-side billing)

| Variable | Source | Required |
|---|---|---|
| `FIREBASE_PROJECT_ID` | Firebase Console → Project Settings → General → Project ID | ✅ Yes |
| `FIREBASE_CLIENT_EMAIL` | Firebase Console → Project Settings → Service Accounts → Generate new private key → `client_email` field in downloaded JSON | ✅ Yes |
| `FIREBASE_PRIVATE_KEY` | Same JSON file → `private_key` field (include the full value with `-----BEGIN PRIVATE KEY-----`) | ✅ Yes |

> **FIREBASE_PRIVATE_KEY Paste Instructions:**  
> In Vercel, paste the raw value from the JSON file exactly as it appears — multi-line, with actual newline characters. Vercel will preserve them correctly. Do NOT manually replace newlines with `\n`. The code in `firebaseAdmin.ts` already handles the `.replace(/\\n/g, '\n')` conversion.

### Razorpay (Test — already configured)

| Variable | Current Value | Status |
|---|---|---|
| `NEXT_PUBLIC_RAZORPAY_KEY` | `rzp_test_Sw5TSKrvf9FaMS` | ⏳ Replace with live key at Stage 4 |
| `RAZORPAY_SECRET` | `D8uqjWWkXY3j79hNlpE34nou` | ⏳ Replace with live secret at Stage 4 |

---

## Stage 2 — Deploy Firestore Rules

See full instructions in `docs/deployment/FIREBASE_DEPLOYMENT_GUIDE.md`.

Quick reference:

```cmd
firebase login
firebase use billing-app-86a8e
firebase deploy --only firestore:rules
```

**Verify:** Firebase Console → Firestore → Rules → confirm Published timestamp is today.

- [ ] Firestore rules deployed
- [ ] Firebase Console shows new rules active

---

## Stage 3 — End-to-End Test (Test Mode)

Perform all tests using the current **test Razorpay keys** before switching to live.

### 3.1 — Successful Payment Flow

1. Log in to Cloud Ledger.
2. Navigate to **Settings → Pricing**.
3. Click **Buy Diamond Plan** (Monthly).
4. Fill in billing details.
5. Click **Submit**.
6. In the Razorpay modal, use test card: `4111 1111 1111 1111`, expiry `12/26`, CVV `123`.
7. Complete payment.

**Expected results:**
- [ ] Toast: "Payment successful! Your plan has been upgraded."
- [ ] Redirected to `/dashboard/settings/pricing`
- [ ] Pricing page shows "You are currently on the Diamond Plan"
- [ ] Dashboard shows "Premium Subscription Active" banner
- [ ] Firebase Console → Firestore → `transactions` collection shows a document with `status: "SUCCESS"`
- [ ] Firebase Console → Firestore → `users/{uid}` shows `isPaid: true` and `plan: "Diamond"`

### 3.2 — Cancel Payment

1. Start a new payment flow.
2. Click **X** to close the Razorpay modal before paying.

**Expected results:**
- [ ] Modal closes cleanly
- [ ] "Submit" button becomes active again (not stuck in "Processing...")
- [ ] No changes to Firestore

### 3.3 — Firestore Rules Test (Critical)

1. Open browser DevTools Console (F12) while logged in.
2. Attempt to directly modify billing fields:

```javascript
// Run this in the browser console
const { updateDoc, doc, getFirestore } = await import('https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js');
```

Alternative simpler test: Open DevTools → Application → Firestore (if using the Firebase extension), or simply check that the "Revert to Free Plan" Dev button on the dashboard now shows a "Failed to revert" toast instead of succeeding.

**Expected result:**
- [ ] Write to `isPaid` is rejected with `permission-denied`

### 3.4 — Duplicate Verification Test

1. Complete a successful test payment and note the `order_id` from the Firestore `transactions` collection.
2. Open Postman or browser console and POST to `/api/verify-payment` again with the same `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature`.

**Expected result:**
- [ ] Response: `{ "verified": true, "message": "Payment already processed." }`
- [ ] Firestore user document NOT modified again

---

## Stage 4 — Switch to Live Razorpay Keys

Only proceed after Stage 3 is fully complete.

1. Log in to the **Razorpay Dashboard** ([https://dashboard.razorpay.com](https://dashboard.razorpay.com)).
2. Navigate to **Settings → API Keys**.
3. Switch mode to **Live**.
4. Copy the **Key ID** and **Key Secret**.

In **Vercel → Project → Settings → Environment Variables**, update:

| Variable | New Value |
|---|---|
| `NEXT_PUBLIC_RAZORPAY_KEY` | `rzp_live_<from Razorpay dashboard>` |
| `RAZORPAY_SECRET` | `<live secret from Razorpay dashboard>` |

5. Click **Save** in Vercel.
6. Trigger a new Vercel deployment (or redeploy the current commit) so the new env vars take effect.

- [ ] Live keys configured in Vercel
- [ ] Vercel redeployment triggered
- [ ] Verify deployment is live (check Vercel dashboard)

---

## Stage 5 — Live Smoke Test

Perform one real transaction using the **lowest-cost plan** (Diamond Monthly = ₹293 after GST).

1. Log in as a real test user (not your admin account).
2. Complete a payment using the live Razorpay modal.
3. Verify:
   - [ ] Payment appears in Razorpay Dashboard → Transactions
   - [ ] Firestore `transactions` collection has `status: "SUCCESS"`
   - [ ] Firestore `users/{uid}` has `isPaid: true`
   - [ ] Cloud Ledger dashboard shows Premium banner

---

## Stage 6 — Git Tag for Rollback Point

Before going live, create a tagged release:

```cmd
git add .
git commit -m "chore: Razorpay production integration — server-side billing, Firestore rules, Firebase Admin"
git tag -a v1.0-razorpay-live -m "Production Razorpay integration complete"
git push origin main --tags
```

- [ ] Git commit created
- [ ] Git tag pushed

---

## Firebase Admin Credentials — Generation Guide

1. Open [Firebase Console](https://console.firebase.google.com)
2. Select project **billing-app-86a8e**
3. Click the gear icon → **Project Settings**
4. Click the **Service Accounts** tab
5. Click **Generate new private key**
6. Download the JSON file
7. Open the JSON file — copy these fields:

```json
{
  "project_id": "→ FIREBASE_PROJECT_ID",
  "client_email": "→ FIREBASE_CLIENT_EMAIL",
  "private_key": "→ FIREBASE_PRIVATE_KEY"
}
```

8. After copying the values, **delete the JSON file** from your computer.
9. Do NOT commit the JSON file to Git.

---

## Summary

| Stage | Task | Who | Status |
|---|---|---|---|
| 1 | Configure Firebase Admin env vars on Vercel | You | ⏳ |
| 2 | Deploy Firestore rules | You | ⏳ |
| 3 | End-to-end test in test mode | You | ⏳ |
| 4 | Switch to live Razorpay keys | You | ⏳ |
| 5 | Live smoke test | You | ⏳ |
| 6 | Git tag for rollback | You | ⏳ |
