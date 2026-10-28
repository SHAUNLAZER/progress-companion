# Progress Companion

A mobile-first, privacy-respecting client-side guided story companion for Be Bodywise wellness routines (hair, face, body skin, PCOS and hormones, period and hygiene, general wellness).

---

## Story Flow & Navigation

- **Journey** (`#/`): Three concentric rings (Check-in, Weekly review, Consistency), memory cards, story path, and priority card.
- **Set up** (`#/start`): 9-tap guided onboarding across 3 chapters (About you, Your routine, Your expectations) with interactive expectation reveal and draft persistence.
- **Timeline** (`#/expect`): Progress forecast weather strip, milestone timeline, and "Why does it take time?" explanation.
- **Check-in** (`#/today`): 180px animated circular check-in with haptic feedback, 3-row continuity strip (Yesterday, Today, Tomorrow), 12-week heatmap, month calendar, rest days, and on-device backup/restore.
- **Results** (`#/progress`): Starting point vs now, normal band chart with typical biology range corridor, weekly review with line-drawn SVG faces, momentum score, week recap stories, and share card.
- **Next step** (`#/decide`): Decision aid tailored to your verdict (Keep going, Adjust your routine, or Try a different approach), refill planning, and progress summary export.
- **Support** (`#/stuck`): Kind, 3-step re-engagement flow for when progress feels slow or routines slip.
- **Week recap** (`#/recap`): Full-screen swipeable progress stories celebrating consistency and milestones.

---

## Core Features

- **F1. Circular Check-in**: 180px animated ring filling in 600ms, animated tick drawing, soft pulse, guarded haptic buzz, collapsed note, and undo link.
- **F2. Heatmap & Calendar**: GitHub-style 12-week x 7-day contribution grid and standard month calendar showing done, rest, missed, and today without red colors.
- **F3. Normal Band Chart**: Plots user ratings against shaded biology expectation corridor per concern with clear status indications.
- **F4. Support Flow**: Non-judgmental guided support with tailored actions, 2-week pause mode, or journey summary wrap-up.
- **F5. Progress Forecast Strip**: Weather-style progress strip (Cloud, Sun-behind-cloud, Sun) with "You are here" marker and dynamic ETA calculation.
- **F6. SVG Faces Rating**: Clean line-drawn SVG faces for 1–5 ratings ("Not good", "So-so", "Okay", "Good", "Great") storing numeric values.
- **F7. Week Recap Stories**: Segmented progress stories appearing at weeks 1, 2, 4, 8, and 12.
- **F8. Rest Days**: Up to 2 rest days per rolling 7 days that protect streaks and adjust consistency denominators fairly.
- **F9. Memory Cards**: Recalls what you wrote weeks ago and highlights tangible baseline progress.
- **F10. Three Concentric Rings**: Animated rings for Today's check-in, Weekly review, and 28-day consistency.
- **F11. Expectation Reveal**: Compares expected timeframe against typical biological horizons.
- **F12. Offline PWA**: Installable web app with service worker asset caching and on-device storage.
- **F13. Momentum Score**: 0-100 score based on 7-day consistency, streaks, and review cadence.
- **F14. Shareable Week Card**: One-tap copyable weekly snapshot.

---

## Deploy to Vercel

The app has **no build step**, **no framework**, and **no server dependencies**.

1. Connect your repository to Vercel or upload the directory.
2. Framework Preset: **Other**.
3. Build Command: leave empty.
4. Output Directory: `.` (root).
5. Deploy.

---

## Testing

Run unit tests locally using Node.js:

```bash
node test.js
```

All 77+ logic tests run across 11 test suites covering consistency math, streak tracking, rest days, verdict engine, priority cards, focus resolution, casing, and critique rules.

---

## Privacy & Safety

- **Private**: 100% on-device storage in `localStorage`.
- **Zero tracking**: No analytics, third-party trackers, or marketing pixels.
- **Pure problem-solving**: No prices, discounts, ratings of products, carts, or shop links.
