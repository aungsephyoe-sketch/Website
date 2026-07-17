const body = document.getElementById('body');
const toast = document.getElementById('toast');

function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2200);
}

function buildDescription(d) {
    const parts = [];
    const title = [d.year, d.make, d.model, d.trim].filter(Boolean).join(' ');
    if (title) parts.push(title);
    if (d.price) parts.push(`Price: ${d.price}`);
    if (d.mileage) parts.push(`Mileage: ${d.mileage} miles`);
    if (d.color) parts.push(`Color: ${d.color}`);
    if (d.vin) parts.push(`VIN: ${d.vin}`);
    if (d.description) parts.push('', d.description);
    if (d.url) parts.push('', `More info: ${d.url}`);
    return parts.join('\n');
}

function val(id) { return document.getElementById(id)?.value?.trim() || ''; }

function renderListing(d) {
    body.innerHTML = `
        <div class="card">
            <div class="card-title">Vehicle Details</div>
            <div class="fields">
                <div class="field"><label>Year</label><input id="f-year" value="${esc(d.year)}"></div>
                <div class="field"><label>Make</label><input id="f-make" value="${esc(d.make)}"></div>
                <div class="field"><label>Model</label><input id="f-model" value="${esc(d.model)}"></div>
                <div class="field"><label>Trim</label><input id="f-trim" value="${esc(d.trim)}"></div>
                <div class="field"><label>Price</label><input id="f-price" value="${esc(d.price)}"></div>
                <div class="field"><label>Mileage</label><input id="f-mileage" value="${esc(d.mileage)}"></div>
                <div class="field"><label>Color</label><input id="f-color" value="${esc(d.color)}"></div>
                <div class="field"><label>VIN</label><input id="f-vin" value="${esc(d.vin)}"></div>
            </div>
        </div>

        ${d.images.length ? `
        <div class="card">
            <div class="card-title">Photos (${d.images.length})</div>
            <div class="images-preview" id="imgPreview">
                ${d.images.slice(0, 10).map(src => `<img class="img-thumb" src="${esc(src)}" title="Click to open">`).join('')}
            </div>
            <div class="img-count">${d.images.length > 10 ? `Showing 10 of ${d.images.length}` : ''}</div>
        </div>` : ''}

        <div class="card">
            <div class="card-title">Marketplace Description</div>
            <textarea id="f-desc" rows="7">${esc(buildDescription(d))}</textarea>
        </div>

        <div class="btn-row">
            <button class="btn btn-secondary" id="btnRefresh">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
                Refresh
            </button>
            <button class="btn btn-primary" id="btnCopy">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                Copy Description
            </button>
        </div>

        <div class="btn-row" style="margin-top:8px">
            <button class="btn btn-secondary" id="btnDownload">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zm-8 2V5h2v6h1.17L12 13.17 9.83 11H11zm-6 7h14v2H5v-2z"/></svg>
                Download Photos & Video
            </button>
            <button class="btn btn-primary" id="btnMarketplace" style="background:#42b72a">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z"/></svg>
                Auto-Fill Marketplace
            </button>
        </div>
    `;

    document.querySelectorAll('.img-thumb').forEach(img => {
        img.addEventListener('click', () => chrome.tabs.create({ url: img.src }));
    });

    document.getElementById('btnRefresh').addEventListener('click', init);

    document.getElementById('btnCopy').addEventListener('click', () => {
        const text = regenerateDesc();
        navigator.clipboard.writeText(text).then(() => showToast('Copied to clipboard!')).catch(() => {
            document.getElementById('f-desc').select();
            document.execCommand('copy');
            showToast('Copied!');
        });
    });

    document.getElementById('btnDownload').addEventListener('click', () => {
        const urls = d.images.slice(0, 10);
        if (d.videos && d.videos.length) urls.push(d.videos[0]);
        if (!urls.length) { showToast('No photos found'); return; }
        urls.forEach((url, i) => {
            const ext = url.match(/\.(mp4|mov|webm)/i) ? (url.match(/\.(mp4|mov|webm)/i)[0]) : '.jpg';
            const filename = ext.match(/mp4|mov|webm/i) ? `car-video${ext}` : `car-photo-${i+1}${ext}`;
            chrome.downloads.download({ url, filename });
        });
        showToast(`Downloading ${urls.length} file(s)…`);
    });

    document.getElementById('btnMarketplace').addEventListener('click', () => {
        const listing = {
            year: val('f-year'), make: val('f-make'), model: val('f-model'), trim: val('f-trim'),
            price: val('f-price'), mileage: val('f-mileage'), color: val('f-color'), vin: val('f-vin'),
            description: document.getElementById('f-desc')?.value || '',
            images: d.images, videos: d.videos || [], url: d.url
        };
        chrome.storage.local.set({ dealerListing: listing }, () => {
            chrome.tabs.create({ url: 'https://www.facebook.com/marketplace/create/vehicle' });
        });
    });

    ['f-year','f-make','f-model','f-trim','f-price','f-mileage','f-color','f-vin'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', () => {
            document.getElementById('f-desc').value = regenerateDesc();
        });
    });
}

function regenerateDesc() {
    return buildDescription({
        year: val('f-year'), make: val('f-make'), model: val('f-model'), trim: val('f-trim'),
        price: val('f-price'), mileage: val('f-mileage'), color: val('f-color'), vin: val('f-vin'),
        description: document.getElementById('f-desc')?.value || '',
        url: ''
    });
}

function renderNoListing() {
    body.innerHTML = `
        <div class="no-listing">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="#65676b"><path d="M18.6 6.62c-1.44 0-2.8.56-3.77 1.53L12 10.66 10.48 12h.01L7.8 14.39c-.64.64-1.49.99-2.4.99-1.87 0-3.39-1.51-3.39-3.38S3.53 8.62 5.4 8.62c.91 0 1.76.35 2.44 1.03l1.13 1 1.51-1.34L9.22 8.2C8.2 7.18 6.84 6.62 5.4 6.62 2.42 6.62 0 9.04 0 12s2.42 5.38 5.4 5.38c1.44 0 2.8-.56 3.77-1.53l8.43-7.61c.64-.64 1.49-.99 2.4-.99 1.87 0 3.39 1.51 3.39 3.38s-1.52 3.38-3.39 3.38c-.9 0-1.76-.35-2.44-1.03l-1.14-1.01-1.51 1.34 1.27 1.12c1.02 1.01 2.37 1.57 3.82 1.57 2.98 0 5.4-2.41 5.4-5.38s-2.42-5.37-5.4-5.37z"/></svg>
            <p>No vehicle listing detected on this page.<br>Navigate to a car listing and try again.</p>
        </div>
        <button class="btn btn-secondary" id="btnRetry" style="margin-top:4px">
            Try Again
        </button>
    `;
    document.getElementById('btnRetry').addEventListener('click', init);
}

function esc(str) {
    return (str || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function init() {
    body.innerHTML = `<div class="loading"><div class="spinner"></div>Scanning page for listing data…</div>`;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (!tab?.id) { renderNoListing(); return; }

        chrome.tabs.sendMessage(tab.id, { type: 'GET_LISTING' }, (response) => {
            if (chrome.runtime.lastError || !response) {
                // content script may not be injected; try scripting API
                chrome.scripting.executeScript(
                    { target: { tabId: tab.id }, files: ['content.js'] },
                    () => {
                        chrome.tabs.sendMessage(tab.id, { type: 'GET_LISTING' }, (r) => {
                            if (chrome.runtime.lastError || !r) { renderNoListing(); return; }
                            handleResponse(r);
                        });
                    }
                );
                return;
            }
            handleResponse(response);
        });
    });
}

function handleResponse(d) {
    const hasData = d.year || d.make || d.model || d.price || d.mileage || d.vin;
    if (!hasData) { renderNoListing(); return; }
    renderListing(d);
}

init();
