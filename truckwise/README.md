# TruckWise

Truck ownership, maintenance and cost management for Class 1–8 commercial trucks: pickups through Class 8 tractors.

**Know your truck. Plan your maintenance. Control your costs.**

TruckWise is a static web app (HTML + vanilla JS modules, no build step). Open `truckwise/index.html` through any web server. GitHub Pages works, and so does `python3 -m http.server`. It won't run from `file://` because ES modules need HTTP.

## What works today

| Area | Status |
|---|---|
| **Onboarding** | Welcome → VIN → confirm details → mileage → ZIP → driving habits → maintenance profile → dashboard. Every optional step can be skipped. |
| **VIN decoding** | Uses the live NHTSA vPIC API. Checks the check digit and model year locally. Gets GVWR class, engine, fuel, drivetrain and brakes. When the VIN doesn't give a field, the app asks the user to confirm it instead of guessing. |
| **Class 1–8 + configurations** | All 8 GVWR classes. 39 body and commercial configurations, and a truck can have more than one. |
| **Maintenance schedule** | 37 maintenance items in 7 systems. Each item is filtered by the truck's profile (class + fuel), duty cycle (highway, regional or severe), configuration (tractor, reefer), emissions era, brakes and drivetrain. Each item shows why it matters, what happens if ignored, parts, cost (parts + labor at the regional rate), urgency, and whether it's required or recommended. Statuses are green, yellow, orange, red, or gray when there's no record. Users can mark an item completed, inspected OK or postponed, and can override intervals per truck. |
| **History** | Full service records: date, mileage, items, shop, parts, parts and labor costs, total, warranty, notes, next-service override. Invoices, photos and PDFs are stored in IndexedDB. Adding a record or updating mileage recalculates the schedule. |
| **Forecasts** | 6, 12 or 24-month maintenance forecast with cost ranges and a monthly savings target. Repair risk indicators cover common engines (Detroit, Cummins X15/ISX, PACCAR, Volvo/Mack, Navistar, Power Stroke, Ram Cummins, Duramax, Ford gas V8s) plus general wear items. They are presented as risk windows, never as predictions. |
| **Checkups** | Inspection guide based on mileage. Each check has what to inspect, warning signs, what happens if ignored, cost, and a truck diagram showing where to look. |
| **Costs** | Monthly cost of ownership: payment (entered or calculated), insurance, fuel, maintenance and tire reserves, permits, tolls, DEF and other costs. Shows cost per mile, per engine hour and per year. Compares 500 to 10,000+ miles a month. Any value the user didn't enter is labeled **est.** |
| **Calculators** | Loan payment and total interest, payoff with extra payments, cost per mile and per hour, break-even and profitability, fuel use and the value of +0.5 MPG, maintenance savings. |
| **Trip & resale** | Trip calculator with route legs (each leg can have its own fuel price), depreciation-based resale estimate, repair-quote comparison. |
| **Dashboard** | Truck profile, status, alerts, health by system (shown only where records exist), the 7 widgets from the spec, timeline, recent records, and the **Add Maintenance Record** and **Update Mileage** buttons. |
| **Fleet** | Multiple trucks, a fleet table with status filter and sorting, fleet totals, and a fleet PDF summary. |
| **Reminders** | Service due or overdue, registration, insurance, inspection and permit dates, warranties ending, recalls. Users set how many miles ahead to be reminded. Browser notifications are optional. |
| **Inspections** | Pre-trip, post-trip and periodic checklists with pass / needs attention, comments, photos, typed signature and a PDF report. Includes 49 CFR 396 references. |
| **Recalls & warranty** | NHTSA recalls by year, make and model (checked weekly); users can mark a recall resolved. Warranty tracking by date or mileage. |
| **Shops & documents** | Map search by need and ZIP, saved shops with phone and labor rate, and document storage. |
| **Assistant** | A built-in assistant answers common questions from the truck's own data, offline. Users can connect Claude (`claude-opus-5-5`, streamed) with their own API key for open-ended questions and photo analysis. Safety-critical symptoms always tell the driver to stop safely. |
| **Reports** | Vehicle report (good for resale), fleet summary and inspection reports. They open in the print dialog, where the user can save them as PDF. |
| **UI** | Light and dark themes, responsive layout (sidebar on desktop, bottom tabs on mobile), large touch targets, keyboard and screen-reader basics, reduced-motion support. |

## Honest limits of this version

- **Data is stored per browser** (localStorage + IndexedDB). There are no accounts and no sync yet. Users should use **Settings → Export backup**.
- **Maintenance intervals and costs are typical values, not OEM specifications.** Every interval can be overridden, and the UI says so. For OEM schedules, a licensed data provider is needed (see `docs/ARCHITECTURE.md`).
- **Fuel prices**, in priority order: the user's own pump price; live **EIA weekly** regional averages when a free EIA API key is added in Settings; otherwise **state-average reference prices** for the truck's ZIP code (dated). Diesel trucks always use diesel prices, and a Class 6+ truck with no fuel type is treated as diesel. Station-level and along-the-route prices still need a commercial provider.
- **Admin dashboard, subscriptions, team permissions, email/SMS** all need the backend described in `docs/ARCHITECTURE.md`.
- The Claude API key (optional) is stored only in the user's browser. In the hosted version, AI calls go through the server.

## Tests

```bash
cd truckwise && npm test
```

The tests cover VIN validation and decoding, GVWR → class, fuel formula (5,000 mi ÷ 7 MPG × $3.75 = $2,678.57), loan math, ZIP → region, schedule statuses, duty-cycle and override intervals, postponement, forecasts, ownership, known issues and notifications.
