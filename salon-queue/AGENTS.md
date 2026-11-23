# AGENTS.md — Antigravity Engineering & Architecture Playbook
**Salon Queue Management System (MERN Stack + Socket.IO + Bilingual EN/GU)**

---

## 1. System Vision & Architecture Overview
The **Salon Queue Management System** is an enterprise-grade, real-time waitlist and chair management platform built for modern hair studios and traditional barbershops. It bridges digital self-service check-in with high-contrast TV display boards, front-desk reception controls, barber station controls, and administrative analytics.

### Core Architectural Pillars
1. **Docs-First & Deterministic Implementation**: Every schema, queue transition, and socket payload is specified in `docs/` before code is committed.
2. **Real-Time Reactive Mesh**: Socket.IO maintains an active duplex channel between the Express backend, TV display boards, customer tracking links, and staff terminals.
3. **Bilingual by Default (English + Gujarati)**: Gujarati (ગુજરાતી) and English are treated as tier-1 citizens. Every customer-facing string, queue announcement, and ticket state has accurate cultural phrasing.
4. **Resilient Offline / Disconnected Behavior**: The server handles database failover gracefully, socket reconnections are automatic with exponential backoff, and state recovery is monotonic.
5. **Luxury Tactile Design Language**: Bespoke dark obsidian surfaces (`#0d0e12`), champagne/copper accents (`#d4af37`, `#e59b58`), smooth glassmorphic depth (`backdrop-blur-xl`), and Apple-inspired spring physics (`framer-motion`).

---

## 2. Monorepo Roadmap (10-Prompt Progression)
- **Prompt 1 (Current)**: Environment, architecture specification, directory scaffolding, design tokens, motion primitives, bilingual i18n scaffolding, health checks.
- **Prompt 2**: MongoDB Schemas (Ticket, Barber, Service, Settings) & Socket.IO Event Engine.
- **Prompt 3**: Queue State Machine & Real-Time Estimation Algorithm (dynamic wait times, grace periods, barber affinity).
- **Prompt 4**: Customer Experience (Self-service check-in `/join` & Live ticket tracker `/status/:id`).
- **Prompt 5**: Front-Desk Reception Console (`/reception` walk-in entry, VIP bumping, manual overrides).
- **Prompt 6**: Barber Station Dashboard (`/barber/:name` active chair, call next, service pause/break).
- **Prompt 7**: High-Contrast Salon TV Board (`/display` ambient audio chime, SplitText reveals, zero-latency status sync).
- **Prompt 8**: Admin Management & Analytics (`/admin` staff management, service catalog, wait-time heatmaps).
- **Prompt 9**: Bilingual Deep-Dive & Accessibility (Full Gujarati typography verification, screen reader tags, keyboard navigation).
- **Prompt 10**: Production Hardening, Load Testing & Polishing (stress testing, connection recovery, telemetry).

---

## 3. Directory Layout & Module Responsibilities
```text
salon-queue/
├── AGENTS.md                 # Antigravity master engineering specifications & agent rules
├── package.json              # Monorepo runner (`concurrently` scripts: dev, client, server, build)
├── .gitignore                # Node modules, logs, build outputs, environment files
├── docs/                     # Source of truth for product, screens, and business logic
│   ├── 01-brief.md           # Product requirements, personas, SLAs
│   ├── 02-screens.md         # UI/UX specifications for all 7 routes
│   └── 03-flows-rules.md     # Queue state machine, Socket dictionary, wait algorithms
├── server/
│   ├── package.json          # Express, Mongoose, Socket.IO, Cors, Dotenv
│   ├── .env.example          # Server environment contract
│   └── src/
│       ├── index.js          # Express app, HTTP listener, Socket.IO gateway, health check
│       ├── config/db.js      # Graceful MongoDB connection manager
│       ├── models/           # Mongoose schemas (Prompt 2)
│       ├── routes/           # REST endpoints (Prompt 2)
│       ├── services/         # Queue calculation & business logic (Prompt 3)
│       └── sockets/          # Socket.IO connection & room emitters (Prompt 2)
└── client/
    ├── package.json          # React 18, Vite, Tailwind, Framer Motion, Lucide, Axios, Socket.IO-Client
    ├── .env.example          # Client environment contract
    ├── index.html            # Google Fonts (Plus Jakarta Sans, Instrument Serif, Noto Sans Gujarati)
    └── src/
        ├── main.jsx          # React DOM entry
        ├── App.jsx           # Route registry (7 pages) & Framer Motion config
        ├── index.css         # Tailwind directives + Bespoke luxury design tokens
        ├── context/          # LanguageContext (persisted EN/GU toggle)
        ├── i18n/             # Dictionary keys (en.js, gu.js)
        ├── lib/              # Axios (api.js), Socket (socket.js), Motion physics (motion.js)
        ├── components/
        │   ├── ui/           # SplitHeading, TactileCard, LanguageToggle
        │   └── layout/       # AppShell (luxury header, socket status pill, nav)
        └── pages/            # Page shells for all 7 application routes
```

---

## 4. Coding Conventions & Quality Gates
1. **Strict Immutability & Clean State**: No direct mutation of state. Sockets broadcast state change notifications, client either updates optimistic cache or invalidates queries.
2. **Standardized Response Envelope**:
   ```json
   {
     "success": true,
     "data": {},
     "message": "Human readable status"
   }
   ```
3. **Socket Event Naming Scheme**: `domain:action` in lowercase hyphenated format (e.g. `queue:ticket-created`, `queue:ticket-updated`, `barber:status-changed`).
4. **Motion Tokens**: All transitions must utilize presets from `src/lib/motion.js` (`springGentle`, `springSnappy`, `springBouncy`). Avoid raw linear transitions.
5. **Typography & Languages**:
   - English: `font-sans` (`Plus Jakarta Sans`)
   - Editorial accents & hero numbers: `font-serif` (`Instrument Serif`)
   - Gujarati: `font-gujarati` (`Noto Sans Gujarati`) with balanced line-heights.
