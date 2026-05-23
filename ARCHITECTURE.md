# FitTracker Pro — Architecture Document

## Table of Contents
1. [High-Level Design (HLD)](#high-level-design)
2. [Low-Level Design (LLD)](#low-level-design)
3. [Data Flow](#data-flow)
4. [Database Schema](#database-schema)
5. [API Reference](#api-reference)
6. [Security Model](#security-model)

---

## High-Level Design

### System Overview

FitTracker Pro is a Progressive Web App (PWA) for tracking food intake, workouts, weight, and blood glucose. It is deployable to iOS/Android home screens and runs entirely in the browser with cloud sync via Supabase.

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER DEVICE                             │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │              React SPA  (Vite + TypeScript)             │  │
│   │                                                         │  │
│   │   Auth  │  Dashboard  │  Food  │  Workout  │  Glucose   │  │
│   │   Trends │  Prediction │  Profile                       │  │
│   │                                                         │  │
│   │          localStorage  (primary read cache)             │  │
│   └────────────────────────┬────────────────────────────────┘  │
│                Service Worker (PWA / offline cache)             │
└────────────────────────────┼────────────────────────────────────┘
                             │  HTTPS
          ┌──────────────────┴──────────────────┐
          │                                     │
          ▼                                     ▼
┌──────────────────┐                 ┌──────────────────────┐
│   Vercel Edge    │                 │   Supabase Cloud     │
│                  │                 │                      │
│  /api/food-      │                 │  Auth (JWT + email)  │
│  lookup.ts       │                 │  PostgreSQL DB       │
│  (serverless fn) │                 │  Row-Level Security  │
│                  │                 │                      │
│  Uses: OpenAI    │                 │  Tables:             │
│  GPT-4o-mini     │                 │  food_entries        │
│  (server-side    │                 │  workout_entries     │
│   API key only)  │                 │  weight_entries      │
└──────────────────┘                 │  glucose_entries     │
                                     │  user_profiles       │
                                     └──────────────────────┘
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| UI Framework | React 19 + TypeScript | Component rendering |
| Build Tool | Vite 8 | Bundling, HMR, PWA |
| Styling | CSS Custom Properties + Inline Styles | Design system |
| Charts | Recharts | Data visualisation |
| Icons | Lucide React | UI icons |
| Auth + DB | Supabase (supabase-js v2) | Cloud data + auth |
| AI Lookup | OpenAI GPT-4o-mini (server-side) | Food nutrition lookup |
| Deployment | Vercel | Hosting + serverless functions |
| PWA | vite-plugin-pwa + Workbox | Offline, installable |
| Date Math | date-fns | Date formatting and ranges |

### Key Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Local-first reads | localStorage as read cache | Zero-latency UI; works offline |
| Cloud writes | Supabase upsert (fire-and-forget) | Non-blocking UX; retry on login |
| AI key security | Server-side only (Vercel fn) | Never exposed to browser |
| Offline support | PWA service worker | Installable on iPhone / Android |
| Auth | Supabase email/password | Simple, built-in JWT rotation |

---

## Low-Level Design

### Directory Structure

```
myfitnesstracker/
├── api/
│   └── food-lookup.ts          # Vercel serverless function (Node.js)
├── src/
│   ├── main.tsx                # React entry point
│   ├── App.tsx                 # Root: auth gate, nav, data orchestration
│   ├── index.css               # Design system (CSS custom properties)
│   ├── types/
│   │   └── index.ts            # All TypeScript interfaces
│   ├── components/
│   │   ├── Auth.tsx            # Login / signup screen
│   │   ├── Dashboard.tsx       # Daily summary + charts
│   │   ├── FoodTracker.tsx     # Log food, AI lookup, meal groups
│   │   ├── WorkoutTracker.tsx  # Log workouts, MET calorie estimation
│   │   ├── GlucoseTracker.tsx  # Log glucose, HbA1c estimation
│   │   ├── TrendAnalysis.tsx   # Weekly / monthly trend charts
│   │   ├── WeightPrediction.tsx# Weight loss projection + BMI
│   │   └── ProfileSetup.tsx    # User profile + TDEE / BMI display
│   └── utils/
│       ├── supabase.ts         # Supabase client singleton
│       ├── storage.ts          # localStorage CRUD + cloud sync bridge
│       ├── db.ts               # Supabase CRUD (fetch / upsert / delete)
│       ├── calculations.ts     # BMR, TDEE, BMI, GI, predictions
│       └── aiFood.ts           # HTTP client for /api/food-lookup
├── vite.config.ts              # Vite + PWA + Tailwind plugin
├── tsconfig.json               # TS project references
├── tsconfig.app.json           # Browser (src/) config
└── tsconfig.node.json          # Node (vite.config, api/) config
```

### Component Tree

```
App
├── (loading spinner)           — while getSession() resolves
├── Auth                        — if no session
└── (authenticated layout)
    ├── header
    │   ├── Logo + user greeting
    │   ├── Date picker          — selectedDate state
    │   └── Logout button
    ├── sidebar (desktop)        — NAV items
    ├── main
    │   ├── Dashboard            — view === 'dashboard'
    │   ├── FoodTracker          — view === 'food'
    │   ├── WorkoutTracker       — view === 'workout'
    │   ├── GlucoseTracker       — view === 'glucose'
    │   ├── TrendAnalysis        — view === 'trends'
    │   ├── WeightPrediction     — view === 'prediction'
    │   └── ProfileSetup         — view === 'profile'
    └── bottom-nav (mobile)     — fixed tab bar
```

### State Management

There is no global state library. State lives in three places:

```
App.tsx (owner of all shared state)
│
├── session: Session | null      — Supabase auth session
├── loading: boolean             — initial load gate
├── view: ViewType               — active page
├── selectedDate: string         — YYYY-MM-DD, shared by food/workout/glucose
└── tick: number                 — increment to force re-read from localStorage
    │
    └── Derived on every render (no useState):
        ├── foodEntries    = getFoodEntries()     ← localStorage
        ├── workoutEntries = getWorkoutEntries()  ← localStorage
        ├── weightEntries  = getWeightEntries()   ← localStorage
        ├── glucoseEntries = getGlucoseEntries()  ← localStorage
        └── profile        = getProfile()         ← localStorage
```

All child components receive data as props and call `onUpdate()` (which increments `tick`) after any write to trigger a re-render that re-reads from localStorage.

### Data Layer Architecture

```
Component calls saveFoodEntry(entry)
         │
         ▼
   storage.ts — saveFoodEntry()
         │
         ├─→ localStorage.setItem(...)        synchronous, instant
         │
         └─→ if (_uid) upsertFoodEntry(uid, entry)   fire-and-forget
                  │
                  ▼
             db.ts — upsertFoodEntry()
                  │
                  ▼
             supabase.from('food_entries').upsert(...)
                  │
                  └─→ success: row in PostgreSQL
                  └─→ failure: silently logged; recovered on next login
```

**On Login — Bidirectional Sync:**

```
loadFromSupabase(uid)
      │
      ├─ fetchFoodEntries(uid)     ← Supabase SELECT
      ├─ fetchWorkoutEntries(uid)
      ├─ fetchWeightEntries(uid)
      ├─ fetchGlucoseEntries(uid)
      └─ fetchProfile(uid)
            │
            ▼
      merge(localStorageData, remoteData)
            │
            ├─ remote wins on id conflict (remote is source of truth)
            ├─ local-only entries preserved
            └─ local-only entries pushed to Supabase   ← recovery sync
```

### Module: `utils/storage.ts`

Bridges localStorage and Supabase. All component writes go through here.

| Export | Description |
|--------|-------------|
| `setSyncUser(uid)` | Sets module-level `_uid`; called on login |
| `clearLocalData()` | Removes all localStorage keys; called on logout |
| `getFoodEntries()` | Read all food entries from localStorage |
| `saveFoodEntry(e)` | Write to localStorage + async upsert to Supabase |
| `deleteFoodEntry(id)` | Remove from localStorage + async delete from Supabase |
| `getWorkoutEntries()` | Read workout entries |
| `saveWorkoutEntry(e)` | Write workout + sync |
| `deleteWorkoutEntry(id)` | Delete workout + sync |
| `getWeightEntries()` | Read weight entries |
| `saveWeightEntry(e)` | Write weight + sync |
| `getGlucoseEntries()` | Read glucose entries |
| `saveGlucoseEntry(e)` | Write glucose + sync |
| `deleteGlucoseEntry(id)` | Delete glucose + sync |
| `getProfile()` | Read profile |
| `saveProfile(p)` | Write profile + sync |
| `generateId()` | `${Date.now()}-${random}` — collision-safe client ID |

### Module: `utils/calculations.ts`

Pure functions — no side effects, no I/O.

| Function | Formula / Logic |
|----------|----------------|
| `calculateBMR(profile)` | Mifflin-St Jeor: `10W + 6.25H − 5A ± 5` (±5 male/female) |
| `calculateTDEE(profile)` | `BMR × activityMultiplier` (1.2–1.9) |
| `calculateBMI(weight, height)` | `weight / (height/100)²` |
| `getDailySummary(date, ...)` | Sums calories, macros, GI, workout mins for a date |
| `getLast7Days()` | Returns array of 7 YYYY-MM-DD strings ending today |
| `getWeeklyData(...)` | Aggregates daily summaries by ISO week |
| `getMonthlyData(...)` | Aggregates daily summaries by calendar month |
| `predictWeightLoss(...)` | `kgLost = (deficit × days) / 7700` projected weekly |
| `getGlycemicCategory(gi)` | Low (<55), Medium (<70), High (≥70) |
| `estimateCaloriesBurned(...)` | `(MET × weight × duration) / 60` (MET lookup table) |

### Module: `utils/db.ts`

Direct Supabase calls. Handles camelCase ↔ snake_case mapping.

```
TypeScript field       ↔   Supabase column
─────────────────────────────────────────
glycemicIndex          ↔   glycemic_index
glycemicLoad           ↔   glycemic_load
caloriesBurned         ↔   calories_burned
servingSize            ↔   serving_size
mealType               ↔   meal_type
currentWeight          ↔   current_weight
targetWeight           ↔   target_weight
activityLevel          ↔   activity_level
dailyCalorieGoal       ↔   daily_calorie_goal
dailyCalorieDeficitGoal↔   daily_calorie_deficit_goal
```

### Serverless Function: `api/food-lookup.ts`

Runs in Vercel's Node.js serverless runtime. Never ships to the browser.

```
POST /api/food-lookup
Body: { foodName: string }

Flow:
  1. Validate foodName present
  2. Read OPENAI_API_KEY from process.env (Vercel env var)
  3. Call OpenAI chat completions (gpt-4o-mini, max_tokens: 512)
  4. System prompt: "respond with ONLY valid JSON"
  5. User prompt: structured nutrition request
  6. Extract JSON from response text via regex
  7. Return parsed nutritional object

Response: { name, calories, glycemicIndex, glycemicLoad,
            carbs, protein, fat, servingSize }
```

### GlucoseTracker Exports

Two functions are exported from `GlucoseTracker.tsx` for use by `Dashboard.tsx`:

| Export | Logic |
|--------|-------|
| `getGlucoseStatus(value, context)` | Returns `{label, color}` based on clinical thresholds (fasting <100 normal, after_meal <140 normal, <70 = Low) |
| `estimateHbA1c(entries)` | Nathan equation: `(avgGlucose + 46.7) / 28.7` using last 90 days (min 5 readings) |

---

## Data Flow

### Login Flow

```
Page load
    │
    ├─ supabase.auth.getSession()
    │       │
    │       ├─ no session → show Auth screen
    │       │
    │       └─ session found
    │               │
    │               ├─ setSyncUser(uid)        sets _uid in storage module
    │               ├─ loadFromSupabase(uid)   fetch + merge + push unsynced
    │               ├─ setSession(session)     triggers re-render
    │               ├─ refresh()               re-reads localStorage into props
    │               └─ setLoading(false)       hides spinner
    │
    └─ supabase.auth.onAuthStateChange()
            │
            ├─ session present → same as above (handles token refresh)
            └─ session null    → clearLocalData() + setSession(null)
```

### Food Entry Write Flow

```
User fills form → clicks "Save Entry"
    │
    ├─ FoodTracker.handleSubmit()
    │       └─ saveFoodEntry(entry)          storage.ts
    │               ├─ write localStorage    synchronous
    │               └─ upsertFoodEntry()     async, fire-and-forget
    │
    └─ onUpdate()  →  refresh()  →  setTick(t+1)
            │
            └─ App re-renders
                    └─ getFoodEntries()      reads updated localStorage
                            └─ new entry visible in all views instantly
```

### AI Food Lookup Flow

```
User types food name → clicks "Ask AI"
    │
    ├─ FoodTracker.lookupWithAI()
    │       └─ lookupFoodNutrition(query)    aiFood.ts
    │               └─ POST /api/food-lookup
    │                       │
    │                       └─ Vercel fn → OpenAI API
    │                               └─ returns JSON nutrition data
    │
    └─ setForm(result)   pre-fills all nutrition fields
```

---

## Database Schema

```sql
-- food_entries
CREATE TABLE food_entries (
  id             TEXT PRIMARY KEY,
  user_id        UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  date           TEXT NOT NULL,           -- YYYY-MM-DD
  time           TEXT NOT NULL,           -- HH:MM
  name           TEXT NOT NULL,
  calories       NUMERIC,
  glycemic_index NUMERIC,
  glycemic_load  NUMERIC,
  carbs          NUMERIC,
  protein        NUMERIC,
  fat            NUMERIC,
  serving_size   TEXT,
  meal_type      TEXT,                    -- breakfast/lunch/dinner/snack
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- workout_entries
CREATE TABLE workout_entries (
  id              TEXT PRIMARY KEY,
  user_id         UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  date            TEXT NOT NULL,
  time            TEXT NOT NULL,
  type            TEXT NOT NULL,          -- running/walking/cycling/...
  name            TEXT NOT NULL,
  duration        NUMERIC NOT NULL,       -- minutes
  calories_burned NUMERIC NOT NULL,
  distance        NUMERIC,               -- km (optional)
  steps           NUMERIC,               -- optional
  intensity       TEXT,                  -- low/moderate/high
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- weight_entries
CREATE TABLE weight_entries (
  id         TEXT PRIMARY KEY,
  user_id    UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  date       TEXT NOT NULL,
  weight     NUMERIC NOT NULL,           -- kg
  bmi        NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- glucose_entries
CREATE TABLE glucose_entries (
  id         TEXT PRIMARY KEY,
  user_id    UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  date       TEXT NOT NULL,
  time       TEXT NOT NULL,
  value      NUMERIC NOT NULL,           -- mg/dL
  context    TEXT,                       -- fasting/before_meal/after_meal/bedtime/random
  notes      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- user_profiles  (one row per user)
CREATE TABLE user_profiles (
  user_id                    UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  name                       TEXT,
  age                        INTEGER,
  gender                     TEXT,       -- male/female/other
  height                     NUMERIC,    -- cm
  current_weight             NUMERIC,    -- kg
  target_weight              NUMERIC,    -- kg
  activity_level             TEXT,
  daily_calorie_goal         NUMERIC,
  daily_calorie_deficit_goal NUMERIC,
  updated_at                 TIMESTAMPTZ DEFAULT NOW()
);

-- Row-Level Security (all tables)
ALTER TABLE food_entries     ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_entries  ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_entries   ENABLE ROW LEVEL SECURITY;
ALTER TABLE glucose_entries  ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own" ON food_entries     FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own" ON workout_entries  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own" ON weight_entries   FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own" ON glucose_entries  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own" ON user_profiles    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

---

## API Reference

### `POST /api/food-lookup`

Server-side only. Requires `OPENAI_API_KEY` in Vercel environment variables.

**Request**
```json
{ "foodName": "dal makhani" }
```

**Response (200)**
```json
{
  "name": "Dal Makhani (1 cup / 200g)",
  "calories": 230,
  "glycemicIndex": 30,
  "glycemicLoad": 7,
  "carbs": 25,
  "protein": 14,
  "fat": 8,
  "servingSize": "1 cup (200g)"
}
```

**Error (400/500)**
```json
{ "error": "foodName is required" }
```

---

## Security Model

| Concern | Mitigation |
|---------|-----------|
| OpenAI API key | Stored only in Vercel env vars; never in client bundle or localStorage |
| User data isolation | Supabase RLS: every table query filtered by `auth.uid() = user_id` |
| Auth tokens | Managed by Supabase JWT; auto-rotated; never stored manually |
| Cross-user data | Impossible — RLS enforced at database level, not application level |
| Supabase anon key | Public by design (RLS is the access control layer); safe to expose |
| HTTPS | Enforced by Vercel on all routes |
| PWA offline cache | Service worker caches only static assets; API calls are NetworkOnly |

---

## Environment Variables

| Variable | Where | Description |
|----------|-------|-------------|
| `VITE_SUPABASE_URL` | Vercel + `.env` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Vercel + `.env` | Supabase public anon key |
| `OPENAI_API_KEY` | Vercel only | OpenAI key — never in client |
