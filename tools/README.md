# AI Photo Generator (internal tool)

`photo-generator.html` is a self-contained, client-side page for generating new
Ares Pantheon product photos with OpenAI's image API (the same "ChatGPT-style"
image generation used for the existing product shots).

Open it directly at `/tools/photo-generator.html` — it is intentionally not
linked from the storefront nav, and is excluded from search engines via
`robots.txt` and an on-page `noindex` tag.

## Why it works this way

This site is static (GitHub Pages, no server), so there is no safe place to
store a shared secret API key. Instead:

- You paste **your own** OpenAI API key into the page.
- The key is optionally saved to **your browser's `localStorage`** only, if
  you tick "Remember this key in this browser".
- The browser calls `api.openai.com` **directly** — the key never touches
  this repo, a server, or any third party.
- Every generation is billed to your own OpenAI account.

Do not commit an API key to this repo, and don't share this page's URL
publicly.

## What it does

1. Builds a prompt from an editable "brand style guide" (pre-filled from the
   existing Phalanx Tee photos) plus a shot-type (front / back / detail /
   lifestyle / flat lay) plus a description of the new garment.
2. Optionally sends the two existing product photos (or your own uploads) as
   visual reference via OpenAI's image-edit endpoint, for closer visual
   consistency with the current catalog.
3. Calls OpenAI's Images API (`gpt-image-1` by default; `dall-e-3`/`dall-e-2`
   also supported) and renders the results.
4. Lets you download a result and copy a ready-to-paste `<img>` tag.

## Publishing a generated photo

1. Download the photo you want to keep.
2. Move it into `assets/images/` using the suggested filename.
3. Paste the copied `<img>` tag (or just the path) into the right product
   block in `index.html`, and add the file to that product's `data-images`
   list so it shows up in the modal gallery too.
4. Commit and push as usual.
