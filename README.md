# Savings Tracker UI

Production web console for the **ESP32 Personal Savings & Asset Tracker API** (`openapi.yaml`, firmware v1.0.0).

React + Vite + TypeScript · TanStack Query · Framer Motion · hand-built CSS design system · Lucide icons.
Hash-routed SPA, deployable to GitHub Pages with zero server.

---

## Features

| Screen | What it does |
|---|---|
| **Dashboard** | Net worth of active assets, allocation donut by type, largest holdings, device health, upcoming recurring runs, top assets. Animated. |
| **Assets** | Full CRUD. Table on desktop, cards on mobile. Search + type filter. Delete is blocked when an active recurring rule references the asset. |
| **Recurring** | Full CRUD + `process` / `skip` / toggle `auto`. Status chips (SCHEDULED / DUE / OVERDUE / AUTO / INACTIVE) derived exactly per the spec. The form enforces the `target_bank_id` rules (required for MONTHLY-interest sources, forbidden for CUMULATIVE). |
| **Pending actions** | The `/api/recurring/pending` inbox. Process / skip / make-automatic, with an animated result panel showing `bank_credited`, `source_delta` and the advanced dates. Handles `TIME_NOT_SYNCED` (409) gracefully. |
| **Device** | Live `/api/system/status` — Wi-Fi RSSI meter, time-sync, DB health, free-heap gauge, network info. Polls every 15s. |
| **Settings** | Switch between **Demo** and **Live** data, set the device URL, test the connection, light/dark theme. |

Page navigation uses a blur + rise transition; cards stagger in; charts animate their draw.

---

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # -> dist/
npm run preview
```

The app starts in **Demo mode**: a complete in-memory mock of every endpoint (validation, transactions, limits, derived status) seeded with a realistic dataset (~14 assets across all types, 7 rules covering every status). State persists to `localStorage`; reset it from Settings.

---

## Connecting to a real device

Switch to **Live device** in Settings and enter the device base URL
(`http://savings-esp32.local` or `http://<device-ip>`).

Two things stand between a browser and a plain-HTTP ESP32:

1. **Mixed content.** A page served over **HTTPS (GitHub Pages) cannot call an `http://` device** — browsers block it and there is no website-side opt-out. Workarounds:
   - Run this UI **locally over `http://`** (`npm run dev` or `npm run preview`), or serve `dist/` from any local static server.
   - Toggle **Site settings → Insecure content → Allow** for the Pages URL in Chrome (per-user, manual).
   - Put a **TLS reverse proxy** (Caddy/nginx) in front of the ESP32.
   - Serve `dist/` **from the ESP32 itself** — same origin, no mixed content, no CORS.
2. **CORS.** The firmware must send `Access-Control-Allow-Origin` (and allow `GET, POST, PUT, DELETE` + `Content-Type`) or the browser discards the response. The **Test connection** button in Settings reports exactly which of these is failing.

Demo mode needs none of this.

---

## Deploy to GitHub Pages

`.github/workflows/deploy.yml` builds and publishes on every push to `main`.

1. Push this folder as the repository root (or adjust the workflow — see the comment at its top — if it lives under `ui/`).
2. Repo **Settings → Pages → Source: GitHub Actions**.
3. Push to `main`. The site publishes at `https://<user>.github.io/<repo>/`.

`vite.config.ts` uses `base: './'` (relative asset URLs) so it works at any Pages sub-path. Routing is hash-based, so no SPA 404 shim is required.

---

## Project layout

```
src/
  api/          client.ts (live fetch)  ·  mock.ts (demo backend)  ·  hooks.ts (TanStack Query)
  context/      SettingsContext (mode / device URL / theme)
  components/    layout/ (Sidebar, Topbar, Layout+transitions)  ·  ui/ (primitives, Modal, toast)
                charts/ (DonutChart, BarList)  ·  domain.tsx (asset-type + status metadata)
  lib/          format.ts  ·  recurring.ts (status derivation, date advance)
  pages/        Dashboard, Assets, Recurring, Pending, System, Settings  ·  forms/
  types/        api.ts (mirrors openapi.yaml schemas)
  styles/       global.css (tokens/theme)  ·  components.css
```

All types in `src/types/api.ts` mirror `components/schemas` in `openapi.yaml`.
