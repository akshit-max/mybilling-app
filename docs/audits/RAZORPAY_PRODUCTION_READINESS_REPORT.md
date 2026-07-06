# Cloud Ledger – Production Razorpay Readiness Audit

**Status:** Implementation Frozen  
**Objective:** Production-readiness assessment for live client Razorpay API keys.  
**Scope:** Complete payment architecture flow.  

---

## Phase 1 – Architecture Review

**Payment Architecture Flow:**
1. **Frontend:** `checkout/page.tsx` collects business details and hits `/api/create-razorpay-order`.
2. **Backend:** `/api/create-razorpay-order` computes pricing, adds GST, and queries Razorpay `v1/orders`.
3. **Frontend:** Razorpay SDK `checkout.js` is initialized with the returned `order_id`.
4. **User Action:** Payment modal displayed, user pays.
5. **Frontend Callback:** `handler` triggers on success.
6. **Backend:** Frontend sends payment details to `/api/verify-payment`.
7. **Backend:** Verifies HMAC SHA-256 signature and returns `{ verified: true }`.
8. **Frontend:** Executes `setDoc` to Firestore to update `isPaid: true` and `plan`.

**Sequence Diagram (Text):**
`Client -> Server (Create Order) -> Razorpay -> Client (SDK) -> User Pays -> Razorpay -> Client (Callback) -> Server (Verify Signature) -> Server responds -> Client -> Firestore (Update Subscription)`

*Finding:* The architecture places trust in the frontend to mutate database state based on a backend boolean response. This is fundamentally insecure.

## Phase 2 – Razorpay Integration

- **SDK Initialization:** Correctly loads `checkout.js` and initializes options.
- **Order Creation:** Uses basic auth securely.
- **Amount Calculation:** Done server-side (Good).
- **GST Calculation:** Applied at 18% server-side (Good).
- **Currency Handling:** INR hardcoded (Acceptable).
- **Order Metadata:** Not used (Acceptable, but limits webhook utility).
- **Receipt Generation:** `receipt_${Date.now()}` (Basic, acceptable).
- **Notes:** Address passed from frontend.
- **Timeout Handling:** Minimal `try/catch`. 

## Phase 3 – Security Review

- **Secret Exposure:** No secrets exposed to client. (Low Risk)
- **API Key Handling:** `NEXT_PUBLIC_RAZORPAY_KEY` exposed (Normal).
- **Signature Verification:** Proper HMAC SHA-256 used in `/api/verify-payment`. (Good)
- **Replay Attacks:** Verification API does not check if an `order_id` has already been verified. (High Risk)
- **Client Trust:** Frontend is trusted to update the database. (Critical Risk)
- **Server Trust:** Server does not independently update state. (Critical Risk)
- **Authentication:** Payment APIs do not verify Bearer tokens or session cookies. (High Risk)
- **Authorization:** No checks to see if the user has permission to upgrade. (High Risk)
- **Tampering:** Frontend can tamper with the `setDoc` payload after a successful $2 test payment to grant "Enterprise". (Critical Risk)

## Phase 4 – Firestore Audit

- **Firestore schema:** Uses `users` collection.
- **Security Rules:** Client write permissions appear permissive (unable to verify locked down rules from source code).
- **Sensitive fields:** `plan`, `subscriptionCycle`, `isPaid`, `subscriptionStartDate`.
- **Verdict:** Users can modify `plan`, `isPaid`, `subscriptionCycle` directly from the client. **(Critical)**

## Phase 5 – Backend Audit

- **Authentication:** `/api/create-razorpay-order` and `/api/verify-payment` lack user identity verification.
- **Error handling:** Basic `try/catch`. No detailed reporting.
- **Validation:** Missing input validation for `plan` and `cycle`.
- **Rate limiting:** Missing.
- **Logging:** Minimal `console.error`.
- **Duplicate protection:** Missing.
- **Server ownership of payment state:** Failed. Frontend owns it.

## Phase 6 – Transaction Integrity

- **Duplicate payments:** Not safely handled on the backend.
- **Duplicate callbacks:** Not handled safely.
- **Browser refresh:** State lost. Payment orphaned.
- **Cancelled/Failed payment:** Unhandled.
- **Network interruption / Browser closed after payment:** Database update fails. User is charged but does not receive the subscription. **(Critical)**
- **Refund / Chargeback:** Unhandled.

## Phase 7 – Idempotency

- Same payment ID can execute twice: **Yes** (Verification API returns true repeatedly).
- Same order can execute twice: **Yes**.
- Same webhook can execute twice: N/A.
- **Verdict: Critical**

## Phase 8 – Webhook Review

- **Are webhooks implemented?** No.
- **Impact:** Production should never rely solely on frontend callbacks. If a user pays and immediately closes the tab, the `/api/verify-payment` is never called, and the subscription is never activated. Webhooks are mandatory for guaranteed fulfillment.

## Phase 9 – Subscription Integrity

- **Who activates subscriptions?** Frontend (`checkout/page.tsx`).
- **Single source of truth:** None. The client dictates state.

## Phase 10 – Invoice & Audit Trail

- **Payment history:** No.
- **Invoice:** No.
- **Transaction record:** No.
- **Audit log:** No.
- **User billing history:** Overwrites previous subscription data (`merge: true` on `users` doc).

## Phase 11 – Authentication Review

- **How user identity reaches the backend:** It doesn't. 
- `/api/create-razorpay-order` and `/api/verify-payment` execute without knowing who requested it.
- Backend does **not** independently authenticate the user before updating billing (because it doesn't update billing).

## Phase 12 – Environment Variables

- `NEXT_PUBLIC_RAZORPAY_KEY` correctly exposed.
- `RAZORPAY_SECRET` correctly kept on server.
- No exposed server secrets found.

## Phase 13 – Failure Recovery

- **Server crash:** No recovery.
- **Payment success but DB failure:** User charged, plan not activated. No automated recovery.
- **Payment success but browser closes:** Same as above.
- **Network interruption:** Same as above.
- **API timeout:** Handled poorly.

## Phase 14 – Logging

- Payment logs: Missing.
- Verification logs: Missing.
- Failure logs: Basic `console.error`.
- Webhook logs: Missing.
- Audit logs: Missing.

## Phase 15 – Production Checklist

| Item | Status | Severity | Notes |
|---|---|---|---|
| Server-Side Pricing | Pass | Informational | Pricing is hardcoded and safe. |
| Signature Verification | Pass | Informational | Cryptographically sound. |
| Server-Side DB Update | Fail | Critical | Frontend updates DB. |
| Webhook Implementation | Fail | Critical | No fulfillment guarantee. |
| Authenticated Payment APIs | Fail | High | APIs accept anonymous traffic. |
| Idempotency Keys | Fail | High | Verification can be replayed. |
| Transaction Logging | Fail | Medium | No audit trail for payments. |
| Firestore Security Rules | Fail | Critical | Billing fields mutable by client. |

## Phase 16 – Code Quality Review

- **Maintainability:** Hardcoded pricing in APIs will become difficult to manage.
- **Security:** Broken (Client-side trust model).
- **Separation of concerns:** Violated (Frontend mixes presentation and core database mutation).
- **Business logic placement:** Split dangerously between frontend and backend.
- **Single source of truth:** Lacking.

## Phase 17 – Risk Assessment

- Architecture: 40%
- Security: 15%
- Payment Integrity: 10%
- Backend: 30%
- Firestore: 15%
- **Overall Readiness: 22%**

## Phase 18 – Remediation Plan

### P0 – Must Fix Before Live Keys (Critical)
1. **Move Database Updates to Server:**
   - **Root cause:** Frontend handles `isPaid: true`.
   - **Risk:** Users can give themselves free upgrades.
   - **Solution:** Initialize Firebase Admin SDK in Next.js. Update the `users` document inside `/api/verify-payment`.
   - **Files affected:** `verify-payment/route.ts`, `checkout/page.tsx`
2. **Implement Webhooks (`payment.captured`):**
   - **Root cause:** Relying on frontend callback for fulfillment.
   - **Risk:** Network drops or closed browsers lead to paid users with inactive accounts (customer support nightmare).
   - **Solution:** Create `/api/webhooks/razorpay` to listen for Razorpay events and update Firestore.
   - **Files affected:** New webhook route.
3. **Lock Down Firestore Rules:**
   - **Root cause:** Lack of schema protection.
   - **Risk:** Malicious users modify `plan` or `isPaid`.
   - **Solution:** Add explicit `allow update: if !request.resource.data.keys().hasAny(['isPaid', 'plan', 'subscriptionCycle'])` to rules.
   - **Files affected:** `firestore.rules`.

### P1 – Strongly Recommended (High)
1. **Authenticate Payment APIs:**
   - **Root cause:** Open endpoints.
   - **Risk:** Abuse of order creation API.
   - **Solution:** Pass Firebase ID Token in Authorization header, verify using Firebase Admin in the route.
2. **Implement Payment History Logs:**
   - **Root cause:** No audit trail.
   - **Risk:** Inability to resolve billing disputes.
   - **Solution:** Create a `transactions` subcollection to store every payment intent and success.

### P2 – Future Improvements (Medium)
1. **Dynamic Pricing Configuration:** Move hardcoded prices from API routes to a database config or environment file.
2. **Idempotency Locks:** Prevent verifying the same `order_id` multiple times to prevent race conditions.
