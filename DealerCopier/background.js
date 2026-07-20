// Background service worker
// Uses chrome.downloads to save images to disk, then CDP DOM.setFileInputFiles
// to set them on the file input — this fires a TRUSTED change event Facebook accepts.

// Download a URL to the user's Downloads folder, return the full file path
function downloadToFile(url, filename) {
    return new Promise((resolve, reject) => {
        let dlId = null;

        const onChanged = (delta) => {
            if (delta.id !== dlId) return;
            if (delta.state && delta.state.current === 'complete') {
                chrome.downloads.onChanged.removeListener(onChanged);
                chrome.downloads.search({ id: dlId }, (items) => {
                    if (items && items[0]) resolve(items[0].filename);
                    else reject(new Error('Download item not found'));
                });
            } else if (delta.state && delta.state.current === 'interrupted') {
                chrome.downloads.onChanged.removeListener(onChanged);
                reject(new Error('Download interrupted'));
            }
        };

        chrome.downloads.onChanged.addListener(onChanged);

        chrome.downloads.download({
            url,
            filename: 'DealerCopier/' + filename,
            saveAs: false,
            conflictAction: 'overwrite'
        }, (id) => {
            if (chrome.runtime.lastError) {
                chrome.downloads.onChanged.removeListener(onChanged);
                reject(new Error(chrome.runtime.lastError.message));
            } else {
                dlId = id;
            }
        });
    });
}

// Use CDP to set files on a file input — fires a trusted change event
async function cdpSetFiles(tabId, selector, filePaths) {
    const dbg = { tabId };
    try {
        await chrome.debugger.attach(dbg, '1.3');
        const doc = await chrome.debugger.sendCommand(dbg, 'DOM.getDocument', { depth: 0 });
        const found = await chrome.debugger.sendCommand(dbg, 'DOM.querySelector', {
            nodeId: doc.root.nodeId,
            selector
        });
        if (!found.nodeId) throw new Error('File input not found: ' + selector);
        await chrome.debugger.sendCommand(dbg, 'DOM.setFileInputFiles', {
            nodeId: found.nodeId,
            files: filePaths
        });
        return true;
    } finally {
        try { await chrome.debugger.detach(dbg); } catch (_) {}
    }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

    // UPLOAD_PHOTOS: download images to disk, then set via CDP
    if (msg.type === 'UPLOAD_PHOTOS') {
        (async () => {
            try {
                const urls = msg.urls || [];
                console.log('[DM BG] Downloading', urls.length, 'photos...');

                const filePaths = [];
                for (let i = 0; i < urls.length; i++) {
                    try {
                        const ext = urls[i].split('?')[0].split('.').pop().split('/').pop() || 'jpg';
                        const name = 'photo-' + (i + 1) + '.' + (ext.length <= 4 ? ext : 'jpg');
                        const path = await downloadToFile(urls[i], name);
                        filePaths.push(path);
                        console.log('[DM BG] Downloaded photo', i + 1, '->', path);
                    } catch (e) {
                        console.warn('[DM BG] Photo download failed:', urls[i], e.message);
                    }
                }

                if (!filePaths.length) {
                    sendResponse({ ok: false, error: 'No photos downloaded' });
                    return;
                }

                console.log('[DM BG] Setting', filePaths.length, 'files via CDP...');

                // Try the image-specific input first, then any file input
                let ok = false;
                const selectors = [
                    'input[type="file"][accept*="image"]',
                    'input[type="file"]:not([accept*="video"])',
                    'input[type="file"]'
                ];
                for (const sel of selectors) {
                    try {
                        ok = await cdpSetFiles(sender.tab.id, sel, filePaths);
                        if (ok) { console.log('[DM BG] CDP success with selector:', sel); break; }
                    } catch (e) {
                        console.warn('[DM BG] CDP failed for selector', sel, ':', e.message);
                    }
                }

                sendResponse({ ok, count: filePaths.length });
            } catch (e) {
                console.error('[DM BG] UPLOAD_PHOTOS error:', e.message);
                sendResponse({ ok: false, error: e.message });
            }
        })();
        return true;
    }

    // UPLOAD_VIDEO: download video to disk, then set via CDP
    if (msg.type === 'UPLOAD_VIDEO') {
        (async () => {
            try {
                const url = msg.url;
                console.log('[DM BG] Downloading video:', url);

                const ext = url.split('?')[0].split('.').pop() || 'mp4';
                const path = await downloadToFile(url, 'car-video.' + (ext.length <= 4 ? ext : 'mp4'));
                console.log('[DM BG] Video downloaded ->', path);

                const selectors = [
                    'input[type="file"][accept*="video"]',
                    'input[type="file"]'
                ];
                let ok = false;
                for (const sel of selectors) {
                    try {
                        ok = await cdpSetFiles(sender.tab.id, sel, [path]);
                        if (ok) { console.log('[DM BG] Video CDP success:', sel); break; }
                    } catch (e) {
                        console.warn('[DM BG] Video CDP failed:', sel, e.message);
                    }
                }

                sendResponse({ ok });
            } catch (e) {
                console.error('[DM BG] UPLOAD_VIDEO error:', e.message);
                sendResponse({ ok: false, error: e.message });
            }
        })();
        return true;
    }

    return false;
});
