const body = document.getElementById('body');
const toast = document.getElementById('toast');

function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2200);
}

function stripHtml(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return (tmp.innerText || tmp.textContent || '').trim();
}

function buildDescription(d) {
    const lines = [];
    const title = [d.year, d.make, d.model, d.trim].filter(Boolean).join(' ');
    const price = d.price ? '$' + Number((d.price||'').replace(/\D/g,'')||0).toLocaleString() : '';
    const miles = d.mileage ? Number((d.mileage||'').replace(/\D/g,'')||0).toLocaleString() + ' miles' : '';

    if (title) lines.push(title + (price ? ' — ' + price : ''));
    const specs = [miles, d.color, d.interiorColor ? d.interiorColor + ' interior' : ''].filter(Boolean);
    if (specs.length) lines.push(specs.join(' · '));
    lines.push('');

    // Strip HTML and pull out up to 5 meaningful feature lines
    if (d.description) {
        const plain = stripHtml(d.description);
        const features = plain
            .split(/[\n·•\|]+/)
            .map(l => l.trim())
            .filter(l => l.length > 4 && l.length < 80)
            .filter(l => !/extended service|contract|carfax|autocheck|highlighted|clean carfax/i.test(l))
            .slice(0, 5);
        if (features.length) lines.push(features.join('\n'));
        lines.push('');
    }

    lines.push('Clean title. My name is Aung — direct line 469-881-3778 if you have any questions.');
    if (d.vin) lines.push('VIN: ' + d.vin);

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
            <button class="btn btn-secondary" id="btnDownload" style="width:100%">⬇ Save 10 Photos (${photoCount} found)</button>
        </div>
        <div class="btn-row" style="margin-top:8px">
            <button class="btn btn-primary" id="btnMarketplace" style="background:#42b72a">Auto-Fill Marketplace</button>
            <button class="btn btn-primary" id="btnPhotoPost" style="background:#e05c00">📸 Save & Post</button>
        </div>`;

    document.getElementById('btnRefresh').addEventListener('click', init);
    document.getElementById('btnCopy').addEventListener('click', () => {
        const text = regenerateDesc();
        navigator.clipboard.writeText(text).then(() => showToast('Copied!')).catch(() => { document.getElementById('f-desc').select(); document.execCommand('copy'); showToast('Copied!'); });
    });
    document.getElementById('btnDownload').addEventListener('click', () => {
        const photos = d.images ? d.images.slice(0,10) : [];
        if (!photos.length) { showToast('No photos found'); return; }
        const referer = d.url || '';
        const headers = referer ? [
            { name: 'Referer', value: referer },
            { name: 'User-Agent', value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
        ] : undefined;
        photos.forEach((url, i) => {
            const raw = url.split('?')[0];
            const ext = raw.split('.').pop().slice(0,4) || 'jpg';
            const opts = { url, filename: 'DealerCopier/car-photo-'+(i+1)+'.'+ext, saveAs: false, conflictAction: 'overwrite' };
            if (headers) opts.headers = headers;
            chrome.downloads.download(opts);
        });
        showToast('Saving ' + photos.length + ' photos…');
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

    document.getElementById('btnPhotoPost').addEventListener('click', () => {
        const photoUrls = (d.images || []).slice(0, 10);
        const videoUrl  = (d.videos || []).find(u => !/youtube|youtu\.be|vimeo/.test(u)) || null;
        if (!photoUrls.length) { showToast('No photos found on this page'); return; }

        const btn = document.getElementById('btnPhotoPost');
        btn.disabled = true;
        btn.textContent = 'Downloading photos…';

        chrome.runtime.sendMessage({ type: 'DOWNLOAD_PHOTOS', urls: photoUrls, videoUrl, referer: d.url || '' }, (resp) => {
            if (chrome.runtime.lastError || !resp || !resp.paths.length) {
                btn.textContent = 'Download failed — try again';
                btn.disabled = false;
                showToast('Could not download photos');
                return;
            }

            btn.textContent = 'Downloaded ' + resp.paths.length + ' photos — opening FB…';

            const listing = {
                year:val('f-year'), make:val('f-make'), model:val('f-model'), trim:val('f-trim'),
                price:val('f-price'), mileage:val('f-mileage'), color:val('f-color'), vin:val('f-vin'),
                description:document.getElementById('f-desc')?.value||'',
                images:d.images||[], videos:d.videos||[], url:d.url,
                photoPaths: resp.paths,
                videoPath: resp.videoPath || null
            };
            chrome.storage.local.set({ dealerListing: listing }, () => {
                chrome.tabs.create({ url: 'https://www.facebook.com/marketplace/create/vehicle' });
                setTimeout(() => {
                    btn.textContent = '📸 Save 10 Photos + Post to Marketplace';
                    btn.disabled = false;
                }, 3000);
            });
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
