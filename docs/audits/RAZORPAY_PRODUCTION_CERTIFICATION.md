# Cloud Ledger – Razorpay Production Certification Audit

**Document Type:** Final Production Readiness Certification  
**Date:** 2026-07-07  
**Audited By:** Forensic code review against live source files  
**Status:** Implementation Frozen During Audit  

> Every finding in this report is derived directly from the source code. Line numbers are cited for every conclusion. No assumptions are made. Where verification from source code was not possible, it is explicitly stated.

---

## Phase 1 – End-to-End Payment Flow

### Step-by-Step Lifecycle (Source Verified)

| Step | Description | File | Lines |
|---|---|---|---|
| 1 | User selects plan on Pricing Page | `pricing/page.tsx` | 39-41 |
| 2 | Router navigates to `/dashboard/settings/pricing/checkout?plan=X&cycle=Y` | `pricing/page.tsx` | 40 |
| 3 | Checkout page reads `plan`, `cycle`, `promo` from URL params | `checkout/page.tsx` | 30-32 |
| 4 | User fills billing details (business name, address, GST) in modal | `checkout/page.tsx` | 37-45 |
| 5 | On Submit, frontend reads `auth.currentUser.uid` from Firebase Auth | `checkout/page.tsx` | 108 |
| 6 | Frontend calls `POST /api/create-razorpay-order` with `{plan, cycle, promo, uid, formData}` | `checkout/page.tsx` | 119-123 |
| 7 | Backend computes pricing + GST, creates Razorpay order via API | `create-razorpay-order/route.ts` | 12-56 |
| 8 | Backend writes `PENDING` transaction doc to `transactions/{orderId}` via Firebase Admin | `create-razorpay-order/route.ts` | 58-68 |
| 9 | Backend returns `{id, amount, currency}` to frontend | `create-razorpay-order/route.ts` | 70 |
| 10 | Frontend initialises Razorpay SDK modal | `checkout/page.tsx` | 133-194 |
| 11 | User completes payment in Razorpay popup | Client-side Razorpay SDK |  |
| 12 | Razorpay SDK calls `handler` with `{razorpay_payment_id, razorpay_order_id, razorpay_signature}` | `checkout/page.tsx` | 141 |
| 13 | Frontend calls `POST /api/verify-payment` with only those 3 Razorpay values | `checkout/page.tsx` | 146-154 |
| 14 | Backend verifies HMAC SHA-256 signature | `verify-payment/route.ts` | 20-23 |
| 15 | Backend looks up transaction by `razorpay_order_id` from Firestore (server-side) | `verify-payment/route.ts` | 27-28 |
| 16 | Backend checks transaction is not already `SUCCESS` (idempotency) | `verify-payment/route.ts` | 37-39 |
| 17 | Backend reads `uid`, `plan`, `cycle`, `formData` from the server-side transaction doc | `verify-payment/route.ts` | 41 |
| 18 | Backend executes an atomic Firestore batch: updates `users/{uid}` + marks `transactions/{orderId}` as `SUCCESS` | `verify-payment/route.ts` | 44-67 |
| 19 | Backend returns `{verified: true}` | `verify-payment/route.ts` | 70 |
| 20 | Frontend shows success toast and navigates to `/dashboard/settings/pricing` | `checkout/page.tsx` | 168-170 |
| 21 | Pricing page (on navigation) re-reads `isPaid` and `plan` from `users/{uid}` via `onAuthStateChanged` | `pricing/page.tsx` | 19-37 |

**Assessment:** The complete payment lifecycle is coherent and the server maintains authority at every billing step.

---

## Phase 2 – Razorpay API Audit

| Check | Status | Evidence |
|---|---|---|
| Live/Test key handling | ⚠️ TEST KEY ACTIVE | `.env.local` Line 8: `rzp_test_Sw5TSKrvf9FaMS`. This is expected pre-go-live. Must be swapped for client's live key. |
| Order creation | ✅ PASS | `create-razorpay-order/route.ts` Line 38-49: POST to `https://api.razorpay.com/v1/orders` |
| Amount calculation | ✅ PASS | Server-side only, Lines 12-25 |
| GST calculation (18%) | ✅ PASS | `Math.round(originalPrice * 0.18)` Line 23 |
| Currency | ✅ PASS | Hardcoded `"INR"` Line 46 |
| Receipt | ✅ PASS | `receipt_${Date.now()}` Line 47 |
| Notes | ✅ PASS | `formData.streetAddress` passed to SDK `notes` Line 184 |
| Signature verification | ✅ PASS | HMAC SHA-256 using `crypto.createHmac` Lines 20-23 |
| HMAC format | ✅ PASS | `razorpay_order_id + "|" + razorpay_payment_id` matches Razorpay documentation exactly |
| Timeout handling | ⚠️ MEDIUM | No explicit `fetch` timeout set on the Razorpay API call. If Razorpay's server is slow, the request will hang. |

---

## Phase 3 – Backend Integrity

| Check | Status | Evidence |
|---|---|---|
| Backend owns payment state | ✅ PASS | `verify-payment/route.ts` Lines 44-67: `adminDb.batch()` handles both user and transaction update |
| Frontend cannot activate subscriptions | ✅ PASS | `checkout/page.tsx` Lines 146-170: Frontend sends only Razorpay keys, contains no `setDoc` on billing fields |
| Firebase Admin only updates billing | ✅ PASS | `adminDb` confirmed used only in API routes (Lines 27, 45, 47 of verify-payment; Lines 2, 59 of create-order) |
| No client-side billing writes | ✅ PASS | `setDoc` search across all files confirms no `isPaid`, `plan`, or `subscriptionCycle` writes from any client page |
| Atomic database updates | ✅ PASS | `adminDb.batch()` at `verify-payment/route.ts` Line 45. `batch.commit()` at Line 67 |
| Idempotency | ✅ PASS | Status check `transactionData?.status === "SUCCESS"` at Line 37 returns early |
| Duplicate protection | ✅ PASS | Same `order_id` cannot be processed twice due to the idempotency check above |
| Authentication on API routes | ⚠️ HIGH | Neither `/api/create-razorpay-order` nor `/api/verify-payment` verify a Firebase Auth token from the request. The `uid` sent during order creation is trusted from the frontend payload. While verification uses server-stored values only, the initial `uid` binding remains client-supplied. |

---

## Phase 4 – Firestore Synchronization

### Collections Touched by Payment Flow

| Collection | Written By | When |
|---|---|---|
| `transactions` | Firebase Admin SDK (Server) | Order creation (PENDING) and verification (SUCCESS) |
| `users` | Firebase Admin SDK (Server) | On successful payment verification |

### Partial Update Risk Analysis

- **Can partial updates occur?** The `batch.commit()` in `verify-payment/route.ts` (Line 67) is atomic. If either the `users` or `transactions` update fails, neither will be committed. **Risk: None for the verified path.**
- **Can orphan transactions exist?** Yes. If the user pays but closes the browser before the frontend can call `/api/verify-payment`, a `PENDING` transaction will exist in Firestore indefinitely with no mechanism to resolve it. The webhook (not implemented) would normally handle this. **Severity: HIGH.**
- **Inconsistent state risk:** The only inconsistent state that can occur is: payment is captured by Razorpay, but `PENDING` transaction is never upgraded to `SUCCESS` because the browser was closed. This leaves a paid user without an active subscription.

### Firestore Security Rules

- **`firestore.rules` file:** NOT FOUND on disk. Could not be verified from source code.
- **Risk:** If the live Firestore rules permit authenticated client writes to `users/{uid}` on sensitive fields (`isPaid`, `plan`, `subscriptionCycle`), a malicious user could still bypass the payment system using the Firebase client SDK directly from the browser console.
- **Severity: CRITICAL (Cannot be confirmed or denied from source code).**

---

## Phase 5 – Integration With Existing Modules

### Dashboard Synchronization
- `dashboard/page.tsx` Line 291: Uses `onSnapshot(userDocRef)` — a real-time Firestore listener.
- **Assessment:** The moment the server writes `isPaid: true` to `users/{uid}`, the dashboard will receive the update in real-time without a page refresh. ✅ SYNCHRONIZED.
- `dashboard/page.tsx` Line 465: Contains `updateDoc(doc(db, "users", auth.currentUser.uid), { isPaid: false, plan: "Free" })`. This is a **client-side write to billing fields**, triggered by a subscription expiry UI component. This is an existing pre-audit pattern and was not introduced by the Razorpay integration, but it represents the same class of client-trust vulnerability.

### Settings/Account Page
- `settings/account/page.tsx` Lines 36, 57: Reads `isPaid` from Firestore to display current plan badge.
- **Assessment:** As `users/{uid}` is the single source of truth, this will automatically reflect the paid status. ✅ SYNCHRONIZED.

### CRM, Inventory, Invoices, Accounting, Reports
- None of these modules reference `isPaid`, `plan`, `subscriptionCycle`, `transactions` (the new Razorpay collection), or any payment-related Firestore field.
- **Assessment:** These modules are completely independent of the payment integration. ✅ NO IMPACT.

### Notifications / Email on Payment
- No email or SMS notification is sent upon successful payment.
- **Not verified from source code** that any payment confirmation email exists.
- **Assessment:** Payment confirmation to the customer is **not implemented**. Severity: MEDIUM.

---

## Phase 6 – Regression Audit

| Module | Status | Evidence |
|---|---|---|
| Authentication | ✅ UNAFFECTED | No auth files modified |
| Dashboard | ✅ UNAFFECTED | `dashboard/page.tsx` not modified by Razorpay integration |
| CRM / Customers | ✅ UNAFFECTED | No customer files modified |
| Invoices | ✅ UNAFFECTED | No invoice files modified |
| Accounting / Reports | ✅ UNAFFECTED | No report files modified |
| Inventory / Products | ✅ UNAFFECTED | No product files modified |
| Offline / PWA | ✅ UNAFFECTED | No service worker or IndexedDB logic modified |
| Existing APIs | ✅ UNAFFECTED | Only `create-razorpay-order` and `verify-payment` routes modified |
| Existing UI | ✅ UNAFFECTED | Checkout page UI logic and HTML are intact |

---

## Phase 7 – Production Safety (Scenario Analysis)

| Scenario | Behavior | Safe? |
|---|---|---|
| Invalid signature | `verify-payment` returns `{ verified: false, "Invalid Signature." }` (Line 72) | ✅ Yes |
| Duplicate verification (same order_id called twice) | Idempotency check returns `{ verified: true, "Payment already processed." }` without re-updating DB (Lines 37-39) | ✅ Yes |
| Double click on Submit | `isSubmitting` state is set to `true` on first click (Line 106), disabling the button | ✅ Yes |
| Browser refresh during payment | Razorpay modal state is lost. `PENDING` transaction orphaned in Firestore. No auto-recovery. | ⚠️ Partial |
| Cancelled payment (user closes Razorpay modal) | `modal.ondismiss` fires, setting `isSubmitting(false)`. No DB changes occur (Lines 189-192). | ✅ Yes |
| Failed payment | Razorpay SDK handles this; handler is not called. No DB changes. | ✅ Yes |
| Browser closed after payment, before verification | `PENDING` transaction orphaned. User is charged but not upgraded. No webhook to recover. | ❌ Not safe |
| Network interruption during verification | `fetch` to `/api/verify-payment` fails. Frontend catches error (Line 171-173). User sees error toast. Payment was captured but subscription not activated. | ⚠️ Partial |
| API timeout on Razorpay order creation | No explicit timeout; depends on Node.js default. `try/catch` at Line 71 handles it gracefully. | ⚠️ Partial |
| Firestore Admin failure during batch commit | `catch` at Line 74 returns a 500 error. Payment was captured by Razorpay, but subscription not activated. PENDING transaction remains. | ❌ Not safe |

---

## Phase 8 – Environment Audit

| Variable | Location | Type | Status |
|---|---|---|---|
| `NEXT_PUBLIC_RAZORPAY_KEY` | `.env.local` | Public | ✅ Correctly public. Used in checkout SDK and order creation server. |
| `RAZORPAY_SECRET` | `.env.local` | Server-only | ✅ No `NEXT_PUBLIC_` prefix. Used only in `verify-payment/route.ts` and `create-razorpay-order/route.ts`. |
| `FIREBASE_PROJECT_ID` | `.env.local` | **NOT FOUND** | ⚠️ Firebase Admin credentials (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`) are referenced in `firebaseAdmin.ts` Lines 9-11 but are **NOT set in `.env.local`**. The build fallback (`initializeApp({ projectId: 'demo-project' })`) at Line 19 will silently activate in production if these are not configured on the deployment host. |
| `RAZORPAY_SECRET` value | `.env.local` | Test Secret | ⚠️ Current value (`D8uqjWWkXY3j79hNlpE34nou`) is a test-mode secret. Must be replaced with client's live secret key at deployment. |

---

## Phase 9 – Database Consistency

```
Payment Captured by Razorpay
         ↓
/api/verify-payment receives callback
         ↓
HMAC verified ✅
         ↓
transaction doc fetched from server ✅
         ↓
idempotency confirmed ✅
         ↓
batch.commit():
  users/{uid}.isPaid = true       ✅
  users/{uid}.plan = <plan>       ✅
  transactions/{id}.status = SUCCESS ✅
         ↓
Dashboard onSnapshot fires ✅
         ↓
Pricing page reflects new plan ✅
```

**Stale data risk:** The only path to stale data is the orphaned `PENDING` transaction scenario (browser close before verification). All other paths are synchronous and atomic.

---

## Phase 10 – Performance

| Operation | Implementation | Assessment |
|---|---|---|
| Order creation | 1 Razorpay API call + 1 Firestore `set` | Acceptable |
| Payment verification | 1 Firestore `get` + 1 atomic `batch.commit` (2 writes) | Optimal |
| Dashboard update | Real-time `onSnapshot` listener, no polling | Optimal |
| Unnecessary DB operations | None identified | ✅ Clean |

---

## Phase 11 – Code Quality

| Aspect | Assessment |
|---|---|
| Error handling | `try/catch` present in all API routes. Errors return JSON with descriptive messages. |
| Input validation | `uid` is required at order creation (Line 8-10). No validation that `plan` is one of the known valid values. |
| Maintainability | Pricing logic is duplicated identically in both `create-razorpay-order/route.ts` and `checkout/page.tsx` (client-side display only). Not a security risk, but a maintenance concern. |
| Readability | Code is clearly structured and commented. |
| Business logic placement | Pricing is correctly owned by the server. Plan activation is correctly owned by the server. |

---

## Phase 12 – Testing Matrix

| Test Case | Expected Behavior | Handled? |
|---|---|---|
| ✅ Successful payment | Signature verified → DB batch updated → User upgraded | ✅ Yes |
| ✅ Failed payment | Razorpay handles; handler not called; no DB write | ✅ Yes |
| ✅ Cancelled payment | `ondismiss` fires; `isSubmitting` reset; no DB write | ✅ Yes |
| ✅ Duplicate callback | Idempotency check prevents re-processing | ✅ Yes |
| ✅ Duplicate verification | `status === "SUCCESS"` check prevents double-upgrade | ✅ Yes |
| ✅ Invalid signature | Returns `{ verified: false }` 400 | ✅ Yes |
| ✅ Invalid order (not in DB) | Returns `{ verified: false, "Order not found." }` 404 | ✅ Yes |
| ✅ Wrong payment ID | HMAC will not match; returns `{ verified: false }` | ✅ Yes |
| ✅ Wrong order ID | HMAC will not match; returns `{ verified: false }` | ✅ Yes |
| ⚠️ Browser refresh mid-payment | Orphan PENDING transaction; no recovery | ❌ Not handled |
| ⚠️ Browser close after payment | User charged, not upgraded; no recovery | ❌ Not handled |
| ⚠️ Network interruption during verify | Same as above | ❌ Partial |
| ⚠️ API timeout | `try/catch` returns 500; payment captured but user not upgraded | ❌ Partial |
| ⚠️ Firestore failure | `try/catch` returns 500; payment captured but user not upgraded | ❌ Partial |
| ⚠️ Firebase Admin not configured | Build fallback (`demo-project`) fires silently; all Admin writes fail in production | ❌ Not handled |

---

## Phase 13 – Production Certification Table

| Category | Status | Result | Notes |
|---|---|---|---|
| Order Creation | ✅ PASS | Amount/GST server-side, Razorpay API integration correct | |
| HMAC Verification | ✅ PASS | SHA-256, exact Razorpay spec format | |
| Backend Authority | ✅ PASS | No client-side billing writes post-integration | |
| Idempotency | ✅ PASS | Duplicate order_id safe | |
| Atomic Writes | ✅ PASS | `batch.commit()` used | |
| Dashboard Sync | ✅ PASS | Real-time `onSnapshot` listener | |
| CRM Sync | ✅ PASS | Independent; unaffected | |
| Accounting Sync | ✅ PASS | Independent; unaffected | |
| Reports Sync | ✅ PASS | Independent; unaffected | |
| Regression Safety | ✅ PASS | Zero unrelated files modified | |
| Firestore Rules | ❓ UNVERIFIED | `firestore.rules` not found on disk. Client-write protection cannot be confirmed. | |
| Firebase Admin Config | ❌ FAIL | `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` absent from `.env.local`. Production deployment will silently fail Admin operations. | |
| Webhook (Recovery) | ❌ FAIL | Not implemented. Browser-close after payment leaves user charged but unupgraded. | |
| Payment Confirmation | ⚠️ MISSING | No email/SMS confirmation sent after successful payment | |
| Test Key Active | ⚠️ TEST | `rzp_test_*` key active; must be replaced with live credentials | |

---

## Phase 14 – Logging

| Log Type | Present | Evidence |
|---|---|---|
| Payment creation logs | ⚠️ Partial | `console.error("Razorpay Order Error:", data)` Line 54 – error only |
| Verification logs | ⚠️ Partial | `console.error("Verification Error:", error)` Line 75 – error only |
| Success logs | ❌ Missing | No `console.log` or structured log on successful payment |
| Webhook logs | N/A | Not implemented |
| Audit trail | ⚠️ Partial | `transactions` collection provides a partial record. No separate audit log. |

---

## Phase 15 – Remaining Issues Summary

### BLOCKING (Must resolve before live keys)

**B1 – Firebase Admin Credentials Not Configured**  
- **File:** `.env.local`, `src/lib/firebaseAdmin.ts` Lines 5-20  
- **Risk:** In production, the `if (process.env.FIREBASE_PROJECT_ID)` guard will fail silently, initialising the Admin SDK with `demo-project`. All `adminDb` writes (transaction logging, user plan upgrades) will fail at runtime. Payment will be captured by Razorpay, but no subscription will be activated.  
- **Severity:** CRITICAL  
- **Fix:** Add `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` to the production environment (Vercel/host environment variables). Do not put the private key in `.env.local`.  
- **Effort:** 5 minutes (configuration only, no code change required)

**B2 – Firestore Security Rules Unverifiable**  
- **File:** `firestore.rules` – NOT FOUND on disk  
- **Risk:** If client SDK writes to `isPaid`, `plan`, or `subscriptionCycle` are currently permitted on the `users` collection, any authenticated user can bypass the payment gateway via the browser console.  
- **Severity:** CRITICAL  
- **Fix:** Verify and deploy Firestore rules that block client writes to billing fields. No application code change required.  
- **Effort:** 15 minutes  

**B3 – Test Key Must Be Replaced**  
- **File:** `.env.local` Line 8  
- **Risk:** No real transactions can be processed with `rzp_test_*` keys.  
- **Severity:** BLOCKER (by definition)  
- **Fix:** Replace `NEXT_PUBLIC_RAZORPAY_KEY` and `RAZORPAY_SECRET` in the production environment with the client's live credentials.  
- **Effort:** 2 minutes (configuration only)

### RECOMMENDED BEFORE LAUNCH (High)

**R1 – No Webhook for Fulfillment Recovery**  
- **Risk:** User pays → closes browser → subscription never activates → customer support issue + potential chargeback.  
- **Severity:** HIGH  
- **Fix:** Implement `/api/webhooks/razorpay` to handle `payment.captured` event as a recovery mechanism.  
- **Effort:** ~2 hours  

**R2 – `uid` Still Supplied by Frontend at Order Creation**  
- **File:** `checkout/page.tsx` Line 122, `create-razorpay-order/route.ts` Line 6  
- **Risk:** A user could theoretically supply a different `uid` at order creation to bind payment to another account. The verification step is secure (reads from server-stored data), but the initial binding is frontend-supplied.  
- **Severity:** HIGH  
- **Fix:** The backend should derive `uid` from a verified Firebase ID Token header, not from the request body.  
- **Effort:** ~30 minutes

---

## Final Certification

---

# ❌ NOT CERTIFIED – BLOCKING ISSUES REMAIN

**The implementation cannot be certified for live client Razorpay keys until the following are resolved:**

1. **Firebase Admin production credentials (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`) must be configured** in the production deployment environment. Without these, all server-side subscription activations will silently fail.

2. **Firestore Security Rules must be verified and deployed** to confirm client-side writes to billing fields (`isPaid`, `plan`, `subscriptionCycle`) are blocked.

3. **Test Razorpay keys must be replaced** with client's live credentials in the production environment.

These three items require **zero code changes**. They are purely deployment configuration and Firestore rule verification tasks. Once confirmed, the core implementation is architecturally sound and suitable for production use.

---

*Certification document generated from direct source code inspection. No assumptions were made.*
