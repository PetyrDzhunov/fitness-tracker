# Фитнес дневник (Fitness Tracker PWA)

Personal workout log for one user, used on a phone. Data stays on the device (IndexedDB). No backend, no login.

Stack: Vite, React 18, TypeScript, Dexie (IndexedDB), vite-plugin-pwa. UI language: Bulgarian. Units: kg.

## Status

**Stage 1 (this version)**

- Log exercises and sets (reps, weight per hand or total, optional RPE and note) for any day
- Prebuilt exercise list with separate 1-hand and 2-hand variants, plus custom exercises
- Last-session hint, "copy last workout", edit and delete sets, new-record message
- Rest timer after each saved set
- History calendar with day detail, copy a day into today
- CSV export and import (restore, duplicates are skipped)
- Dark mode, installable PWA with offline support

**Next stages (not built yet)**

- Stage 2: progress charts per exercise, personal records, weekly volume, bodyweight, progress photos with weekly in-app reminder and side-by-side compare
- Stage 3: polish, update toast, accessibility pass

The "Прогрес" and "Тяло" tabs show a "coming soon" placeholder for now.

## Deploy to GitHub Pages (no local tools needed)

1. On GitHub create a new **empty** repository, for example `fitness-tracker`. GitHub Pages is free for **public** repositories (private ones need a paid plan). Only the source code is public; your workout data never leaves your phone.
2. Unzip this project on your computer and, inside the folder, run:

   ```
   git init
   git add .
   git commit -m "Initial version"
   git branch -M main
   git remote add origin https://github.com/<your-user>/fitness-tracker.git
   git push -u origin main
   ```

3. In the repository open **Settings → Pages** and set **Source** to **GitHub Actions**.
4. Open the **Actions** tab. The workflow "Build and deploy to GitHub Pages" installs the dependencies, builds the app and publishes it. If you set the Pages source after the first push, press **Run workflow** once.
5. When it is green, the app is at `https://<your-user>.github.io/fitness-tracker/`.

If the **Build** step is red, open the failed step in the Actions tab, copy the error text and send it to Claude. The "Type check" and "Unit tests" steps are allowed to fail without blocking the deploy; their output is still useful to report.

## Install on the phone

- **Android (Chrome):** open the link, menu (three dots) → **Install app** / **Add to Home screen**.
- **iPhone (Safari):** open the link, Share button → **Add to Home Screen**. Use Safari for this step.

Open the app once online; after that it works offline. Back up regularly: **Настройки → Експорт CSV** and keep the file somewhere safe. If browser data is cleared, restore with **Импорт CSV**.

## Develop locally (optional)

```
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests (Vitest)
npm run typecheck  # TypeScript check
npm run build      # production build in dist/
```

## Project structure

```
src/
  db/          Dexie schema, seed exercises, repository functions
  domain/      Pure logic: 1RM, volume, validation, CSV, import planning
  features/    today (log, picker, entry sheet, timer), history, settings
  components/  Sheet, Toast, NumberField
  i18n/bg.ts   All Bulgarian texts
tests/         Unit and database tests
.github/workflows/deploy.yml   Build and publish to GitHub Pages
```

## Notes for developers

- Seed exercise ids are `seed:<index>:<1h|2h|na>` built from the position in `SEED_DEFS`. The list is append-only: never reorder or remove entries.
- Dates are local `YYYY-MM-DD` strings. Weight is stored as entered (per hand for dumbbell exercises); volume is `weight × reps` with no hand multiplier.
- The app uses a hash router so it works on static hosting without rewrites.
- `confirm()` and `prompt()` dialogs are used for deletions and renaming in this stage.
