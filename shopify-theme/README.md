# Ares Pantheon — Shopify Theme

This is a full Online Store 2.0 Shopify theme, converted from the static
`ares-pantheon.com` site (HTML/CSS/JS) into Liquid templates, sections, and
a real Shopify cart/checkout integration.

## Install

1. Shopify Admin → **Online Store → Themes → Add theme → Upload zip file**.
2. Upload this folder as a zip (the zip must contain `layout/`, `templates/`,
   `sections/`, `snippets/`, `assets/`, `config/`, `locales/` at its root —
   not nested inside an extra folder).
3. Click **Publish** when you're ready to go live, or preview it first.

## Load the 4 original products

The theme ships with **no products** — products are store data, not theme
code, so they can't be baked into the zip. `products_import.csv` at the root
of this package recreates the original 4 tees (Ares Compression Tee,
Protected by God, Ares Pantheon Oversized Tee, Man of God) with their
Size (S–XL–XXL) and Color options, descriptions, and images pulled from the
GitHub repo.

**Import order matters:**

1. **Settings → Custom data → Products → Add definition.**
   Create a metafield named `details`, namespace/key `custom.details`,
   type **List of single-line text**. This powers the bullet-point spec list
   in the quick-view modal and product page. (Skip this and the CSV import
   still works — you'll just see product descriptions without the bullets.)
2. **Products → Import**, upload `products_import.csv`. Shopify fetches the
   image URLs from GitHub once during import and copies them into your own
   CDN — there's no ongoing dependency on GitHub afterwards.
3. Products import as **Active**. Adjust inventory quantities (seeded at 50
   per variant) and prices/taxes as needed.

## Menus

- **Main menu** (handle `main-menu`) drives the header nav — Shopify creates
  this automatically. Point "Collections" at your products collection,
  "World of Ares" at a page, etc.
- **Footer**: the footer's 4 columns are theme-editor blocks, each bound to
  a menu you choose. The first ("Help") defaults to the auto-created
  `footer` menu. Create additional menus (e.g. "Collections", "The House",
  "Follow Us") in **Content → Menus** and assign them to the other 3 columns
  in the theme editor.

## Checkout — important change from the static site

The static site's `checkout.html` was a mock UI: a plain HTML form that
collected name/address/**card number/CVV** and just displayed a fake
"Order Confirmed" screen — nothing was ever processed or charged, and
nothing validated the payment fields. That's fine as a design mockup, but
it would be actively unsafe to ship as-is: it looks like a real payment
form while offering none of the PCI-compliance, fraud checks, tax/shipping
calculation, or fraud liability protection a real payment form needs.

This theme instead hands off to **Shopify's own hosted checkout** (the
"Proceed to Checkout" button on the cart page posts to `/cart` with Shopify's
standard `name="checkout"` submit), which is secure, PCI-compliant, and
handles real payments, tax and shipping rates, discounts, etc. out of the
box. No custom checkout page is included — Shopify Plus stores can further
customize checkout via Checkout Extensibility, which is out of scope here.

## Cart summary "Shipping" line

The static cart page hardcoded "Shipping: Free". This theme shows
**"Calculated at checkout"** instead, since actual shipping cost depends on
the rates you configure in **Settings → Shipping and delivery** — showing
"Free" unconditionally would be inaccurate unless you've actually set up a
free-shipping rate. The `Shipping note` theme setting (Theme editor →
Theme settings → Cart & shipping) controls the marketing copy shown
elsewhere (quick-view modal, product page, cart footnote) — keep it in sync
with your real shipping setup.

## Theme editor settings

- **Colors**: the black/white/off-white/cream/gray/brown/gold palette is
  editable under Theme settings → Colors (maps to the site's CSS custom
  properties).
- **Logo / favicon**: optional image uploads; falls back to the "Ares
  Pantheon" text wordmark if no logo is set.
- **Social media**: Instagram/TikTok/YouTube/X URLs feed the site's
  `Organization` structured data (`sameAs`) for SEO — they don't render a
  visible icon row, since the original design listed social links as plain
  text in the footer's "Follow Us" column (a menu, see above).
- **Homepage sections**: hero, editorial duo, campaign banner, featured
  collection (with filter-button blocks), community editorial, craft
  features, world banner, newsletter — all editable/reorderable/removable
  in the theme editor, matching the original one-page layout section by
  section.

## Product grid filters

The "All / Compression / Oversized / Long Sleeve" buttons filter by product
**tag** (`data-filter-tag`), client-side. The 4 seed products are tagged
`Compression`, `Performance`, or `Oversized` based on their own name/copy —
none of them are tagged `Long Sleeve`, because nothing in the original site
identified a long-sleeve product; that filter button is left in place as a
ready-made example for when you add one. Add/edit/remove filter buttons and
their matching tags in the "Featured collection" section's blocks.

## What's genuinely new vs. the static site

- Real Shopify cart (`/cart/add.js`, `/cart/change.js`) replacing the
  localStorage-based cart.
- Real product/variant data (price, size, color, availability) replacing
  hardcoded `data-*` attributes — the quick-view modal and product page both
  fetch `/products/{handle}.js` and build the size/color pickers from actual
  variants.
- A real product page (`templates/product.json`) for SEO/direct links and
  no-JS fallback, in addition to the original's quick-view modal.
- A collection page, search page, generic page template (for policies/About),
  and 404 page — none of which existed in the single-page static site.
- Shopify's native customer newsletter signup and search, instead of the
  original's inert `onsubmit="event.preventDefault()"` form and dead search
  icon.
