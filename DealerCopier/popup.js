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
    const photoCount = d.images ? d.images.slice(0, 10).length : 0;
    const videoCount = d.videos ? d.videos.slice(0, 1).length : 0;
    const mediaLabel = [
        photoCount ? `${photoCount} photo${photoCount > 1 ? 's' : ''}` : '',
        videoCount ? `${videoCount} video` : ''
    ].filter(Boolean).join(', ') || 'None found';

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

        <div class="card">
            <div class="card-title">Marketplace Description</div>
            <textarea id="f-desc" rows="6">${esc(buildDescription(d))}</textarea>
        </div>

        <div class="btn-row">
            <button class="btn btn-secondary" id="btnRefresh">↺ Refresh</button>
            <button class="btn btn-primary" id="btnCopy">Copy Description</button>
        </div>

        <div class="btn-row" style="margin-top:8px">
            <button class="btn btn-secondary" id="btnDownload">⬇ Download Media (${mediaLabel})</button>
            <button class="btn btn-primary" id="btnMarketplace" style="background:#42b72a">Auto-Fill Marketplace</button>
        </div>
    `;

    document.getElementById('btnRefresh').addEventListener('click', init);

    document.getElementById('btnCopy').addEventListener('click', () => {
        const text = regenerateDesc();
        navigator.clipboard.writeText(text)
            .then(() => showToast('Copied to clipboard!'))
            .catch(() => { document.getElementById('f-desc').select(); document.execCommand('copy'); showToast('Copied!'); });
    });

    document.getElementById('btnDownload').addEventListener('click', () => {
        const photos = d.images ? d.images.slice(0, 10) : [];
        const videos = d.videos ? d.videos.slice(0, 1) : [];
        if (!photos.length && !videos.length) { showToast('No media found on this page'); return; }
        photos.forEach((url, i) => {
            chrome.downloads.download({ url, filename: `car-photo-${i + 1}.jpg` });
        });
        videos.forEach(url => {
            if (url.includes('youtube') || url.includes('vimeo')) {
                chrome.tabs.create({ url });
            } else {
                const ext = url.match(/\.(mp4|mov|webm)/i)?.[1] || 'mp4';
                chrome.downloads.download({ url, filename: `car-video.${ext}` });
            }
        });
        showToast(`Downloading ${photos.length + videos.length} file(s)…`);
    });

    document.getElementById('btnMarketplace').addEventListener('click', () => {
        const listing = {
            year: val('f-year'), make: val('f-make'), model: val('f-model'), trim: val('f-trim'),
            price: val('f-price'), mileage: val('f-mileage'), color: val('f-color'), vin: val('f-vin'),
            description: document.getElementById('f-desc')?.value || '',
            images: d.images || [], videos: d.videos || [], url: d.url
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
        <button class="btn btn-secondary" id="btnRetry" style="margin-top:4px">Try Again</button>
    `;
    document.getElementById('btnRetry').addEventListener('click', init);
}

function esc(str) {
    return (str || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function init() {
    body.innerHTML = `<div class="loading"><div class="spinner"></div>Scanning page…</div>`;
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (!tab?.id) { renderNoListing(); return; }
        chrome.tabs.sendMessage(tab.id, { type: 'GET_LISTING' }, (response) => {
            if (chrome.runtime.lastError || !response) {
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
