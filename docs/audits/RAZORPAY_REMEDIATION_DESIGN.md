# Razorpay Remediation Design Document

**Status:** Proposed Architecture (Pre-Implementation)  
**Objective:** Redesign the payment and subscription fulfillment flow to meet enterprise SaaS financial security standards.

This document outlines the exact architectural changes required to securely process live customer payments via Razorpay. Implementation remains frozen until this design is approved.

---

## 1. Core Principles
1. **Backend Authority:** The backend is the sole authority for activating subscriptions. The frontend will never be trusted to write billing state.
2. **Order Ownership:** Orders will be strictly bound to the authenticated user who requested them.
3. **Idempotency:** A payment or order cannot be processed twice.
4. **Audit Trail:** Every payment intent, success, failure, and webhook event will be logged immutably.
5. **Webhook Ultimate Truth:** Razorpay webhooks (`payment.captured`) will serve as the final fulfillment mechanism to protect against browser abandonment or network drops.

---

## 2. Redesigned Payment Architecture Flow

### Step 1: Secure Order Creation (Frontend -> Backend -> Razorpay)
1. **Frontend (`checkout/page.tsx`):**
   - User selects a plan and clicks "Make Payment".
   - Sends a `POST` to `/api/create-razorpay-order` **including an Authentication Token** (Firebase ID Token).
2. **Backend (`/api/create-razorpay-order`):**
   - *Authentication Middleware:* Verifies the Firebase ID Token using Firebase Admin SDK. Extracts `userId`.
   - Computes pricing and GST securely.
   - Creates the Razorpay order via API.
   - *Database Update (NEW):* Creates an initial `Transaction` document in Firestore (status: `PENDING`) binding the `razorpay_order_id` to the authenticated `userId`.
   - Returns the `order_id` to the frontend.

### Step 2: Client-Side Payment (Frontend -> Razorpay)
1. **Frontend:** Initializes Razorpay SDK with the `order_id`. User completes the payment.
2. **Frontend Callback:** Receives `razorpay_payment_id`, `razorpay_order_id`, and `razorpay_signature`.
3. **Frontend:** Sends these to `/api/verify-payment` along with the Firebase ID Token.

### Step 3: Secure Verification & Activation (Frontend -> Backend -> DB)
1. **Backend (`/api/verify-payment`):**
   - *Authentication Middleware:* Verifies the Firebase ID Token.
   - *Cryptographic Check:* Generates HMAC SHA-256 and matches it against `razorpay_signature`.
   - *Order Ownership & Idempotency Check (NEW):* Queries the `Transaction` document matching `razorpay_order_id`. 
     - Confirms it belongs to the authenticated `userId`.
     - Confirms the transaction status is NOT already `SUCCESS`.
   - *Database Update (NEW):* Uses Firebase Admin SDK to execute a batched write:
     1. Updates the `Transaction` document status to `SUCCESS` and stores the `razorpay_payment_id`.
     2. Updates the `users` document (`isPaid: true`, `plan`, `subscriptionCycle`).
   - Responds to frontend with `{ verified: true }`.

### Step 4: Webhook Fulfillment (Razorpay -> Backend -> DB)
*To handle edge cases where the user closes the browser before Step 3 completes.*
1. **Razorpay:** Fires `payment.captured` webhook.
2. **Backend (`/api/webhooks/razorpay`):**
   - *Signature Check:* Verifies the `X-Razorpay-Signature` header.
   - Extracts `razorpay_order_id` from the payload.
   - *Idempotency Check:* Queries the `Transaction` document. If status is already `SUCCESS` (from Step 3), acknowledges and exits.
   - If status is `PENDING`, updates the `Transaction` and activates the subscription in the `users` document using Firebase Admin.

---

## 3. Database Schema Changes

### New Collection: `transactions`
Every payment attempt must be logged here.

```typescript
type Transaction = {
  id: string; // Auto-generated ID
  userId: string; // Owner of the transaction
  orderId: string; // razorpay_order_id
  paymentId: string | null; // razorpay_payment_id (populated on success)
  plan: string;
  cycle: string;
  amount: number; // In INR
  gst: number;
  status: "PENDING" | "SUCCESS" | "FAILED";
  source: "frontend_verify" | "webhook" | null; // Who verified it
  createdAt: Timestamp;
  verifiedAt: Timestamp | null;
}
```

---

## 4. Required Security Enhancements

### 4.1 Firebase Admin SDK Integration
Since `setDoc` will be removed from the frontend, the Next.js API routes require the `firebase-admin` SDK. This necessitates generating a Service Account Key from the Firebase Console and securely adding it to the environment variables (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`).

### 4.2 API Authentication
Currently, the API routes are completely open. 
The frontend must be updated to pass the token:
```javascript
const token = await auth.currentUser.getIdToken();
// Passed in headers: Authorization: `Bearer ${token}`
```
The backend will use `admin.auth().verifyIdToken(token)` before proceeding.

### 4.3 Firestore Security Rules
*Currently cannot be verified from source code.*
Must explicitly prevent clients from mutating billing fields.
```javascript
match /users/{userId} {
  allow update: if request.auth.uid == userId 
                && !request.resource.data.keys().hasAny(['isPaid', 'plan', 'subscriptionCycle', 'subscriptionStartDate']);
}
```

---

## 5. Implementation Phasing

**Phase 1: Environment & Setup**
- Install `firebase-admin`.
- Configure Service Account environment variables.

**Phase 2: Database & Backend**
- Create the `transactions` schema logic.
- Rewrite `/api/create-razorpay-order` to authenticate and log `PENDING` transactions.
- Rewrite `/api/verify-payment` to authenticate, check idempotency, and update the database server-side.

**Phase 3: Frontend Cleanup**
- Remove all `setDoc` subscription logic from `checkout/page.tsx`.
- Add `Authorization` headers to API fetch calls.

**Phase 4: Webhooks**
- Build `/api/webhooks/razorpay` to handle `payment.captured`.
- Set up local testing via Ngrok or Razorpay CLI to verify webhook delivery.

**Phase 5: Security Rules Verification**
- Deploy and verify Firestore Rules block client-side billing updates.

---
*Implementation remains frozen pending approval of this architecture.*
