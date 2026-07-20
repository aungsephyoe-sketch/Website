// Background service worker — fetches media without CORS, injects into page MAIN world
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

    if (msg.type === 'FETCH_FILES') {
        (async () => {
            const results = [];
            for (const url of msg.urls) {
                try {
                    const resp = await fetch(url);
                    if (!resp.ok) throw new Error('HTTP ' + resp.status);
                    const buffer = await resp.arrayBuffer();
                    const mimeType = resp.headers.get('content-type') || 'application/octet-stream';
                    const bytes = new Uint8Array(buffer);
                    let binary = '';
                    for (let i = 0; i < bytes.length; i += 8192)
                        binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
                    results.push({ url, base64: btoa(binary), mimeType });
                } catch (e) {
                    console.warn('[DM BG] Fetch failed:', url, e.message);
                    results.push({ url, error: e.message });
                }
            }
            sendResponse({ results });
        })();
        return true;
    }

    // Fetch images + inject into Facebook's React context via MAIN world
    if (msg.type === 'UPLOAD_PHOTOS') {
        (async () => {
            try {
                const filesData = [];
                for (const url of msg.urls) {
                    try {
                        const resp = await fetch(url);
                        if (!resp.ok) throw new Error('HTTP ' + resp.status);
                        const buf = await resp.arrayBuffer();
                        const mime = (resp.headers.get('content-type') || 'image/jpeg').split(';')[0].trim();
                        const bytes = new Uint8Array(buf);
                        let b = '';
                        for (let i = 0; i < bytes.length; i += 8192)
                            b += String.fromCharCode(...bytes.subarray(i, i + 8192));
                        filesData.push({ base64: btoa(b), mime });
                        console.log('[DM BG] Fetched photo', filesData.length, 'mime:', mime);
                    } catch (e) {
                        console.warn('[DM BG] Photo fetch failed:', url, e.message);
                    }
                }

                if (!filesData.length) { sendResponse({ ok: false, error: 'No photos fetched' }); return; }

                // Inject into Facebook's JavaScript world (MAIN) so React sees the files
                const results = await chrome.scripting.executeScript({
                    target: { tabId: sender.tab.id },
                    world: 'MAIN',
                    func: (data) => {
                        try {
                            // Build File objects from base64
                            const files = data.map((d, i) => {
                                const bin = atob(d.base64);
                                const arr = new Uint8Array(bin.length);
                                for (let j = 0; j < bin.length; j++) arr[j] = bin.charCodeAt(j);
                                const ext = d.mime.split('/')[1] || 'jpg';
                                return new File([arr.buffer], 'photo-' + (i + 1) + '.' + ext, { type: d.mime });
                            });

                            const dt = new DataTransfer();
                            files.forEach(f => dt.items.add(f));

                            let triggered = false;

                            // Try every file input on the page
                            for (const inp of document.querySelectorAll('input[type="file"]')) {
                                // Override files so React reads our list
                                Object.defineProperty(inp, 'files', { configurable: true, get: () => dt.files });

                                // Call React's onChange directly (React 17+ stores props on __reactProps$...)
                                const rk = Object.keys(inp).find(k => k.startsWith('__reactProps$'));
                                if (rk && inp[rk] && typeof inp[rk].onChange === 'function') {
                                    inp[rk].onChange({
                                        target: inp, currentTarget: inp,
                                        type: 'change', bubbles: true, cancelable: false,
                                        nativeEvent: new Event('change', { bubbles: true }),
                                        preventDefault() {}, stopPropagation() {}, persist() {}
                                    });
                                    triggered = true;
                                    console.log('[DM] React onChange called on input', inp.accept);
                                }

                                // Also fire native event as fallback
                                inp.dispatchEvent(new Event('change', { bubbles: true }));
                                inp.dispatchEvent(new Event('input',  { bubbles: true }));
                            }

                            // Try drag-drop on photo upload zones
                            const zones = [
                                document.querySelector('[aria-label*="photo" i]'),
                                document.querySelector('[aria-label*="Add photo" i]'),
                                document.querySelector('[role="button"][aria-label*="photo" i]'),
                            ].filter(Boolean);

                            for (const zone of zones) {
                                ['dragenter', 'dragover', 'drop'].forEach(type => {
                                    zone.dispatchEvent(new DragEvent(type, {
                                        bubbles: true, cancelable: true, dataTransfer: dt
                                    }));
                                });
                                console.log('[DM] Dropped on zone:', zone.getAttribute('aria-label'));
                            }

                            console.log('[DM MAIN] Upload attempt done, files:', files.length, 'triggered:', triggered);
                            return { ok: true, count: files.length, triggered };
                        } catch (err) {
                            console.error('[DM MAIN] Error:', err.message);
                            return { ok: false, error: err.message };
                        }
                    },
                    args: [filesData]
                });

                sendResponse({ ok: true, result: results && results[0] && results[0].result });
            } catch (e) {
                console.error('[DM BG] UPLOAD_PHOTOS failed:', e.message);
                sendResponse({ ok: false, error: e.message });
            }
        })();
        return true;
    }

    // Fetch video + inject into page MAIN world
    if (msg.type === 'UPLOAD_VIDEO') {
        (async () => {
            try {
                const url = msg.url;
                const resp = await fetch(url);
                if (!resp.ok) throw new Error('HTTP ' + resp.status);
                const buf = await resp.arrayBuffer();
                const mime = (resp.headers.get('content-type') || 'video/mp4').split(';')[0].trim();
                const bytes = new Uint8Array(buf);
                let b = '';
                for (let i = 0; i < bytes.length; i += 8192)
                    b += String.fromCharCode(...bytes.subarray(i, i + 8192));
                const fileData = { base64: btoa(b), mime };

                await chrome.scripting.executeScript({
                    target: { tabId: sender.tab.id },
                    world: 'MAIN',
                    func: (d) => {
                        const bin = atob(d.base64);
                        const arr = new Uint8Array(bin.length);
                        for (let j = 0; j < bin.length; j++) arr[j] = bin.charCodeAt(j);
                        const ext = d.mime.split('/')[1] || 'mp4';
                        const file = new File([arr.buffer], 'car-video.' + ext, { type: d.mime });
                        const dt = new DataTransfer();
                        dt.items.add(file);

                        for (const inp of document.querySelectorAll('input[type="file"]')) {
                            Object.defineProperty(inp, 'files', { configurable: true, get: () => dt.files });
                            const rk = Object.keys(inp).find(k => k.startsWith('__reactProps$'));
                            if (rk && inp[rk] && typeof inp[rk].onChange === 'function') {
                                inp[rk].onChange({
                                    target: inp, currentTarget: inp, type: 'change', bubbles: true,
                                    nativeEvent: new Event('change', { bubbles: true }),
                                    preventDefault() {}, stopPropagation() {}, persist() {}
                                });
                            }
                            inp.dispatchEvent(new Event('change', { bubbles: true }));
                        }

                        const vzone = document.querySelector('[aria-label*="video" i]')
                                   || document.querySelector('[aria-label*="Add video" i]');
                        if (vzone) {
                            ['dragenter', 'dragover', 'drop'].forEach(type => {
                                vzone.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: dt }));
                            });
                        }
                        console.log('[DM MAIN] Video upload attempted');
                    },
                    args: [fileData]
                });

                sendResponse({ ok: true });
            } catch (e) {
                console.error('[DM BG] UPLOAD_VIDEO failed:', e.message);
                sendResponse({ ok: false, error: e.message });
            }
        })();
        return true;
    }

    return false;
});
