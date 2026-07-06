# Firebase Firestore Rules — Deployment Guide

**Application:** Cloud Ledger  
**Firebase Project:** `billing-app-86a8e`  
**Purpose:** Deploy Firestore Security Rules to protect billing fields from client-side writes.

> **Scope:** This guide covers Firestore rules deployment ONLY.  
> It will NOT affect your Next.js application, Vercel deployment, Firestore documents, or any other Firebase service.

---

## Pre-Deployment Checklist

Before running any command, confirm the following files exist in the project root:

| File | Status | Purpose |
|---|---|---|
| `firestore.rules` | ✅ Present | The security rules to be deployed |
| `firebase.json` | ✅ Present | Tells Firebase CLI which rules file to use |
| `.firebaserc` | ✅ Present | Points to the correct Firebase project |

---

## Phase 1 — Install Firebase CLI (Windows)

Open **Command Prompt** or **PowerShell** as a normal user (no admin required).

```cmd
npm install -g firebase-tools
```

Verify installation:

```cmd
firebase --version
```

Expected output: a version number like `13.x.x`.

---

## Phase 2 — Login to Firebase

```cmd
firebase login
```

This will open a browser window. Sign in with the Google account that owns the `billing-app-86a8e` Firebase project.

After login, return to the terminal. You will see:

```
✔  Success! Logged in as your-email@gmail.com
```

---

## Phase 3 — Verify Project

Confirm the CLI is pointing to the correct Firebase project:

```cmd
firebase use
```

Expected output:

```
Active Project: billing-app-86a8e
```

If the project is not shown, run:

```cmd
firebase use billing-app-86a8e
```

---

## Phase 4 — Preview Rules (Optional but Recommended)

Before deploying, view the rules that will be pushed:

```cmd
type firestore.rules
```

Confirm you can see the rules protecting `isPaid`, `plan`, `subscriptionCycle`, and `subscriptionStartDate`.

---

## Phase 5 — Deploy Firestore Rules

Run this exact command from the project root (`D:\Billing-app\billing-app`):

```cmd
firebase deploy --only firestore:rules
```

Expected output:

```
=== Deploying to 'billing-app-86a8e'...

i  deploying firestore
i  firestore: checking firestore.rules for compilation errors...
✔  firestore: rules file firestore.rules compiled successfully
i  firestore: uploading rules firestore.rules...
✔  firestore: released rules firestore.rules to cloud.firestore

✔  Deploy complete!
```

---

## Phase 6 — What This Command Does (and Does NOT Do)

### ✅ What it changes
- Uploads and activates the new `firestore.rules` in your live Firebase project.
- Any subsequent client-side write to `isPaid`, `plan`, `subscriptionCycle`, or `subscriptionStartDate` will be rejected with a `permission-denied` error.
- The `transactions` collection becomes server-only.

### ❌ What it does NOT do
- Does NOT redeploy or touch your Next.js application on Vercel.
- Does NOT modify, delete, or reset any Firestore documents or collections.
- Does NOT affect Firebase Authentication.
- Does NOT affect Firebase Storage, Cloud Functions, or Hosting.
- Does NOT trigger a new Vercel build or deployment.
- Does NOT affect your `.env.local` or any environment variables.

---

## Phase 7 — Verify Deployment

After deployment, open the Firebase Console and confirm:

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Select project `billing-app-86a8e`
3. Navigate to **Firestore Database → Rules**
4. Confirm the rules shown match what is in `firestore.rules`
5. The "Published" timestamp should show today's date and time

---

## Phase 8 — Test the Rules (Browser Console Test)

To independently verify the rules are live:

1. Open Cloud Ledger in your browser and log in as a paid user.
2. Open browser **DevTools → Console** (F12).
3. Paste and run this command:

```javascript
import('/firebase').then(async ({db, auth}) => {
  const {updateDoc, doc} = await import('firebase/firestore');
  try {
    await updateDoc(doc(db, 'users', auth.currentUser.uid), { isPaid: false });
    console.log('FAIL — write succeeded (rules not deployed correctly)');
  } catch(e) {
    console.log('PASS — write blocked:', e.code);
  }
});
```

**Expected result:** `PASS — write blocked: permission-denied`  
**Failure result (rules not active):** `FAIL — write succeeded`

---

## Firestore Rules — Compatibility Report

The following table confirms that existing application functionality is NOT blocked by the new rules.

| Collection | Rule Applied | App Functionality | Impact |
|---|---|---|---|
| `users` | Read own. Write own **except** billing fields. | Profile updates, name, address changes | ✅ No impact |
| `users` (billing fields) | **BLOCKED** from client | `isPaid`, `plan`, `subscriptionCycle` | ✅ Intended — server only |
| `transactions` | **Fully server-only** | Razorpay payment log | ✅ Intended — server only |
| `settings` | Read/write own | Invoice settings, print settings, item settings | ✅ No impact |
| `invoices` | Any authenticated user | Create, edit, view invoices | ✅ No impact |
| `customers` | Any authenticated user | CRM — create, edit, view customers | ✅ No impact |
| `products` | Any authenticated user | Inventory — create, edit, view products | ✅ No impact |
| `purchases` | Any authenticated user | Purchase orders and bills | ✅ No impact |
| `expenses` | Any authenticated user | Expense tracking | ✅ No impact |
| `bankAccounts` | Any authenticated user | Bank account management | ✅ No impact |
| `attendanceSettings` | Any authenticated user | Staff attendance settings | ✅ No impact |
| `platformSettings` | Read: any auth. Write: super admin only | Super admin legal/security settings | ✅ No impact |
| All other collections | Any authenticated user | All remaining app features | ✅ No impact |

> **Note on the Dev Dashboard Button:**  
> The "Revert to Free Plan" button in `dashboard/page.tsx` (Line 465) calls `updateDoc` with `{ isPaid: false, plan: "Free" }`. After rules deployment, this button will fail with a `permission-denied` error and show a "Failed to revert" toast. This is expected and correct — the button is a development testing tool, not a production feature. Real plan management happens through the Firebase Admin SDK on the server.
