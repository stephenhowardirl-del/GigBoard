# GigBoard — Setup Guide

## What you have
A complete React web app with:
- Google Login (OAuth)
- Firestore database (gigs, users, unavailability)
- Google Calendar integration
- Full admin / Venue admin / DJ permission levels

---

## Step 1 — Create a Firebase project (free, ~5 mins)

Firebase stores your data and handles auth.

1. Go to https://console.firebase.google.com
2. Click **Add project** → name it `GigBoard` → Continue
3. Disable Google Analytics (not needed) → **Create project**

### Add a web app
4. Click the **</>** (Web) icon
5. Name it `GigBoard` → click **Register app**
6. Copy the config object — it looks like:

```js
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

7. Open `src/lib/firebase.js` and replace the placeholder values with your real config.

### Enable Firestore
8. In Firebase Console → **Build → Firestore Database** → **Create database**
9. Choose **Start in test mode** → select `eur3 (europe-west)` → Enable

### Enable Google Sign-In
10. **Build → Authentication → Get started**
11. Click **Google** → Enable → add your email as support email → Save

---

## Step 2 — Set your admin email

Open `src/lib/config.js` and replace:
```js
export const FULL_ADMIN_EMAIL = 'stevehoward@REPLACEWITHYOUREMAIL.com';
```
With your actual Google account email, e.g.:
```js
export const FULL_ADMIN_EMAIL = 'steve@gmail.com';
```

---

## Step 3 — Link your Google Cloud project to Firebase

Firebase Auth uses Google Cloud OAuth behind the scenes.

1. In Google Cloud Console → **APIs & Services → Credentials**
2. Click your OAuth 2.0 Client ID
3. Under **Authorised JavaScript origins**, add:
   - `http://localhost:3000`
4. Under **Authorised redirect URIs**, add:
   - `http://localhost:3000`
5. Save

---

## Step 4 — Run the app locally

You need Node.js installed. Download from https://nodejs.org (LTS version).

Then open Terminal (Mac) or Command Prompt (Windows) and run:

```bash
cd gigboard
npm install
npm start
```

The app opens at http://localhost:3000
Sign in with your Google account — you'll automatically get full admin access.

---

## Step 5 — Deploy to Vercel (free, ~2 mins)

```bash
npm install -g vercel
vercel
```

Follow the prompts — it'll give you a URL like `gigboard-xxx.vercel.app`.

### After deploying, add your live URL to Google Cloud:
1. Google Cloud Console → Credentials → your OAuth Client ID
2. Add to **Authorised JavaScript origins**: `https://gigboard-xxx.vercel.app`
3. Add to **Authorised redirect URIs**: `https://gigboard-xxx.vercel.app`
4. Save

---

## Step 6 — Onboard your DJs

1. Share the Vercel URL with your 5 DJs
2. They sign in with Google — they're automatically assigned the **DJ** role
3. In your admin dashboard → **DJ roster** tab, you can see everyone who's signed up
4. To give Sean venue admin access: change his role to **Venue admin** and select **The Wash**

---

## Firestore Security Rules (important before going live)

In Firebase Console → Firestore → Rules, replace the default with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == uid;
    }
    match /gigs/{gigId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null;
    }
    match /unavailability/{uid} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == uid;
    }
  }
}
```

---

## Need help?
Send any error messages to Claude and I'll fix them.
