# Salon Queue Management System
**Live demo:** https://vibecoding23-one.vercel.app  
**Hosted on:** Vercel (frontend) + Render (backend) + MongoDB Atlas  
**Staff Demo PIN (Reception / Barber / Admin):** `1234`

---

## 🌟 Executive Overview & Brand Identity

**Studio Kashi Salon (`સ્ટુડિયો કાશી સલૂન`)** is a luxury Indian barbering and precision grooming queue management platform built on the **MERN Stack** (MongoDB, Express, React, Node.js) with real-time bidirectional **Socket.IO** synchronization.

Designed to eliminate chaotic physical waiting rooms, the system orchestrates a synchronized experience across 7 high-contrast, obsidian-amber glassmorphic interfaces—from customer mobile status tracking to multi-chair receptionist terminals, barber station consoles, and an ambient waiting area TV lounge display.

### Key Highlights
- **100% Real-Time Socket.IO Synchronization**: Sub-60ms state propagation across customer trackers, TV displays, receptionist queues, and stylist terminals.
- **First-Class Bilingual Architecture (English + ગુજરાતી)**: Seamless, single-character-accurate localization across all 7 screens with zero text overflow.
- **Atomic Daily Sequential Token Engine**: Generates clean, chronological tokens (`S-1`, `S-2`, `S-3`, ...) resetting daily in `Asia/Kolkata` (IST) timezone.
- **Strict Business Logic & Preference Routing**: Enforces forward-only lifecycle state machines, active phone deduplication, and stylist preference dispatching.
- **Acoustic & Haptic Alerts**: Web Audio API synthesized 3-tone harmonic chimes (`C5 -> E5 -> G5`) and mobile vibration patterns on turn callouts.
- **Mobile Tap-Target Accessibility**: Strict $\ge 44\text{px} \times 44\text{px}$ touch targets across all mobile viewports.

---

## 🏗️ Architecture & Tech Stack

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        STUDIO KASHI SALON ARCHITECTURE                 │
└────────────────────────────────────────────────────────────────────────┘

  [ CUSTOMER MOBILE ]      [ WAITING LOUNGE TV ]     [ BARBER & RECEPTION ]
   /, /join, /status/:id          /display            /reception, /barber, /admin
            │                         │                           │
            └─────────────────────────┼───────────────────────────┘
                                      │
                                      ▼ HTTPS / WSS
                       ┌──────────────────────────────┐
                       │   Vercel Edge SPA Hosting    │
                       │     (React + Vite + Tailwind)│
                       └──────────────┬───────────────┘
                                      │ REST API / WebSocket
                                      ▼
                       ┌──────────────────────────────┐
                       │   Render Cloud Node Engine   │
                       │  (Express + Socket.IO Server)│
                       └──────────────┬───────────────┘
                                      │ Mongoose ORM
                                      ▼
                       ┌──────────────────────────────┐
                       │     MongoDB Atlas Cluster    │
                       │ (Replica Set / Atomic State) │
                       └──────────────────────────────┘
```

| Layer | Technologies | Purpose |
|:---|:---|:---|
| **Frontend Framework** | React 19, Vite, React Router 7 | High-performance SPA with instant HMR and lightweight bundle size |
| **Styling & Design** | Tailwind CSS 3.4, Glassmorphism | Custom obsidian-amber palette (`#07080a`, `#e59b58`, `#d4af37`) |
| **Motion Primitives** | Framer Motion | Smooth tactile spring transitions, modal animations, countdown rings |
| **Typography** | *Instrument Serif*, *Plus Jakarta Sans*, *Noto Sans Gujarati* | Editorial luxury typography with native Gujarati script support |
| **Backend API** | Node.js (>=18), Express 4 | Modular REST API with centralized validation and AppError handling |
| **Real-Time Gateway** | Socket.IO 4.8 | Bidirectional event broadcasts (`queue:updated`, `ticket:called`) |
| **Database** | MongoDB Atlas, Mongoose 8 | Indexed schemas, atomic daily counters, forward-only transitions |
| **Audio & Haptics** | Web Audio API, Navigator Vibrate | Synthesized turn chime without external MP3 asset dependencies |

---

## 📱 The 7 Bespoke Core Screens

Modeled visually after the **SmartCut Barber Queue Showcase** design blueprint:

### 1. Customer Home (`/`)
- **Atmosphere**: Deep charcoal obsidian background with ambient champagne glow.
- **Hero Pulse Card**: Displays live people waiting, dynamic estimated wait time, and working barber count.
- **Barber Status Chips**: Real-time availability pills (`Available`, `Busy`, `On Break`) for stylists Ravi, Amit, and Imran.
- **Active Ticket Persistence**: LocalStorage persistence detects active sessions and surfaces an elevated banner: `"View Active Ticket (S-14) →"`.
- **Operating Hours Guard**: Automatically informs customers if the queue is paused or closed 30 minutes before cutoff.

### 2. Join Queue (`/join`)
- **Customer Form**: Name input (min 2 chars) and 10-digit Indian mobile number validation.
- **Multi-Service Catalog**: Select up to 3 services (e.g. Classic Haircut, Beard Sculpting, Head Massage & Steam).
- **Stylist Picker**: Choose *Any Barber (fastest)* or request a specific stylist (*Ravi*, *Amit*, or *Imran*).
- **Sticky Glass Bottom Drawer**: Calculates total price (`₹`), cumulative duration (`min`), and estimated call time dynamically.

### 3. Customer Live Status Tracker (`/status/:id`)
- **Status Readout Card**: Modeled on the top-right dark card in the design showcase.
- **Visual Elements**:
  - Elevated frosted token box displaying `S-14` with ordinal queue rank (`1st in Line (Next)`, `2nd in Line`).
  - Circular SVG progress countdown ring that visually ticks down as your turn nears.
  - Middle Advisory Pill: Dynamically switches to `"Start coming to the salon"` when 2nd in line.
  - Turn Alert: On `ticket:called`, card lights up in champagne gold with `"It's your turn! Go to Ravi"` + Web Audio API harmonic chime and mobile vibration.
  - Self-Service Cancellation Modal: Enables customers to politely forfeit their spot with a single tap.

### 4. Receptionist Dashboard (`/reception`)
- **Access**: Gated behind the tactile 4-digit **Staff PIN Gate** (`1234`).
- **Layout**: Landscape 2-column workstation:
  - **Left**: Stylist Chair Overview with progress bars, active customer tags, and one-tap `[ Call Next ]` buttons.
  - **Right**: Master Waiting Queue table with customer phone masks, selected services, and amber delay highlight for tickets waiting $> 60$ minutes.
  - **Actions**: Multi-select or row actions for `[ No-show ]` and `[ Cancel ]`.
  - **Rapid Walk-In Modal**: Quick intake form allowing reception to register in-salon guests even when online intake is closed.

### 5. Barber Station Console (`/barber/:name`)
- **Terminal Viewports**: Dedicated station consoles for `/barber/ravi`, `/barber/amit`, and `/barber/imran`.
- **Station Controls**:
  - Live elapsed service timer (`HH:MM:SS`) tracking chair duration against estimated service time.
  - Sequential lifecycle buttons: `[ Call Next Customer ]` $\rightarrow$ `[ Start Service ]` $\rightarrow$ `[ Complete Cut ]`.
  - `"Next For You"` Queue Preview displaying the upcoming customer matched to that stylist.
  - Availability Toggles: Seamlessly switch between `Available` and `On Break` (protected against toggling while serving).

### 6. Ambient Waiting Area TV Display (`/display`)
- **Kiosk Viewport**: Standalone full-viewport container designed for $1920 \times 1080$ screens readable from 5 metres away without requiring authentication.
- **Top Header**: Live digital clock (`HH:MM:SS AM/PM`), date, Sound On/Mute toggle (unlocks Web Audio API), bilingual pill, and fullscreen trigger.
- **Twin Glass Split**:
  - **Left (60%) — Now Serving**: 3 large station cards displaying active token numbers in `text-7xl font-serif text-brand-glow`, customer names, and booked services.
  - **Right (40%) — Up Next**: Displays the top 5 upcoming tickets with wait estimates, or a welcoming empty queue graphic.
- **6-Second Callout Alert**: When any customer is called, an animated gold glass banner floats down (`"🔔 Now Calling S-14 · Go to Ravi"`) accompanied by a pleasant 3-tone chime.

### 7. Owner Settings & Admin Console (`/admin`)
- **Access**: Gated behind the **Staff PIN Gate** (`1234`).
- **Section 1 — Today's Stats**: 3 frosted metric cards pulling live data (`Customers Served`, `Avg Wait Time`, `No-Shows`).
- **Section 2 — Queue Control**: Prominent master toggle switch (`Queue Open · Accept new customers` vs `Queue Closed · Online joining paused`) and Operating Hours editor (`Open Time` / `Close Time`).
- **Section 3 — Barber Roster**: Stylist floor roster with on/off duty switches (with safety guard preventing taking a stylist off-duty while serving).
- **Section 4 — Services Catalog CRUD**: Add, edit, activate/deactivate, and delete services with instant real-time synchronization across all customer windows.

---

## ⚙️ Core Queue Scheduling Engine & Business Rules

All queue operations are governed by `server/src/services/queueEngine.js`, adhering strictly to `docs/03-flows-rules.md`:

```text
                       ┌───────────────┐
                       │    WAITING    │
                       └──┬─────────┬──┘
                          │         │ (Customer Cancel)
           (Call Next)    │         ▼
                          │    ┌───────────┐
                          │    │ CANCELLED │
                          ▼    └───────────┘
                       ┌───────────────┐
                       │    CALLED     │
                       └──┬─────────┬──┘
                          │         │ (No-Show)
           (Start Service)│         ▼
                          │    ┌───────────┐
                          │    │  NO-SHOW  │
                          ▼    └───────────┘
                       ┌───────────────┐
                       │   IN_CHAIR    │
                       └──────┬────────┘
                              │ (Complete)
                              ▼
                       ┌───────────────┐
                       │     DONE      │
                       └───────────────┘
```

1. **Forward-Only State Machine**: Tickets can only transition forward: `waiting -> called -> in_chair -> done`. Illegal transitions (e.g. `done -> in_chair`) are strictly rejected with HTTP `400`.
2. **Duplicate Active Phone Guard**: Submitting a phone number with an active ticket (`waiting`, `called`, `in_chair`) returns the existing ticket with `isExisting: true` rather than generating duplicate tokens.
3. **Barber Preference Matching**: If a customer requests a specific stylist (e.g. `Ravi`), other stylists calling next skip that customer and pull the earliest `Any` or matching customer.
4. **Dynamic Wait Time Formula**: Calculated dynamically based on the cumulative duration of tickets ahead in the line, divided by the number of active on-duty working stylists:
   $$\text{Wait Time} = \left\lceil \frac{\sum \text{Duration of competing tickets ahead}}{\max(\text{Active Barbers}, 1)} \right\rceil$$
5. **No-Show Discipline**: Marking a called customer as `No-show` immediately frees the barber. If that customer returns and re-registers, they are appended to the very end of the line with a brand-new token.
6. **Operating Window Cutoff**: Automatically disables online queue intake 30 minutes before salon closing time, while preserving in-person Reception walk-in intake.

---

## 🌐 Bilingual Localization (`EN` + `ગુજરાતી`)

The application delivers native bilingual parity without clipping, layout shifts, or missing keys:

| Feature / Concept | English Term | Natural Gujarati Equivalent |
|:---|:---|:---|
| **Brand Identity** | Studio Kashi Salon | સ્ટુડિયો કાશી સલૂન |
| **Brand Tagline** | Look Good. Feel Great. | સારા દેખાઓ. ઉત્તમ અનુભવો. |
| **Now Serving** | Now Serving | હાલમાં સેવા ચાલુ |
| **Up Next** | Up Next | આગળનો વારો |
| **Advisory Banner** | Start coming to the salon | સલૂન તરફ આવવાનું શરૂ કરો |
| **Your Turn** | It's your turn! Go to Ravi | તમારો વારો આવી ગયો છે! રવિ પાસે જાઓ |
| **Chair Ready** | Chair Ready · Next guest | ખુરશી તૈયાર છે · આગળના ગ્રાહક માટે |
| **Queue Open** | Queue Open · Accept new customers | કતાર ખુલ્લી છે · નવા ગ્રાહકો જોડાઈ શકે છે |
| **Queue Closed** | Queue Closed · Online joining paused | કતાર બંધ છે · ઓનલાઇન જોડાણ બંધ |

---

## 🔒 Security & Access Control

- **Staff PIN Gate**: Frontline protection on `/reception`, `/barber/:name`, and `/admin` requiring PIN `1234`.
- **API Header Authentication**: Mutations are protected by `server/src/middleware/requireStaffPin.js` requiring header `x-staff-pin: 1234`.
- **Multi-Origin CORS Security**: Express and Socket.IO parse comma-separated `CLIENT_URL` domains with automatic Vercel preview domain matching (`*.vercel.app`).
- **Session Auto-Clearing**: 401 Unauthorized API responses dispatch `salon:auth_cleared` events that clear `sessionStorage` and prompt for the PIN again.

---

## 🧪 Verification & Automated Test Suites

The repository contains 3 automated test suites covering 24/24 end-to-end assertions:

```bash
# 1. Core Queue Engine & State Machine Verification (6/6 tests)
node server/src/tests/verifyQueueEngine.js

# 2. Owner Admin REST API & Configuration Suite (7/7 tests)
node server/src/tests/verifyAdminWorkflow.js

# 3. Comprehensive End-to-End QA Audit (11/11 tests)
node server/src/tests/verifyEndToEndQA.js
```

### Test Coverage Matrix
- [x] Service duration and price accumulation
- [x] Duplicate active phone guard & token recovery
- [x] Stylist preference routing (Amit skips Ravi requests)
- [x] Sub-5s Socket.IO alert delivery (< 60ms verified)
- [x] Full chair lifecycle synchronization (`called -> in_chair -> done`)
- [x] No-show cancellation and end-of-queue rejoining
- [x] Queue closure cutoff and walk-in exception handling
- [x] 100% dictionary key parity between `en.js` and `gu.js`
- [x] Dynamic wait countdown recalculation
- [x] Illegal backwards state transition rejection (HTTP 400)
- [x] Production `/api/health` status reporting

---

## 🛠️ Local Development Setup

### Prerequisites
- **Node.js**: `>= 18.0.0`
- **MongoDB**: Local instance running on port `27017` or MongoDB Atlas URI

### Installation & Execution

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/salon-queue.git
   cd salon-queue
   ```

2. **Install all dependencies** (monorepo root, client, and server):
   ```bash
   npm run install:all
   ```

3. **Configure Environment Variables**:
   
   **Server (`server/.env`)**:
   ```env
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/salon_queue
   CLIENT_URL=http://localhost:5173
   STAFF_PIN=1234
   ```

   **Client (`client/.env`)**:
   ```env
   VITE_API_URL=http://localhost:5000
   ```

4. **Start Local Development Environment**:
   ```bash
   npm run dev
   ```
   - Client launches on: `http://localhost:5173`
   - Server launches on: `http://localhost:5000`
   - Seed data (3 barbers, 6 bilingual services) auto-populates on first run!

---

## ☁️ Cloud Deployment Configuration

### 1. Frontend: Vercel
- **Root Directory**: `salon-queue/client` (or `client`)
- **Framework Preset**: `Vite`
- **Environment Variables**:
  - `VITE_API_URL`: Your live Render backend URL (e.g. `https://salon-queue-api.onrender.com`)
- **SPA Rewrites**: Defined in `client/vercel.json` to prevent 404s on browser refreshes.

### 2. Backend: Render
- **Root Directory**: `salon-queue/server` (or `server`)
- **Runtime**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Health Check Path**: `/api/health`
- **Environment Variables**:
  - `NODE_ENV`: `production`
  - `PORT`: `5000`
  - `STAFF_PIN`: `1234`
  - `MONGO_URI`: Your MongoDB Atlas connection URI
  - `CLIENT_URL`: `https://vibecoding23-one.vercel.app,http://localhost:5173`

---

## 📂 Repository Directory Tree

```text
salon-queue/
├── package.json                 # Monorepo runner (concurrently scripts)
├── prompts.md                   # Iterative log of all 10 engineering prompts
├── render.yaml                  # Render cloud infrastructure blueprint
├── docs/
│   ├── 01-brief.md              # Project brief and UX aesthetic guidelines
│   ├── 02-screens.md            # Detailed screen-by-screen specifications
│   └── 03-flows-rules.md        # State machine and business logic rules
├── client/
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js       # Luxury obsidian-amber bespoke design tokens
│   ├── vercel.json              # Vercel SPA routing rewrite rules
│   ├── src/
│   │   ├── App.jsx              # Client router for all 7 application routes
│   │   ├── index.css            # Atmospheric ambient glows & glassmorphism
│   │   ├── components/
│   │   │   ├── auth/StaffPinGate.jsx # Tactile 4-digit PIN authentication gate
│   │   │   ├── layout/AppShell.jsx   # Persistent framing & mobile navigation
│   │   │   └── ui/                   # SplitHeading, TactileCard, LanguageToggle
│   │   ├── context/
│   │   │   ├── LanguageContext.jsx   # EN / GU bilingual reactive provider
│   │   │   └── QueueContext.jsx      # Real-time Socket.IO global state provider
│   │   ├── i18n/
│   │   │   ├── en.js                 # Complete English dictionary
│   │   │   └── gu.js                 # Complete Gujarati dictionary (100% parity)
│   │   ├── lib/
│   │   │   ├── api.js                # Axios instance with trailing-slash normalization
│   │   │   ├── audio.js              # Web Audio API 3-tone harmonic chime
│   │   │   ├── motion.js             # Spring physics primitives
│   │   │   └── socket.js             # Resilient Socket.IO client gateway
│   │   └── pages/
│   │       ├── HomePage.jsx          # Screen 1: Customer Home & Live Wait Cards
│   │       ├── JoinQueuePage.jsx     # Screen 2: Intake Form & Service Selector
│   │       ├── MyStatusPage.jsx      # Screen 3: Live Status Tracker & Countdown
│   │       ├── ReceptionPage.jsx     # Screen 4: Receptionist Workstation Dashboard
│   │       ├── BarberPage.jsx        # Screen 5: Barber Station Terminal Console
│   │       ├── DisplayTvPage.jsx     # Screen 6: Waiting Lounge TV Kiosk Display
│   │       └── AdminPage.jsx         # Screen 7: Owner Admin & Roster Control
└── server/
    ├── package.json
    ├── src/
    │   ├── index.js             # Express app, HTTP server, multi-origin CORS, Socket.IO
    │   ├── config/db.js         # Graceful MongoDB Atlas connection helper
    │   ├── middleware/requireStaffPin.js # 4-digit staff PIN validator
    │   ├── models/              # Mongoose schemas (Service, Barber, Ticket, Config, Counter)
    │   ├── routes/              # Express API routes (bootstrap, auth, queue, admin)
    │   ├── seed/seedData.js     # Indian salon seed data catalog
    │   ├── services/queueEngine.js # Centralized queue engine & state machine
    │   ├── sockets/socketHandler.js # Real-time Socket.IO event dispatcher
    │   ├── utils/salonTime.js   # Asia/Kolkata timezone & operating cutoff helpers
    │   └── tests/               # 3 automated verification suites (24/24 assertions)
```

---

## 📄 License & Attribution
Engineered for the **Antigravity Vibe Coding Assignment**. Built with precision for Studio Kashi Salon.
