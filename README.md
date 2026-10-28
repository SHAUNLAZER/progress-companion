# Progress Companion

A mobile-first, privacy-respecting client-side guided story companion for Be Bodywise wellness routines (hair, face, body skin, PCOS and hormones, period and hygiene, general wellness).

---

## Story Flow & Navigation

- **Journey** (`#/`): Status path, current story node, and primary action card.
- **Set up** (`#/start`): 9-question onboarding across 3 chapters (About you, Your routine, Your expectations).
- **Timeline** (`#/expect`): Expectation vs reality, milestone timeline, and "Why does it take time?" explanation.
- **Check-in** (`#/today`): Quick daily habit logging, consistency over 28 days, and streak tracker.
- **Results** (`#/progress`): Starting point vs now, interactive SVG chart, weekly review, and honest verdict.
- **Next step** (`#/decide`): Decision aid tailored to your verdict (Keep going, Adjust your routine, or Talk to a doctor).

---

## Deploy to Vercel

The app has **no build step**, **no framework**, and **no server dependencies**. It works out of the box as a static site.

### Option 1: Deploy with Vercel CLI (Fastest from Terminal)

1. Open PowerShell or Command Prompt.
2. Navigate to this directory:
   ```bash
   cd C:\Users\shaun\.gemini\antigravity\scratch\bodywise-progress-companion
   ```
3. Run the Vercel deployer via `npx`:
   ```bash
   npx vercel
   ```
4. Follow the interactive prompts:
   - `Set up and deploy?` → **Y**
   - `Which scope?` → Select your Vercel account
   - `Link to existing project?` → **N**
   - `What's your project's name?` → `progress-companion` (or press Enter)
   - `In which directory is your code located?` → `./` (press Enter)
   - `Want to modify these settings?` → **N** (Vercel automatically detects the static site)
5. You'll receive your live URL in seconds (e.g., `https://progress-companion.vercel.app`).
6. To deploy straight to production later:
   ```bash
   npx vercel --prod
   ```

---

### Option 2: Deploy via Vercel Web Dashboard (No CLI Required)

1. Log in to [vercel.com](https://vercel.com).
2. Click **Add New...** → **Project**.
3. Import your GitHub / GitLab repository containing these files, OR:
   - Drag and drop the `bodywise-progress-companion` folder into the deployment box.
4. Leave Framework Preset as **Other** (Root directory: `./`).
5. Click **Deploy**.

---

## Running Tests Locally

Run the test suite anytime with Node.js:
```bash
node test.js
```
All 62 test assertions across 9 test suites verify:
- Day & week number computations across boundaries
- 28-day consistency & consecutive streaks
- Verdict engine decision tree & doctor safety overrides
- Product cost and refill timelines
- Journey card priority state routing
- v1 to v2 data migration & default filling
- Start date offset mapping from onboarding time buckets
- 5-branch focus priority recommendation engine (`Utils.getFocus`)
