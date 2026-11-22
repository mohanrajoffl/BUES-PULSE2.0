# BUSPulse — Smart Bus Tracking & Ticketing Platform

**Track. Plan. Book. Travel.**

BUSPulse is an offline-first, multilingual (`English`, `தமிழ்`, `हिन्दी`) public transit tracking, route planning, and digital QR ticketing platform prototyped on the **Salem → Erode (NH-544)** corridor.

## Data Mode & Validity

- `DATA_MODE=DEMO` is active by default for the prototype. Simulated bus movement and prototype checkouts are explicitly labeled **`DEMO DATA`**, **`Demo Live Simulation`**, **`Estimated ETA`**, and **`Demo Payment`**.
- When an authorized real-time GPS feed is connected, switch `DATA_MODE=LIVE` via environment configuration.
- In Offline Mode, fake live GPS is disabled and synchronized schedules/tickets are served from **IndexedDB**.

## Architecture

- **Frontend (`/src`)**: React 19, TypeScript, Tailwind CSS v4, Leaflet + OpenStreetMap, QRCode, `idb` (IndexedDB), `vite-plugin-pwa` Service Worker & Web App Manifest, WebSocket client.
- **Runtime Server (`/server.ts`)**: Express REST API (`/api/*`), WebSocket real-time hub (`/ws`), `crypto.scryptSync` password hashing, HMAC-SHA256 bearer auth, and Salem → Erode NH-544 simulator.
- **Java Spring Boot Blueprint (`/backend`)**: Spring Boot 3.3, Spring Security, JPA entities, STOMP WebSocket configuration, and `EtaAndTrackingService`.
- **Relational Schema (`/database/schema/schema.sql`)**: PostgreSQL/MySQL DDL covering `users`, `drivers`, `buses`, `routes`, `bus_stops`, `schedules`, `live_locations`, `tickets`, `passengers`, `notifications`, `favorite_routes`, and `favorite_buses`.

## Local Execution

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.
