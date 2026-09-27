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

---

# Free image generation with ComfyUI

Makes images on your own computer, for free. Claude does the typing; you
just ask for pictures. `comfy_generate.py` is the script Claude runs.

## Setup (one time, about 30 minutes)

**Step 1: Install ComfyUI.**
Go to <https://www.comfy.org/download>, download the app for your computer,
and install it like any other app. Accept the default settings.

**Step 2: Get a model (the image "brain").**
In ComfyUI, click **Templates** and pick **SDXL**. When it says models are
missing, click **Download** and wait for it to finish. It's a big download
(several GB).

**Step 3: Make a test picture.**
Still in ComfyUI, click **Run**. If an image appears, ComfyUI works. Leave
the app open.

**Step 4: Install Claude Code.**
Open **Terminal** (Mac) or **PowerShell** (Windows), paste one line, and
press Enter:

- Mac: `curl -fsSL https://claude.ai/install.sh | bash`
- Windows: `irm https://claude.ai/install.ps1 | iex`

Close the window and open a new one.

**Step 5: Start Claude Code.**
In the new window, type `claude` and press Enter. Log in with your Claude
account when it asks.

**Step 6: Let Claude set up the website.**
Type this to Claude:

> Download my GitHub repo aungsephyoe-sketch/Website, switch to the branch
> claude/eager-bell-dindwd, and check that tools/comfy_generate.py can
> connect to ComfyUI.

## Every time you want images

1. Open the ComfyUI app.
2. Open Terminal or PowerShell, type `claude`, and press Enter.
3. Ask for what you want, for example:
   > Make a photo of a black t-shirt with a gold Greek helmet print on dark
   > marble. Make 4 versions.

The images are saved in `assets/images/`. Tell Claude which one you like and
where it should go on the site.

## If something goes wrong

- **"ComfyUI isn't running"**: open the ComfyUI app and wait for it to load.
- **Very slow, or "out of memory"**: ask Claude to "make smaller images".
- Anything else: paste the error to Claude and ask it to fix it.
