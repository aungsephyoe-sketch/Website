// Background service worker
// Downloads images to disk via chrome.downloads, then injects them into
// the FB file input using CDP DOM.setFileInputFiles (fires a trusted event).

function downloadFile(url, filename, referer) {
    return new Promise((resolve) => {
        let dlId = null;
        let settled = false;

        const finish = (result) => {
            if (settled) return;
            settled = true;
            chrome.downloads.onChanged.removeListener(onChanged);
            clearTimeout(timeout);
            resolve(result);
        };

        const timeout = setTimeout(() => finish(null), 30000);

        const onChanged = (delta) => {
            if (dlId === null || delta.id !== dlId) return;
            if (delta.state && delta.state.current === 'complete') {
                chrome.downloads.search({ id: dlId }, (items) => {
                    finish(items && items[0] ? items[0].filename : null);
                });
            } else if (delta.state && delta.state.current === 'interrupted') {
                finish(null);
            }
        };

        chrome.downloads.onChanged.addListener(onChanged);

        const opts = { url, filename, saveAs: false, conflictAction: 'overwrite' };
        if (referer) {
            opts.headers = [
                { name: 'Referer', value: referer },
                { name: 'User-Agent', value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
            ];
        }

        chrome.downloads.download(opts, (id) => {
            if (chrome.runtime.lastError || !id) {
                console.warn('[DM BG] Download start failed:', chrome.runtime.lastError?.message);
                finish(null);
                return;
            }
            dlId = id;
            // The download can complete (or fail) before this callback runs, in
            // which case the matching onChanged event already fired and was
            // dropped above because dlId was still null. Re-check state now to
            // catch that race instead of stalling until the timeout.
            chrome.downloads.search({ id }, (items) => {
                const item = items && items[0];
                if (item && item.state === 'complete') finish(item.filename);
                else if (item && item.state === 'interrupted') finish(null);
            });
        });
    });
}

async function cdpSetFiles(tabId, selector, filePaths) {
    const dbg = { tabId };
    try {
        await chrome.debugger.attach(dbg, '1.3');
        console.log('[DM BG] Debugger attached');

        const doc = await chrome.debugger.sendCommand(dbg, 'DOM.getDocument', { depth: 0 });
        const found = await chrome.debugger.sendCommand(dbg, 'DOM.querySelector', {
            nodeId: doc.root.nodeId,
            selector
        });

        if (!found || !found.nodeId) {
            console.warn('[DM BG] File input not found:', selector);
            return false;
        }

        console.log('[DM BG] Found input node:', found.nodeId, '— setting', filePaths.length, 'files');
        await chrome.debugger.sendCommand(dbg, 'DOM.setFileInputFiles', {
            nodeId: found.nodeId,
            files: filePaths
        });
        console.log('[DM BG] DOM.setFileInputFiles succeeded');
        return true;
    } catch (e) {
        console.error('[DM BG] CDP error:', e.message);
        return false;
    } finally {
        try { await chrome.debugger.detach(dbg); } catch (_) {}
    }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

    if (msg.type === 'UPLOAD_PHOTOS') {
        (async () => {
            try {
                const urls = (msg.urls || []).slice(0, 10);
                const referer = msg.referer || null;
                console.log('[DM BG] Downloading', urls.length, 'photos...');

                // Download all images in parallel
                const paths = (await Promise.all(
                    urls.map((url, i) => {
                        const raw = url.split('?')[0];
                        const ext = raw.split('.').pop().slice(0, 4) || 'jpg';
                        return downloadFile(url, 'DealerCopier/photo-' + (i + 1) + '.' + ext, referer);
                    })
                )).filter(Boolean);

                console.log('[DM BG] Downloaded', paths.length, 'files:', paths);

                if (!paths.length) {
                    sendResponse({ ok: false, error: 'No photos downloaded' });
                    return;
                }

                const tabId = sender.tab.id;

                // Try photo-specific input first, then any file input
                const selectors = [
                    'input[type="file"][accept*="image"]',
                    'input[type="file"]:not([accept*="video"])',
                    'input[type="file"]'
                ];

                let ok = false;
                for (const sel of selectors) {
                    ok = await cdpSetFiles(tabId, sel, paths);
                    if (ok) break;
                    await new Promise(r => setTimeout(r, 500));
                }

                sendResponse({ ok, count: paths.length });
            } catch (e) {
                console.error('[DM BG] UPLOAD_PHOTOS failed:', e.message);
                sendResponse({ ok: false, error: e.message });
            }
        })();
        return true;
    }

    if (msg.type === 'UPLOAD_VIDEO') {
        (async () => {
            try {
                const url = msg.url;
                const referer = msg.referer || null;
                const raw = url.split('?')[0];
                const ext = raw.split('.').pop().slice(0, 4) || 'mp4';
                const path = await downloadFile(url, 'DealerCopier/car-video.' + ext, referer);

                if (!path) { sendResponse({ ok: false, error: 'Video download failed' }); return; }

                console.log('[DM BG] Video downloaded:', path);
                const tabId = sender.tab.id;

                const selectors = [
                    'input[type="file"][accept*="video"]',
                    'input[type="file"]'
                ];
                let ok = false;
                for (const sel of selectors) {
                    ok = await cdpSetFiles(tabId, sel, [path]);
                    if (ok) break;
                }

                sendResponse({ ok });
            } catch (e) {
                console.error('[DM BG] UPLOAD_VIDEO failed:', e.message);
                sendResponse({ ok: false, error: e.message });
            }
        })();
        return true;
    }

    if (msg.type === 'DOWNLOAD_PHOTOS') {
        (async () => {
            try {
                const urls = (msg.urls || []).slice(0, 10);
                const videoUrl = msg.videoUrl || null;
                const referer = msg.referer || null;
                console.log('[DM BG] DOWNLOAD_PHOTOS:', urls.length, 'photos, referer:', referer);

                const paths = (await Promise.all(
                    urls.map((url, i) => {
                        const raw = url.split('?')[0];
                        const ext = raw.split('.').pop().slice(0, 4) || 'jpg';
                        return downloadFile(url, 'DealerCopier/photo-' + (i + 1) + '.' + ext, referer);
                    })
                )).filter(Boolean);

                let videoPath = null;
                if (videoUrl) {
                    const raw = videoUrl.split('?')[0];
                    const ext = raw.split('.').pop().slice(0, 4) || 'mp4';
                    videoPath = await downloadFile(videoUrl, 'DealerCopier/car-video.' + ext, referer);
                }

                console.log('[DM BG] Downloaded', paths.length, 'photos, video:', videoPath);
                sendResponse({ paths, videoPath });
            } catch (e) {
                console.error('[DM BG] DOWNLOAD_PHOTOS error:', e.message);
                sendResponse({ paths: [], videoPath: null });
            }
        })();
        return true;
    }

    if (msg.type === 'CDP_SET_FILES') {
        (async () => {
            try {
                // sender.tab.id is the FB tab making the request — no need to pass tabId
                const tabId = sender && sender.tab && sender.tab.id;
                if (!tabId) { sendResponse({ ok: false, error: 'no tab id' }); return; }
                const filePaths = msg.paths || [];
                const selectors = msg.selectors || ['input[type="file"][accept*="image"]', 'input[type="file"]'];
                let ok = false;
                for (const sel of selectors) {
                    ok = await cdpSetFiles(tabId, sel, filePaths);
                    if (ok) break;
                    await new Promise(r => setTimeout(r, 500));
                }
                sendResponse({ ok });
            } catch (e) {
                console.error('[DM BG] CDP_SET_FILES error:', e.message);
                sendResponse({ ok: false });
            }
        })();
        return true;
    }

    return false;
});
