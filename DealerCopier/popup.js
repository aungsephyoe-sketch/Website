const body = document.getElementById('body');
const toast = document.getElementById('toast');

function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2200);
}

function buildDescription(d) {
    const lines = [];
    const title = [d.year, d.make, d.model, d.trim].filter(Boolean).join(' ');
    const price = d.price ? '$' + Number((d.price||'').replace(/\D/g,'')||0).toLocaleString() : '';
    const miles = d.mileage ? Number((d.mileage||'').replace(/\D/g,'')||0).toLocaleString() + ' miles' : '';

    // Headline
    const headline = [title, price].filter(Boolean).join(' — ');
    if (headline) lines.push(headline);
    lines.push('');

    // Key specs on one line
    const specs = [miles, d.color, d.interiorColor ? d.interiorColor + ' interior' : ''].filter(Boolean);
    if (specs.length) lines.push(specs.join(' · '));

    // Dealer description — trimmed to essentials, no duplicated specs
    if (d.description) {
        const cleaned = d.description
            .replace(/\r\n/g, '\n')
            .split('\n')
            .map(l => l.trim())
            .filter(l => l.length > 10)
            .slice(0, 6)
            .join('\n');
        if (cleaned) { lines.push(''); lines.push(cleaned); }
    }

    lines.push('');
    lines.push('Clean title. Message with any questions.');
    if (d.vin) lines.push('VIN: ' + d.vin);
    if (d.url) lines.push('Full listing: ' + d.url);

    return lines.join('\n');
}

function val(id) { return document.getElementById(id)?.value?.trim() || ''; }
function esc(str) { return (str||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function renderListing(d) {
    const photoCount = d.images ? d.images.slice(0,10).length : 0;
    const videoCount = d.videos ? d.videos.slice(0,1).length : 0;
    const mediaLabel = [photoCount ? photoCount+' photo'+(photoCount>1?'s':'') : '', videoCount ? '1 video' : ''].filter(Boolean).join(', ') || 'None found';

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
            <button class="btn btn-secondary" id="btnDownload">⬇ Media (${mediaLabel})</button>
            <button class="btn btn-primary" id="btnMarketplace" style="background:#42b72a">Auto-Fill Marketplace</button>
        </div>`;

    document.getElementById('btnRefresh').addEventListener('click', init);
    document.getElementById('btnCopy').addEventListener('click', () => {
        const text = regenerateDesc();
        navigator.clipboard.writeText(text).then(() => showToast('Copied!')).catch(() => { document.getElementById('f-desc').select(); document.execCommand('copy'); showToast('Copied!'); });
    });
    document.getElementById('btnDownload').addEventListener('click', () => {
        const photos = d.images ? d.images.slice(0,10) : [];
        const videos = d.videos ? d.videos.slice(0,1) : [];
        if (!photos.length && !videos.length) { showToast('No media found'); return; }
        photos.forEach((url,i) => chrome.downloads.download({ url, filename: 'car-photo-'+(i+1)+'.jpg' }));
        videos.forEach(url => {
            if (url.includes('youtube')||url.includes('youtu.be')||url.includes('vimeo')) { chrome.tabs.create({url}); }
            else { const ext = url.match(/\.(mp4|mov|webm)/i)?.[1]||'mp4'; chrome.downloads.download({url, filename:'car-video.'+ext}); }
        });
        showToast('Downloading '+(photos.length+videos.length)+' file(s)…');
    });
    document.getElementById('btnMarketplace').addEventListener('click', () => {
        const listing = {
            year:val('f-year'), make:val('f-make'), model:val('f-model'), trim:val('f-trim'),
            price:val('f-price'), mileage:val('f-mileage'), color:val('f-color'), vin:val('f-vin'),
            description:document.getElementById('f-desc')?.value||'',
            images:d.images||[], videos:d.videos||[], url:d.url
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
        year:val('f-year'), make:val('f-make'), model:val('f-model'), trim:val('f-trim'),
        price:val('f-price'), mileage:val('f-mileage'), color:val('f-color'), vin:val('f-vin'),
        description:document.getElementById('f-desc')?.value||'', url:''
    });
}

function renderNoListing() {
    body.innerHTML = `<div class="no-listing"><p>No vehicle listing detected.<br>Navigate to a car listing and try again.</p></div><button class="btn btn-secondary" id="btnRetry" style="margin-top:4px">Try Again</button>`;
    document.getElementById('btnRetry').addEventListener('click', init);
}

function esc(str) { return (str||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function handleResponse(d) {
    if (d.year||d.make||d.model||d.price||d.mileage||d.vin) renderListing(d);
    else renderNoListing();
}

function init() {
    body.innerHTML = '<div class="loading"><div class="spinner"></div>Scanning page…</div>';
    chrome.tabs.query({ active:true, currentWindow:true }, (tabs) => {
        const tab = tabs[0];
        if (!tab?.id) { renderNoListing(); return; }
        chrome.tabs.sendMessage(tab.id, { type:'GET_LISTING' }, (response) => {
            if (chrome.runtime.lastError || !response) {
                chrome.scripting.executeScript({ target:{ tabId:tab.id }, files:['content.js'] }, () => {
                    chrome.tabs.sendMessage(tab.id, { type:'GET_LISTING' }, (r) => {
                        if (chrome.runtime.lastError || !r) { renderNoListing(); return; }
                        handleResponse(r);
                    });
                });
                return;
            }
            handleResponse(response);
        });
    });
}

init();
