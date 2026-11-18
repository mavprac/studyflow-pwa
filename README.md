# StudyFlow PWA

An offline-first, mobile-first spaced repetition tracker for Android and desktop browsers.

## Requirements

- Node.js 18.18+ (Node.js 20 LTS recommended)
- npm
- Chrome or another modern browser

## Run locally

```bash
cd studyflow-pwa
npm install
npm run dev
```

Open the local URL printed by Vite (usually `http://localhost:5173`).

## Production build

```bash
npm run build
npm run preview
```

The production output is written to `dist/`.

## Install on Android

A PWA must be served from HTTPS for installability and service-worker support (localhost is treated as a secure development origin).

1. Deploy the contents of `dist/` to an HTTPS static host such as Cloudflare Pages, Netlify, or GitHub Pages.
2. Open the deployed HTTPS URL in Chrome on Android.
3. Open Chrome's three-dot menu.
4. Select **Install app** or **Add to Home screen**.
5. Confirm. StudyFlow opens in standalone mode from the Android launcher.

## Offline behaviour

The service worker caches the application shell and same-origin assets. IndexedDB (Dexie) stores subjects, topics, and revision logs locally. After the first successful load, the app can be reopened offline. Data is scoped to the browser profile and device; clearing site data removes it. Export JSON backups regularly before changing devices or clearing browser storage.

## SRS rules

- A new topic starts at repetition count 0, ease factor 2.5, and its first review is one day after the study date.
- Successful Good/Easy ratings advance through the fixed interval sequence: 1, 3, 7, 14, 30 days.
- Beyond the fixed sequence, the interval is calculated from the previous interval and ease factor.
- Hard retains the repetition count and schedules 1.2 × the current interval.
- Easy advances to the next interval and applies a 1.3 multiplier.
- Forgot resets the count and schedules tomorrow.
- Overdue topics remain in the due queue until reviewed.

## Notifications: platform limitation

The app requests notification permission only after a user action. The service worker can display notifications, and Periodic Background Sync is registered where the browser supports it and grants permission. Android Chrome does **not** guarantee that periodic sync runs at a precise daily time or at all on every device. Foreground/open checks are the dependable in-app fallback.

The preferred reminder time is saved as a user preference but cannot force a browser to wake a suspended PWA at that exact time. For dependable system alarms, use the per-topic `.ics` export and import it into an Android calendar app. Calendar applications differ in how they handle imported alarms.

## Calendar export

Saving a new topic automatically downloads an `.ics` file with alarms for the initial +1, +3, +7, +14, and +30 day schedule. If the browser blocks automatic downloads, use the browser's download prompt or download the calendar from the topic details where available.

## Backup and restore

Settings → Export JSON Backup creates a portable copy of subjects, topics, and revision history. Import replaces the local StudyFlow database after confirmation. Keep copies in a safe location.

## Data model

- `subjects`: name and display colour
- `topics`: study date, notes, SRS state, next review date, status
- `reviews`: timestamp, rating, resulting interval, review date

All data is stored locally in IndexedDB. No analytics or data is transmitted to a server.
