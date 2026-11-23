# Screens & UI/UX Specification: Salon Queue Management System
**Document ID: DOC-02-SCREENS**  
**Version:** 1.0.0

---

## 1. Design Language & Visual Hierarchy
- **Visual Aesthetic**: Modern Luxury Salon (Warm Obsidian `#0D0E12`, Polished Slate `#161922`, Champagne Amber `#E59B58`, Pure Light Text `#F9FAFB`).
- **Typography**:
  - Primary UI & Data: `Plus Jakarta Sans`
  - Editorial Accents & Hero Numbers: `Instrument Serif`
  - Authentic Gujarati Typography: `Noto Sans Gujarati`
- **Motion Primitives**: Apple OS-inspired spring physics (`framer-motion`) with dampened settles and subtle elevation on hover/press.

---

## 2. Route & Screen Breakdown

### Screen 1: Home Portal (`/`)
- **Route**: `/`
- **Component**: `src/pages/HomePage.jsx`
- **Purpose**: Welcoming brand landing page with one-tap entry into customer self-service or staff portals.
- **Key Elements**:
  - Hero banner with `SplitHeading` ("Precision Grooming, Zero Waiting").
  - Quick status lookup input (enter Ticket ID / Phone Number).
  - Primary Action: "Join the Queue" (`/join`).
  - Secondary Action Cards: Reception Desk (`/reception`), Barber Station (`/barber/:name`), TV Display (`/display`), Admin Dashboard (`/admin`).
  - Real-time connection badge (shows backend and socket availability).

### Screen 2: Join Queue Flow (`/join`)
- **Route**: `/join`
- **Component**: `src/pages/JoinQueuePage.jsx`
- **Purpose**: Mobile-optimized kiosk/phone check-in.
- **Key Elements**:
  - Step 1: Customer Details (Name, Phone Number, Party Size).
  - Step 2: Service Selection (Haircut, Beard Trim, Hair Wash, Head Massage, Facial, Combo).
  - Step 3: Barber Preference ("Any Available" or choose preferred barber).
  - Dynamic estimated wait time preview before submission.
  - Bilingual helper text in English and Gujarati.
  - On submit: generates unique ticket (e.g. `T-104`) and redirects to `/status/:id`.

### Screen 3: Live Customer Ticket Tracker (`/status/:id`)
- **Route**: `/status/:id`
- **Component**: `src/pages/MyStatusPage.jsx`
- **Purpose**: Real-time personal ticket monitor for waiting patrons.
- **Key Elements**:
  - Prominent Ticket ID badge and status indicator (`WAITING`, `CALLED`, `IN_SERVICE`, `COMPLETED`).
  - Live Queue Position (e.g., "3 people ahead of you").
  - Dynamic Estimated Wait Time countdown in minutes.
  - Assigned Barber station info (once assigned).
  - Interactive Actions: "Delay 10 Mins" / "Cancel Ticket".
  - Audio and visual full-screen pulse when status switches to `CALLED`.

### Screen 4: Front-Desk Reception Console (`/reception`)
- **Route**: `/reception`
- **Component**: `src/pages/ReceptionPage.jsx`
- **Purpose**: Fast-action operational cockpit for salon host / receptionist.
- **Key Elements**:
  - Protected with STAFF_PIN quick modal.
  - Split View:
    - Left Column: Active Queue table with re-ordering, VIP badge toggle, mark no-show, manual customer call.
    - Right Column: Quick Walk-In entry form (instant 10-second client check-in) & Barber Chair status grid.
  - Real-time sync across all terminals via Socket.IO.

### Screen 5: Barber Chair Station (`/barber/:name`)
- **Route**: `/barber/:name`
- **Component**: `src/pages/BarberPage.jsx`
- **Purpose**: Touch-screen interface mounted on each barber's mirror/tablet.
- **Key Elements**:
  - Current Chair Status: "Currently Serving" ticket details (Client name, requested services, elapsed time).
  - "Complete Service" button -> marks ticket completed, frees chair.
  - "Call Next Customer" button -> pulls the next waiting customer matching barber preference or general pool.
  - Barber availability toggle: "Active / At Chair" vs. "On Break / Stepped Away".

### Screen 6: High-Contrast TV Display Board (`/display`)
- **Route**: `/display`
- **Component**: `src/pages/DisplayTvPage.jsx`
- **Purpose**: Wall-mounted lounge TV display legible from 30+ feet away.
- **Key Elements**:
  - Ultra-high contrast dark theme with extra-large typography.
  - "Now Serving" Section: Large cards showing Ticket ID, Customer First Name, Station/Barber Name.
  - "Up Next" Section: Staggered list of next 5-8 tickets with estimated wait times.
  - Ambient bell/chime sound trigger on `queue:ticket-called` event.
  - Bilingual Gujarati ticker: "તમારો નંબર આવે ત્યારે તૈયાર રહો" (Please be ready when your token is called).

### Screen 7: Salon Admin & Analytics (`/admin`)
- **Route**: `/admin`
- **Component**: `src/pages/AdminPage.jsx`
- **Purpose**: Management controls and business metrics for salon owners.
- **Key Elements**:
  - Protected by STAFF_PIN authorization.
  - KPI Stat Cards: Total Customers Today, Average Wait Time, Completed Services, Active Barbers.
  - Service Catalog Manager: Add/edit services, pricing, estimated duration (mins).
  - Staff Roster Manager: Add/edit barbers, status, chairs.
  - Queue reset / daily rollover controls.
