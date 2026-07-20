// Background service worker — fetches images/videos without CORS restrictions
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type !== 'FETCH_FILES') return false;

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
                const chunkSize = 8192;
                for (let i = 0; i < bytes.length; i += chunkSize) {
                    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
                }
                results.push({ url, base64: btoa(binary), mimeType });
            } catch (e) {
                console.warn('[DM BG] Failed to fetch:', url, e.message);
                results.push({ url, error: e.message });
            }
        }
        sendResponse({ results });
    })();

    return true; // keep channel open for async response
});
