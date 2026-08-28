# Shopusedcarz

A used car listings website: one inventory page with all vehicles as cards
(photo, price, mileage, description), a detail page per vehicle with a full
photo gallery and an inquiry form, an admin panel to add/edit/delete
listings yourself, and a text-message alert (via Twilio) sent to your phone
the moment someone submits an inquiry.

Built with Next.js (App Router), TypeScript, and Tailwind CSS. Vehicle data
lives in a plain JSON file — no database to set up.

## Quick start

```bash
npm install
cp .env.example .env.local   # then fill in the values, see below
npm run dev
```

Visit `http://localhost:3000` for the site and `http://localhost:3000/admin`
for the dealer admin panel.

## Environment variables

Copy `.env.example` to `.env.local` and fill in:

| Variable | What it's for |
|---|---|
| `ADMIN_PASSWORD` | Password to log in at `/admin`. Required for the admin panel to work at all. |
| `SESSION_SECRET` | Random string used to sign the admin login session cookie. Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` | From your [Twilio Console](https://console.twilio.com). |
| `TWILIO_FROM_NUMBER` | The Twilio phone number you send from (E.164 format, e.g. `+15551234567`). |
| `OWNER_PHONE_NUMBER` | The phone that receives the text alert for every inquiry. Defaults to the Shopusedcarz contact number, `+14698813778`. |

**Twilio setup, step by step:**
1. Create an account at [twilio.com/try-twilio](https://www.twilio.com/try-twilio) (free trial works for testing).
2. Buy or activate a phone number with SMS capability in the Twilio Console.
3. Copy your Account SID and Auth Token from the Console dashboard into `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN`.
4. Set `TWILIO_FROM_NUMBER` to the number you just bought.
5. Set `OWNER_PHONE_NUMBER` to the cell phone that should get the text.

If Twilio isn't configured yet, the inquiry form still works and every lead
is still saved (visible under **Leads** in the admin panel) — it just skips
sending the text and flags the lead as "SMS Not Set Up" so you know to
finish setup.

## Managing listings

**Easiest — the admin panel:** go to `/admin`, log in with `ADMIN_PASSWORD`,
and use **Add Vehicle** / **Edit** / **Delete**. Photos upload right from
the form; a vehicle with no photos yet automatically shows a clean themed
placeholder instead of a broken image, so you can publish a listing before
you have pictures and add them later.

**Or by hand:** vehicle data lives in [`data/vehicles.json`](data/vehicles.json) —
a plain array of vehicle objects. You can edit it directly (locally, or on
your server) if you'd rather bulk-edit in a text editor. Photos referenced
there live under `public/uploads/`.

Every submitted inquiry is also logged in `data/inquiries.json` and visible
under **Leads** in the admin panel, independent of whether the SMS send
succeeded — so no lead is ever lost to a Twilio hiccup.

## Adding your real inventory

The site ships with 10 sample listings (clearly generic placeholder cars,
trucks, SUVs, and a van) so the whole thing works out of the box. Swap in
your real inventory either through **Add Vehicle** in `/admin`, or by
pasting your vehicle list to Claude in this session to have it loaded in
bulk — either way works with the same data file.

## Deployment

This app needs a **persistent Node.js server** — not a static host — both
because Twilio's SDK and the admin auth run server-side with secret keys,
and because vehicle data and uploaded photos are written to disk at
runtime. **Render** or **Railway** are the easiest fits: connect the repo,
set the environment variables above, and deploy with:

```bash
npm run build
npm run start
```

**Important — persisting your data across deploys:** every add/edit/delete
you make through the live admin panel writes to that server's disk
(`data/vehicles.json`, `data/inquiries.json`, `public/uploads/`). On most
hosts, a fresh deploy rebuilds the container from git, which would reset
those files back to whatever's committed. To keep your live changes across
deploys, attach a **persistent disk/volume** (Render: "Persistent Disk";
Railway: "Volumes") mounted over the `data/` and `public/uploads/`
directories. Without one, back up `data/vehicles.json` periodically, or
treat the admin panel as the way you *seed* data and commit the resulting
file back to git yourself.

**Avoid Vercel/Netlify** for this project as-is — their serverless
functions have a read-only filesystem at runtime, so admin edits and photo
uploads wouldn't persist. If you'd rather use one of those, swap the
storage layer in `lib/vehicles.ts`, `lib/inquiries.ts`, and `lib/uploads.ts`
for a hosted database (Postgres, Turso/SQLite, etc.) — every place the app
touches storage goes through those three files.

## Project structure

```
app/
  page.tsx                    Home page — inventory grid
  vehicles/[id]/page.tsx      Vehicle detail page + inquiry form
  admin/                      Admin panel (password-protected)
  api/inquiry/route.ts        Inquiry form submission → Twilio SMS
  api/admin/                  Admin login + vehicle CRUD endpoints
components/                   UI components (cards, gallery, forms, admin UI)
lib/
  vehicles.ts, inquiries.ts   Data access (reads/writes the JSON files)
  uploads.ts                  Photo upload handling
  twilio.ts                   SMS sending
  auth.ts                     Admin session/password handling
data/
  vehicles.json                The vehicle inventory — the "simple file" store
  inquiries.json               Log of every inquiry submitted
public/
  uploads/                     Vehicle photos uploaded via the admin panel
  placeholders/                Themed placeholder art used when a listing has no photos yet
```

## Vehicle history reports (Carfax / AutoCheck)

Every vehicle detail page shows **Carfax Report** / **AutoCheck Report**
buttons, built from the vehicle's VIN — they only appear once a VIN is on
file (via `/admin` or by editing `data/vehicles.json`), so a listing never
links to a bogus report. The link formats live in
[`lib/site-config.ts`](lib/site-config.ts) as `CARFAX_URL_TEMPLATE` /
`AUTOCHECK_URL_TEMPLATE`. Those are the general public report-lookup URLs
for each service — if your dealership has a Carfax or AutoCheck dealer
program, you may have been issued a different link format (sometimes with a
dealer/account ID baked in); swap those two lines for that pattern if so.

## Payment estimates & smart badges

Cards and detail pages show a rough **"Est. $XXX/mo"** payment line —
clearly labeled as an estimate, using the APR/term/down-payment assumptions
in `lib/site-config.ts` (`FINANCE_APR_PERCENT`, `FINANCE_TERM_MONTHS`,
`FINANCE_DOWN_PAYMENT_RATIO`). Tune those to match your actual typical
financing. Listings can also pick up small **New Arrival / Great Price /
Low Mileage** badges — these are computed live from the real numbers
already in your inventory (`lib/badges.ts`), never a fabricated claim, so
they stay accurate as your real listings replace the sample data.

## Contact info shown on the site

Phone `(469) 881-3778` and email `aung@texascarone.com` are centralized in
[`lib/site-config.ts`](lib/site-config.ts) — edit that one file to change
either everywhere they appear (header, footer, vehicle detail pages).

## Known limitation: `npm run lint`

`npm run lint` currently fails with an upstream compatibility error between
`eslint-config-next@16.3.3`'s flat-config bridge and the very recently
released ESLint 10 / TypeScript 7 toolchain — not an issue in this app's
own code. `npm run build` performs full strict TypeScript type-checking on
every file and passes cleanly, which is the meaningful correctness gate;
treat that as the source of truth until upstream compatibility catches up.
