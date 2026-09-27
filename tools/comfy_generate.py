#!/usr/bin/env python3
"""Generate images with a local ComfyUI server (free, runs on your own GPU).

Sends a text-to-image workflow to ComfyUI's HTTP API, waits for it to
finish, and saves the results into assets/images/. Standard library only,
so there is nothing to pip install.

Examples:
    python3 tools/comfy_generate.py --list-models
    python3 tools/comfy_generate.py "black oversized tee on a marble plinth, studio light" \
        --name product-new-tee --width 1024 --height 1280
    python3 tools/comfy_generate.py "spartan helmet on a beach at sunset" --preset flux-schnell -n 4

ComfyUI must be running first. The script finds it on its usual ports
(8000 for the Desktop app, 8188 for a manual install); pass --url or set
COMFY_URL to use a different address.
"""

import argparse
import json
import os
import random
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_OUT_DIR = os.path.join(REPO_ROOT, "assets", "images")

# Each preset is tuned for the model it names. The checkpoint file must be in
# ComfyUI/models/checkpoints/ (override the filename with --checkpoint).
PRESETS = {
    "sdxl": {
        "checkpoint": "sd_xl_base_1.0.safetensors",
        "steps": 30,
        "cfg": 6.5,
        "sampler": "dpmpp_2m",
        "scheduler": "karras",
        "latent": "EmptyLatentImage",
        "negative": "blurry, low quality, deformed, extra fingers, watermark, text, logo",
    },
    "flux-schnell": {
        # The all-in-one fp8 build from Comfy-Org loads as a normal checkpoint.
        "checkpoint": "flux1-schnell-fp8.safetensors",
        "steps": 4,
        "cfg": 1.0,
        "sampler": "euler",
        "scheduler": "simple",
        "latent": "EmptySD3LatentImage",
        "negative": "",  # FLUX ignores the negative prompt at cfg 1
    },
}


def build_workflow(prompt, negative, preset, checkpoint, width, height, batch, seed, steps, cfg):
    """Return a ComfyUI API-format graph for a basic text-to-image run."""
    return {
        "1": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": checkpoint}},
        "2": {"class_type": "CLIPTextEncode", "inputs": {"text": prompt, "clip": ["1", 1]}},
        "3": {"class_type": "CLIPTextEncode", "inputs": {"text": negative, "clip": ["1", 1]}},
        "4": {
            "class_type": preset["latent"],
            "inputs": {"width": width, "height": height, "batch_size": batch},
        },
        "5": {
            "class_type": "KSampler",
            "inputs": {
                "model": ["1", 0],
                "positive": ["2", 0],
                "negative": ["3", 0],
                "latent_image": ["4", 0],
                "seed": seed,
                "steps": steps,
                "cfg": cfg,
                "sampler_name": preset["sampler"],
                "scheduler": preset["scheduler"],
                "denoise": 1.0,
            },
        },
        "6": {"class_type": "VAEDecode", "inputs": {"samples": ["5", 0], "vae": ["1", 2]}},
        "7": {"class_type": "SaveImage", "inputs": {"images": ["6", 0], "filename_prefix": "claude"}},
    }


def api(base_url, path, payload=None, raw=False):
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(
        base_url.rstrip("/") + path,
        data=data,
        headers={"Content-Type": "application/json"} if data else {},
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        body = resp.read()
    return body if raw else json.loads(body)


def list_models(base_url):
    info = api(base_url, "/object_info/CheckpointLoaderSimple")
    names = info["CheckpointLoaderSimple"]["input"]["required"]["ckpt_name"][0]
    if not names:
        print("No checkpoints found. Put a model in ComfyUI/models/checkpoints/ and restart ComfyUI.")
    for name in names:
        print(name)


def slugify(text):
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:50] or "image"


def find_server():
    """Return the first local port where ComfyUI answers, or None."""
    for url in ("http://127.0.0.1:8000", "http://127.0.0.1:8188"):
        try:
            api(url, "/system_stats")
            return url
        except (urllib.error.URLError, OSError, ValueError):
            continue
    return None


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("prompt", nargs="?", help="what to generate")
    parser.add_argument("--preset", choices=PRESETS, default="sdxl")
    parser.add_argument("--checkpoint", help="checkpoint filename (default: the preset's)")
    parser.add_argument("--negative", help="negative prompt (default: the preset's)")
    parser.add_argument("--width", type=int, default=1024)
    parser.add_argument("--height", type=int, default=1024)
    parser.add_argument("-n", "--count", type=int, default=1, help="images to generate in one batch")
    parser.add_argument("--seed", type=int, help="fix the seed to reproduce a result")
    parser.add_argument("--steps", type=int)
    parser.add_argument("--cfg", type=float)
    parser.add_argument("--name", help="output filename stem (default: from the prompt)")
    parser.add_argument("--out", default=DEFAULT_OUT_DIR, help="output directory")
    parser.add_argument("--url", default=os.environ.get("COMFY_URL"), help="ComfyUI address (default: auto-detect)")
    parser.add_argument("--timeout", type=int, default=600, help="seconds to wait for the job")
    parser.add_argument("--list-models", action="store_true", help="list installed checkpoints and exit")
    args = parser.parse_args()

    if not args.url:
        args.url = find_server()
        if not args.url:
            sys.exit("ComfyUI isn't running. Open the ComfyUI app, wait until it has loaded, then try again.")

    try:
        if args.list_models:
            list_models(args.url)
            return
        if not args.prompt:
            parser.error("a prompt is required (or use --list-models)")

        preset = PRESETS[args.preset]
        seed = args.seed if args.seed is not None else random.randint(0, 2**32 - 1)
        workflow = build_workflow(
            prompt=args.prompt,
            negative=args.negative if args.negative is not None else preset["negative"],
            preset=preset,
            checkpoint=args.checkpoint or preset["checkpoint"],
            width=args.width,
            height=args.height,
            batch=args.count,
            seed=seed,
            steps=args.steps or preset["steps"],
            cfg=args.cfg if args.cfg is not None else preset["cfg"],
        )

        try:
            prompt_id = api(args.url, "/prompt", {"prompt": workflow, "client_id": str(uuid.uuid4())})["prompt_id"]
        except urllib.error.HTTPError as e:
            # ComfyUI explains validation failures (e.g. a missing checkpoint) in the body.
            sys.exit(f"ComfyUI rejected the workflow:\n{e.read().decode(errors='replace')}")
        print(f"Queued {prompt_id} (seed {seed}); generating...")

        deadline = time.time() + args.timeout
        while True:
            history = api(args.url, f"/history/{prompt_id}")
            if prompt_id in history:
                entry = history[prompt_id]
                break
            if time.time() > deadline:
                sys.exit(f"Timed out after {args.timeout}s; the job may still finish in ComfyUI's output folder.")
            time.sleep(1)

        status = entry.get("status", {})
        if status.get("status_str") == "error":
            sys.exit("ComfyUI reported an error:\n" + json.dumps(status.get("messages", []), indent=2))

        os.makedirs(args.out, exist_ok=True)
        stem = args.name or slugify(args.prompt)
        images = [img for out in entry["outputs"].values() for img in out.get("images", [])]
        for i, img in enumerate(images):
            query = urllib.parse.urlencode(
                {"filename": img["filename"], "subfolder": img["subfolder"], "type": img["type"]}
            )
            data = api(args.url, f"/view?{query}", raw=True)
            suffix = f"-{i + 1}" if len(images) > 1 else ""
            path = os.path.join(args.out, f"{stem}{suffix}.png")
            if os.path.exists(path):
                path = os.path.join(args.out, f"{stem}{suffix}-{seed}.png")
            with open(path, "wb") as f:
                f.write(data)
            print(f"Saved {os.path.relpath(path, REPO_ROOT)}")
    except urllib.error.URLError as e:
        sys.exit(
            f"Could not reach ComfyUI at {args.url} ({e.reason}).\n"
            "Open the ComfyUI app, wait until it has loaded, then try again."
        )


if __name__ == "__main__":
    main()
