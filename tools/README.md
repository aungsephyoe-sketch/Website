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

# Free local generation with ComfyUI

`comfy_generate.py` sends a text-to-image job to a **ComfyUI** server running
on your own computer and saves the results into `assets/images/`. There is no
API key and no per-image cost; it uses your GPU. It needs Python 3 only (no
pip packages).

## One-time setup

1. **Install ComfyUI.** Easiest: the ComfyUI Desktop app from
   <https://www.comfy.org/download> (Windows with an NVIDIA GPU, or a Mac with
   Apple Silicon). On Linux, clone <https://github.com/comfyanonymous/ComfyUI>
   and follow its README.
2. **Download one model** into `ComfyUI/models/checkpoints/`:
   - **SDXL** (≈8 GB VRAM or a 16 GB+ Mac): `sd_xl_base_1.0.safetensors` from
     <https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0>
   - **FLUX.1 [schnell]** (≈12 GB+ VRAM, better text and hands, very fast):
     `flux1-schnell-fp8.safetensors` from
     <https://huggingface.co/Comfy-Org/flux1-schnell>
3. **Start ComfyUI.** The Desktop app listens on port **8000**; a manual install
   listens on **8188** (the script's default). Set this once for the Desktop app:
   `export COMFY_URL=http://127.0.0.1:8000`
4. Check it works: `python3 tools/comfy_generate.py --list-models`

## Usage

```bash
# SDXL (default preset)
python3 tools/comfy_generate.py "black oversized tee with gold greek helmet print, flat lay on dark marble, studio lighting" \
    --name product-new-tee --width 1024 --height 1280

# FLUX schnell, 4 variations
python3 tools/comfy_generate.py "athlete in a black compression shirt on a beach at golden hour" \
    --preset flux-schnell -n 4
```

Useful flags: `--seed` (repeat a result), `--negative`, `--steps`, `--cfg`,
`--checkpoint` (any other model file you've installed), `--out`.

## Using it with Claude Code

Run Claude Code **on the same computer as ComfyUI** (a cloud session can't
reach your machine's `localhost`). Then just ask, e.g. *"make a lifestyle
photo of the Man of God tee for the hero section"*; Claude writes the prompt,
runs this script, looks at the image, and refines it if needed.
