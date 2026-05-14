# Firebase Setup

This tracker can run in two modes:

- Local preview mode: stores submissions in the current browser only.
- Firebase mode: stores submissions in Firestore so developers and the PM dashboard share the same data.

## 1. Add your Firebase web config

Open `firebase-config.js` and replace `window.EAGLEPOINT_FIREBASE_CONFIG = null;` with your Firebase web app config:

```js
window.EAGLEPOINT_FIREBASE_CONFIG = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

The Firebase web API key is not a password. The important security layer is your Firestore rules.

## 2. Firestore collections used

The app writes daily pulse submissions to:

```text
dailyPulses
```

The app writes weekly summary draft fields to:

```text
weeklySummaries/current
```

You can override those names in `firebase-config.js`:

```js
pulseCollection: "dailyPulses",
weeklyCollection: "weeklySummaries"
```

## 3. Security recommendation

For real team use, add Firebase Authentication before opening this broadly:

- Developers should be allowed to create their own daily pulse.
- PM/admin users should be allowed to read, resolve, export, and manage summaries.
- Developers should not see the full PM dashboard unless you intentionally allow it.

`firestore.rules.example` is intentionally conservative. Treat it as a starting point, not a finished production policy.
