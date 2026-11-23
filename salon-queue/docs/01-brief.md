# Product Specification: Salon Queue Management System
**Document ID: DOC-01-BRIEF**  
**Version:** 1.0.0  
**Stack:** MongoDB, Express, React, Node.js, Socket.IO, Tailwind CSS

---

## 1. Executive Summary
The **Salon Queue Management System** is a real-time, bilingual (English & Gujarati) salon operations platform. It eliminates traditional paper tokens and verbal announcements by offering digital walk-in registration, dynamic wait-time calculation, real-time ticket tracking, barber chair control, and an ambient high-contrast TV board.

---

## 2. Problem Statement
Traditional salons and grooming parlors suffer from:
1. **Unpredictable Wait Times**: Customers leave or get anxious without knowing their exact position in queue.
2. **Reception Bottlenecks**: Front-desk staff spend excessive time triaging walk-ins, phone inquiries, and barber availability.
3. **Barber Coordination Inefficiencies**: Barbers lack clear visibility of who is up next for their specific station or skillset.
4. **Language Barriers**: In diverse regions like Gujarat, elderly customers or non-English speakers struggle with English-only digital kiosks.

---

## 3. User Personas & Core Journeys

### Persona A: The Customer (Walk-in or Pre-Arrival)
- **Goal**: Join the queue quickly, select desired services (Haircut, Beard Trim, Facial, etc.), choose a specific barber or "First Available", and monitor wait status from their smartphone.
- **Pain Points**: Long physical waits in crowded waiting areas; language confusion.
- **Needs**: Instant mobile ticket with live count, estimated minutes remaining, Gujarati language toggle, and auditory/visual alerts when called.

### Persona B: The Front-Desk Receptionist
- **Goal**: Rapidly input walk-in clients, reorder or expedite VIP customers, call the next ticket, or mark no-shows.
- **Pain Points**: High customer agitation during peak rush hours.
- **Needs**: High-density desktop/tablet view with rapid search, quick actions, and instant queue re-sorting.

### Persona C: The Barber / Stylist
- **Goal**: Manage their station chair (`/barber/:name`), call the next assigned customer, mark when service starts, and signal completion or breaks.
- **Pain Points**: Disruptions from reception; lack of preparation for upcoming service durations.
- **Needs**: Minimalist touch-optimized station terminal showing current client, service list, notes, and a 1-tap "Next Client" trigger.

### Persona D: The Salon Administrator / Owner
- **Goal**: Review daily queue throughput, average service durations, peak hours, barber productivity, and manage service menus.
- **Needs**: Real-time KPI cards, staff PIN management, service catalog adjustments, and historical operational reporting.

---

## 4. Key Value Propositions
| Feature | Technical Implementation | Value Delivered |
| :--- | :--- | :--- |
| **Real-Time Live Mesh** | Socket.IO bi-directional rooms | Zero-refresh instant updates across all phones, tablets, and TV boards |
| **Bilingual Localization** | `LanguageContext` + native Gujarati translations | Native comfort for Gujarati (`ગુજરાતી`) speaking patrons |
| **Smart Dynamic Wait Estimates** | Cumulative duration algorithm + active chairs | Accurate wait times instead of static guesswork |
| **Ambient TV Lounge Display** | React Bits staggered reveals & high-contrast dark theme | Clear visibility from across the salon waiting lounge |
| **Fault-Tolerant Engine** | Graceful DB fallback & connection health checks | Operational reliability even during intermittent connectivity |
