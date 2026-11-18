# TruckWise architecture & roadmap

## Today: client-only (Phase 1–2 complete, parts of 3–4)

```
index.html
js/
  data.js        reference data: classes, configs, 37 maintenance items, known issues, checkups, DVIR, ZIP→region, plans
  engine.js      pure logic: VIN, schedule/status, forecast, costs, finance, notifications (unit-tested)
  store.js       persistence: localStorage (data) + IndexedDB (files)
  api.js         NHTSA vPIC + Recalls; optional Claude assistant
  assistant.js   built-in answers + context builder for Claude
  ui.js          escaping, markdown, icons, modals, delegated action registry
  modals.js      record / mileage / postpone
  app.js         shell, router, onboarding, dashboard, trucks, reminders, settings
  views/         maintenance, costs, assistant, tools (inspections, recalls, shops, documents, reports)
```

`engine.js` never touches the DOM or storage, so a backend can reuse it (or port it) unchanged. `store.js` is the only module that persists data. To add cloud sync, swap it for an API-backed implementation with the same interface.

## Target: hosted platform

```
Browser / iOS / Android ──HTTPS──▶ API (Node/TypeScript)
                                    ├─ Auth (email + OAuth, MFA for fleet admins)
                                    ├─ Postgres (row-level security per account/fleet)
                                    ├─ Object storage (invoices, photos) – signed URLs, encrypted at rest
                                    ├─ Job queue: reminders, recall checks, price refresh
                                    ├─ Provider adapters (keys held server-side only)
                                    │    VIN: NHTSA vPIC + commercial heavy-truck decoder
                                    │    Maintenance: licensed OEM schedule data
                                    │    Labor/parts pricing; fuel prices (ZIP + route)
                                    │    Claude (Anthropic API) for the assistant
                                    ├─ Notifications: push (APNs/FCM), email, SMS (opt-in)
                                    └─ Billing (Stripe): Free / Pro / Fleet
Admin console (separate app, SSO + role checks)
```

### Core tables

`accounts`, `users`, `memberships(user, account, role)`, `trucks`, `mileage_log`, `service_records`, `record_items`, `files`, `inspections`, `inspection_results`, `warranties`, `recalls`, `truck_dates`, `interval_overrides`, `shops`, `notifications`, `notification_prefs`, `subscriptions`.

Reference data (versioned and auditable): `vehicle_specs`, `maintenance_items`, `maintenance_intervals(spec_id, item_id, miles, months, hours, source, source_date)`, `price_points(region, item, parts_low/high, labor_hours, source, updated_at)`, `fuel_prices(zip|station, product, price, observed_at, source)`, `known_issues`.

Every interval and price row stores a **source** and an **updated_at**. The UI shows both, as the product spec requires.

### Roles (Fleet plan)

| Role | Can |
|---|---|
| Owner | Everything, billing, delete account |
| Manager | All trucks, records, costs, reports, invite drivers |
| Mechanic | Assigned trucks: records, inspections, files; no financials |
| Driver | Assigned trucks: mileage, inspections, view schedule |

These permissions are enforced in the API and in Postgres RLS, never only in the UI.

### Admin console

User and account management, vehicle spec and interval editor (with versioning and source fields), price table imports, data-provider health and API usage, AI assistant review (sampled conversations, ratings), subscriptions, error monitoring (Sentry), support inbox.

### Security

TLS everywhere. Encryption at rest for the database and object storage. No provider or AI keys in the browser. The server proxies all calls and applies per-user rate limits. Daily backups with point-in-time recovery. Audit log for admin actions. Least-privilege service roles.

### AI assistant (hosted)

The server builds the same context `assistant.js` builds today (truck profile, schedule, records, forecast) and calls Claude with streaming and server-side refusal fallback. Answers are logged for review in the admin console. The system prompt keeps the safety rules: advise stopping safely for brakes, steering, tires and overheating, and never present a diagnosis as confirmed.

## Phase status

| Phase | Item | Status |
|---|---|---|
| 1 | Responsive site, VIN decoder, Class 1–8, profiles, mileage, schedules, history, dashboard | Done (client-only; accounts pending) |
| 2 | ZIP-based estimates, ownership/fuel/CPM calculators, repair estimates, savings forecast | Done (fuel prices are reference values until a provider is connected) |
| 3 | AI assistant, predictive estimates, vehicle-specific warnings, recalls, warranty | Done (assistant: built-in + bring-your-own Claude key) |
| 4 | Fleet dashboard, PDF reports, reminders | Done (in-app + browser notifications) |
| 4 | iOS/Android, push/email/SMS, shop integrations, subscriptions, roles, admin | Needs backend |
