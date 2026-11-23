# Iterative Development Prompts & Architecture Log

This document records the exact 10 iterative prompts executed to design, scaffold, test, and production-harden the **Studio Kashi Salon Queue Management System**.

---

## Prompt 1: Environment, Docs-First Architecture, Scaffolding & Design Tokens
- **Objective**: Establish the monorepo root structure, Antigravity architectural specifications (`docs/01-brief.md`, `docs/02-screens.md`, `docs/03-flows-rules.md`), dependencies, bespoke obsidian-amber design tokens, motion primitives, bilingual scaffolding (`en.js` & `gu.js`), and minimal health checks.
- **Key Deliverables**:
  - Root `package.json` with `concurrently` runner (`dev`, `client`, `server`, `build`).
  - Architecture specifications in `docs/`.
  - Tailwind CSS luxury tokens: `obsidian-950` to `800`, `brand-amber`, `brand-gold`, `brand-glow`.
  - Typography: Google Fonts *Instrument Serif*, *Plus Jakarta Sans*, and *Noto Sans Gujarati*.
  - Primitives: `SplitHeading`, `TactileCard`, `LanguageToggle`, `AppShell`.

---

## Prompt 2: MongoDB Schemas, Atomic Token Counter, Seed Data & Bootstrap API
- **Objective**: Implement clean Mongoose models, daily atomic token sequence generator (`DailyCounter.getNextToken`), Indian salon seed script, and bootstrap API.
- **Key Deliverables**:
  - Models: `Service.js`, `Barber.js`, `QueueTicket.js`, `SalonConfig.js`, `DailyCounter.js`.
  - Atomic sequence generation resetting daily in `Asia/Kolkata` (IST) timezone.
  - Realistic seed catalog (3 barbers: Ravi, Amit, Imran; 6 bilingual services).
  - Endpoints: `GET /api/bootstrap`, `POST /api/auth/verify-pin` (`STAFF_PIN=1234`).

---

## Prompt 3: Core Queue Engine, Business Rules, REST API & Real-Time Socket.IO Sync
- **Objective**: Build the single-source-of-truth `queueEngine.js`, REST endpoints for Customer, Reception, Barber, TV Display, and Admin, and real-time Socket.IO broadcasts.
- **Key Deliverables**:
  - Forward-only state machine: `waiting -> called -> in_chair -> done`, `waiting -> cancelled`, `called -> no_show`.
  - Duplicate active 10-digit phone guard (`isExisting: true`).
  - Strict barber preference matching (`preferredBarber: 'any'` vs specific stylist).
  - Dynamic wait time and queue position calculator.
  - Real-time Socket.IO events: `'queue:updated'` and `'ticket:called'`.
  - 6/6 test verification suite (`verifyQueueEngine.js`).

---

## Prompt 4: App Shell, Bilingual Language Switcher, Global State, Home & Join Queue
- **Objective**: Build the persistent visual framing, `QueueContext` and `LanguageContext`, Screen 1 (Home `/`), and Screen 2 (Join Queue `/join`).
- **Key Deliverables**:
  - Screen 1 (`/`): Real-time pulse card (waiting count, estimated wait), live barber status chips, champagne gold `[ Join Queue → ]` CTA, active ticket recovery banner.
  - Screen 2 (`/join`): Customer name, 10-digit phone number mask, max 3 service multi-select, stylist picker, sticky glass drawer with calculated total price and duration.
  - Gujarati translation parity with single-character perfection.

---

## Prompt 5: Customer Live Status Tracker (/status/:id) & Active Ticket Persistence
- **Objective**: Build Screen 3 (`/status/:id`) modeled on the dark glassmorphic status card in `SmartCut Barber Queue Showcase.png`, wired to Socket.IO events, browser vibration/chime alerts, cancellation modal, and active ticket persistence.
- **Key Deliverables**:
  - Elevated frosted token box displaying `S-14` and ordinal rank readout (`1st in Line`, `2nd in Line`).
  - Circular SVG progress countdown ring.
  - Dynamic middle advisory pill (`"Start coming to the salon"` when 2nd in line).
  - Dynamic centerpiece card adapting on `called`, `in_chair`, and terminal states.
  - Web Audio API pleasant 3-tone harmonic chime (`playChime()`) and mobile vibration (`triggerVibration()`).
  - Active ticket storage in `localStorage.salon_active_ticket`.

---

## Prompt 6: Staff PIN Gate, Receptionist Dashboard (/reception) & Barber View (/barber/:name)
- **Objective**: Implement reusable `StaffPinGate`, Screen 4 (`/reception`), and Screen 5 (`/barber/:name`).
- **Key Deliverables**:
  - `StaffPinGate.jsx`: 4-digit keypad + physical keyboard support + auto-clearing 401 interceptor.
  - Screen 4 (`/reception`): Landscape 2-column workstation with Barber Station progress bars, `Waiting Queue` table with amber highlight for $> 60$m, row action triggers (`[ No-show ]`, `[ Cancel ]`), and rapid `AddWalkInModal`.
  - Screen 5 (`/barber/:name`): Mobile portrait terminal with barber switcher tabs, Active Customer centerpiece card with live `HH:MM:SS` timer, `[ Start ]`, `[ Done ]`, `[ Call Next Customer ]`, `"Next for you"` preview, and twin `Available` / `On Break` switches.

---

## Prompt 7: Ambient Waiting Area TV Display (/display)
- **Objective**: Build Screen 6 (`/display`) optimized for $1920 \times 1080$ screens legible from 5 metres, modeled on the bottom-third dark glassmorphic TV display in the reference showcase.
- **Key Deliverables**:
  - Public access bypassing standard customer/staff AppShell navigation and footer.
  - Top header: Live digital clock (`HH:MM:SS AM/PM`), date, Sound On / Mute toggle (unlocks Web Audio API), bilingual toggle, and browser fullscreen toggle.
  - Left Panel (60%): `"Now Serving · હાલમાં સેવા ચાલુ"` with 3 barber station cards displaying large token readouts (`Now: S-12`), customer name, services, and 6-second champagne gold highlight on `ticket:called`.
  - Right Panel (40%): `"Up Next · આગળનો વારો"` listing top 5 upcoming tickets or clean empty queue notice.
  - Floating 6-second callout alert overlay: `"🔔 Now Calling S-14 · Go to Ravi"`.

---

## Prompt 8: Owner Settings & Admin Dashboard (/admin) + Bilingual & Mobile Polish
- **Objective**: Build Screen 7 (`/admin`) wrapped in `StaffPinGate`, wired to admin REST APIs, and perform a cross-screen bilingual (`EN` / `ગુજરાતી`) and mobile $\ge 44\text{px}$ touch-target polish pass.
- **Key Deliverables**:
  - Section 1: Today's Stats 3-column metric cards (`Served`, `Avg Wait`, `No-Shows`).
  - Section 2: Queue Control master switch (`isQueueOpen` toggle) and operating hours editor.
  - Section 3: Barber On-Duty roster with duty toggles and active-customer safety guard.
  - Section 4: Services Management with CRUD modal (Add, Edit, Toggle Active, Delete).
  - Cross-screen audit ensuring $\ge 44\text{px} \times 44\text{px}$ touch targets across mobile screens.
  - 7/7 admin test suite (`verifyAdminWorkflow.js`).

---

## Prompt 9: End-to-End QA Audit, Production Hardening & Cloud Deployment Config
- **Objective**: Complete end-to-end QA audit against all 11 business rules in `docs/03-flows-rules.md`, zero-hardcoded-URL hardening, multi-origin CORS, and deployment configuration for Vercel + Render + Atlas.
- **Key Deliverables**:
  - Comprehensive QA audit suite (`verifyEndToEndQA.js`) with 11/11 assertions passing.
  - Dynamic API/Socket URL resolution with trailing slash normalization.
  - Multi-origin CORS support in `server/src/index.js` supporting comma-separated `CLIENT_URL` and `*.vercel.app`.
  - Production health check at `GET /api/health` returning `{ status: "ok", database: "connected", uptimeSeconds }`.
  - Vercel SPA rewrite config (`client/vercel.json`) and Render blueprint (`render.yaml`).
  - Frontend production build verified in 1.02s with 0 errors.

---

## Prompt 10: Production README.md, prompts.md & Final Submission Audit
- **Objective**: Finalize submission documentation with verified live deployment URLs, clear architecture documentation, and final repository hygiene audit.
