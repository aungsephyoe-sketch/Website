// AI Image Studio — generates images client-side via the OpenAI Images API
// (gpt-image-1 is the model that powers image generation in ChatGPT).
// No backend is involved: the API key you enter is kept in this browser's
// localStorage and sent directly to OpenAI over HTTPS.

(function () {
    const STORAGE_KEY_API = 'ap_openai_key';
    const STORAGE_KEY_GALLERY = 'ap_ai_gallery';
    const MAX_GALLERY_ITEMS = 6;
    const API_URL = 'https://api.openai.com/v1/images/generations';

    const MODEL_CONFIG = {
        'gpt-image-1': {
            sizes: [
                { value: 'auto', label: 'Auto' },
                { value: '1024x1024', label: 'Square (1024×1024)' },
                { value: '1536x1024', label: 'Landscape (1536×1024)' },
                { value: '1024x1536', label: 'Portrait (1024×1536)' }
            ],
            qualities: [
                { value: 'auto', label: 'Auto' },
                { value: 'high', label: 'High' },
                { value: 'medium', label: 'Medium' },
                { value: 'low', label: 'Low' }
            ],
            maxN: 4,
            supportsQuality: true
        },
        'dall-e-3': {
            sizes: [
                { value: '1024x1024', label: 'Square (1024×1024)' },
                { value: '1792x1024', label: 'Landscape (1792×1024)' },
                { value: '1024x1792', label: 'Portrait (1024×1792)' }
            ],
            qualities: [
                { value: 'standard', label: 'Standard' },
                { value: 'hd', label: 'HD' }
            ],
            maxN: 1,
            supportsQuality: true
        },
        'dall-e-2': {
            sizes: [
                { value: '256x256', label: 'Small (256×256)' },
                { value: '512x512', label: 'Medium (512×512)' },
                { value: '1024x1024', label: 'Large (1024×1024)' }
            ],
            qualities: [],
            maxN: 4,
            supportsQuality: false
        }
    };

    let galleryItems = [];

    document.addEventListener('DOMContentLoaded', init);

    function init() {
        const form = document.getElementById('studioForm');
        if (!form) return; // ai-studio.js loaded on a page without the studio UI

        const apiKeyInput = document.getElementById('apiKeyInput');
        const forgetKeyBtn = document.getElementById('forgetKeyBtn');
        const modelSelect = document.getElementById('modelSelect');
        const sizeSelect = document.getElementById('sizeSelect');
        const qualitySelect = document.getElementById('qualitySelect');
        const qualityGroup = document.getElementById('qualityGroup');
        const countSelect = document.getElementById('countSelect');
        const generateBtn = document.getElementById('generateBtn');
        const generateBtnText = document.getElementById('generateBtnText');
        const promptInput = document.getElementById('promptInput');
        const errorEl = document.getElementById('studioError');
        const clearGalleryBtn = document.getElementById('clearGalleryBtn');
        const galleryEl = document.getElementById('studioGallery');
        const emptyEl = document.getElementById('studioEmpty');

        // Restore a previously saved API key (kept only in this browser).
        try {
            const savedKey = localStorage.getItem(STORAGE_KEY_API);
            if (savedKey) apiKeyInput.value = savedKey;
        } catch (e) { /* localStorage unavailable — ignore */ }

        apiKeyInput.addEventListener('change', () => saveApiKey(apiKeyInput.value.trim()));

        forgetKeyBtn.addEventListener('click', () => {
            apiKeyInput.value = '';
            saveApiKey('');
            apiKeyInput.focus();
        });

        function saveApiKey(key) {
            try {
                if (key) localStorage.setItem(STORAGE_KEY_API, key);
                else localStorage.removeItem(STORAGE_KEY_API);
            } catch (e) { /* storage full or disabled — key still works for this session */ }
        }

        function populateModelOptions() {
            const config = MODEL_CONFIG[modelSelect.value];

            sizeSelect.innerHTML = '';
            config.sizes.forEach(opt => sizeSelect.appendChild(makeOption(opt.value, opt.label)));

            if (config.supportsQuality) {
                qualityGroup.hidden = false;
                qualitySelect.innerHTML = '';
                config.qualities.forEach(opt => qualitySelect.appendChild(makeOption(opt.value, opt.label)));
            } else {
                qualityGroup.hidden = true;
            }

            Array.from(countSelect.options).forEach(opt => {
                opt.disabled = Number(opt.value) > config.maxN;
            });
            if (Number(countSelect.value) > config.maxN) {
                countSelect.value = String(config.maxN);
            }
        }

        function makeOption(value, label) {
            const el = document.createElement('option');
            el.value = value;
            el.textContent = label;
            return el;
        }

        modelSelect.addEventListener('change', populateModelOptions);
        populateModelOptions();

        loadGallery();
        renderGallery();

        clearGalleryBtn.addEventListener('click', () => {
            galleryItems = [];
            try { localStorage.removeItem(STORAGE_KEY_GALLERY); } catch (e) { /* ignore */ }
            renderGallery();
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            hideError();

            const apiKey = apiKeyInput.value.trim();
            const prompt = promptInput.value.trim();
            const model = modelSelect.value;
            const size = sizeSelect.value;
            const config = MODEL_CONFIG[model];
            const quality = config.supportsQuality ? qualitySelect.value : undefined;
            const n = Number(countSelect.value);

            if (!apiKey) {
                showError('Enter your OpenAI API key to generate images.');
                apiKeyInput.focus();
                return;
            }
            if (!prompt) {
                showError('Describe the image you want to generate.');
                promptInput.focus();
                return;
            }

            saveApiKey(apiKey);
            setLoading(true);
            try {
                const images = await requestImages({ apiKey, prompt, model, size, quality, n });
                if (!images.length) {
                    throw new Error('OpenAI returned no images for this prompt. Try rephrasing it.');
                }
                images.forEach(b64 => addToGallery({
                    prompt,
                    model,
                    size,
                    image: `data:image/png;base64,${b64}`
                }));
                renderGallery();
            } catch (err) {
                showError(err && err.message ? err.message : 'Something went wrong. Please try again.');
            } finally {
                setLoading(false);
            }
        });

        function setLoading(isLoading) {
            generateBtn.disabled = isLoading;
            generateBtnText.textContent = isLoading ? 'Generating…' : 'Generate Image';
        }

        function showError(msg) {
            errorEl.textContent = msg;
            errorEl.hidden = false;
        }

        function hideError() {
            errorEl.hidden = true;
            errorEl.textContent = '';
        }

        function loadGallery() {
            try {
                const raw = localStorage.getItem(STORAGE_KEY_GALLERY);
                galleryItems = raw ? JSON.parse(raw) : [];
            } catch (e) {
                galleryItems = [];
            }
        }

        function persistGallery() {
            let items = galleryItems.slice(0, MAX_GALLERY_ITEMS);
            while (items.length) {
                try {
                    localStorage.setItem(STORAGE_KEY_GALLERY, JSON.stringify(items));
                    return;
                } catch (e) {
                    // Likely quota exceeded (base64 images are large) — drop the
                    // oldest item and retry rather than losing the whole gallery.
                    items = items.slice(0, items.length - 1);
                }
            }
            try { localStorage.removeItem(STORAGE_KEY_GALLERY); } catch (e) { /* ignore */ }
        }

        function addToGallery(item) {
            galleryItems.unshift(Object.assign({
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                createdAt: Date.now()
            }, item));
            galleryItems = galleryItems.slice(0, MAX_GALLERY_ITEMS);
            persistGallery();
        }

        function removeFromGallery(id) {
            galleryItems = galleryItems.filter(item => item.id !== id);
            persistGallery();
            renderGallery();
        }

        function renderGallery() {
            galleryEl.querySelectorAll('.studio-card').forEach(el => el.remove());

            if (!galleryItems.length) {
                emptyEl.hidden = false;
                clearGalleryBtn.hidden = true;
                return;
            }
            emptyEl.hidden = true;
            clearGalleryBtn.hidden = false;
            galleryItems.forEach(item => galleryEl.appendChild(buildCard(item)));
        }

        function buildCard(item) {
            const card = document.createElement('div');
            card.className = 'studio-card';

            const imgWrap = document.createElement('div');
            imgWrap.className = 'studio-card-img';
            const img = document.createElement('img');
            img.src = item.image;
            img.alt = item.prompt;
            img.loading = 'lazy';
            imgWrap.appendChild(img);

            const body = document.createElement('div');
            body.className = 'studio-card-body';

            const promptEl = document.createElement('p');
            promptEl.className = 'studio-card-prompt';
            promptEl.textContent = item.prompt;

            const meta = document.createElement('p');
            meta.className = 'studio-card-meta';
            meta.textContent = `${item.model} · ${item.size}`;

            const actions = document.createElement('div');
            actions.className = 'studio-card-actions';

            const downloadLink = document.createElement('a');
            downloadLink.className = 'studio-card-btn';
            downloadLink.href = item.image;
            downloadLink.download = `ares-pantheon-ai-${item.id}.png`;
            downloadLink.textContent = 'Download';

            const reuseBtn = document.createElement('button');
            reuseBtn.type = 'button';
            reuseBtn.className = 'studio-card-btn';
            reuseBtn.textContent = 'Reuse Prompt';
            reuseBtn.addEventListener('click', () => {
                promptInput.value = item.prompt;
                promptInput.focus();
                form.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });

            actions.appendChild(downloadLink);
            actions.appendChild(reuseBtn);
            body.appendChild(promptEl);
            body.appendChild(meta);
            body.appendChild(actions);

            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'studio-card-remove';
            removeBtn.setAttribute('aria-label', 'Remove image');
            removeBtn.textContent = '✕';
            removeBtn.addEventListener('click', () => removeFromGallery(item.id));

            card.appendChild(imgWrap);
            card.appendChild(body);
            card.appendChild(removeBtn);
            return card;
        }
    }

    async function requestImages({ apiKey, prompt, model, size, quality, n }) {
        const body = { model, prompt, n, size };
        if (quality) body.quality = quality;
        // gpt-image-1 always returns base64 and rejects the response_format
        // param outright; dall-e-2/3 default to a short-lived URL, so ask
        // them for base64 too so downloads keep working after the link expires.
        if (model !== 'gpt-image-1') body.response_format = 'b64_json';

        let res;
        try {
            res = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify(body)
            });
        } catch (networkErr) {
            throw new Error('Could not reach OpenAI. Check your connection and try again.');
        }

        let data = null;
        try {
            data = await res.json();
        } catch (e) { /* non-JSON error body — handled below */ }

        if (!res.ok) {
            const message = (data && data.error && data.error.message) || `Request failed (HTTP ${res.status}).`;
            throw new Error(message);
        }
        if (!data || !Array.isArray(data.data)) {
            throw new Error('Unexpected response from OpenAI.');
        }
        return data.data.map(item => item.b64_json).filter(Boolean);
    }
})();
