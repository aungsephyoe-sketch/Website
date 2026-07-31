// Facebook Marketplace vehicle auto-fill
// VERSION 19

(function () {
    if (document.getElementById('dm-fab')) return;

    console.log('%c[DM] VERSION 19 LOADED', 'background:green;color:white;font-size:16px;padding:4px 8px');

    const btn = document.createElement('button');
    btn.id = 'dm-fab';
    btn.textContent = 'Fill Listing (v19)';
    Object.assign(btn.style, {
        position: 'fixed', bottom: '24px', right: '24px', zIndex: '2147483647',
        background: '#1877f2', color: '#fff', border: 'none', borderRadius: '24px',
        padding: '14px 22px', fontSize: '15px', fontWeight: '800',
        cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        fontFamily: 'Helvetica Neue, Arial, sans-serif'
    });
    document.body.appendChild(btn);

    btn.addEventListener('click', () => {
        chrome.storage.local.get('dealerListing', ({ dealerListing }) => {
            if (!dealerListing) {
                alert('No data.\nGo to a dealer page, click the extension, then Auto-Fill Marketplace.');
                return;
            }
            autofill(dealerListing);
        });
    });

    const sleep = ms => new Promise(r => setTimeout(r, ms));

    async function waitFor(fn, timeout) {
        timeout = timeout || 7000;
        const end = Date.now() + timeout;
        while (Date.now() < end) {
            const v = fn();
            if (v) return v;
            await sleep(250);
        }
        return null;
    }

    function setReact(el, value) {
        if (!el) return;
        try {
            const tag = el.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA') {
                const proto = tag === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
                const desc = Object.getOwnPropertyDescriptor(proto, 'value');
                if (desc && desc.set) desc.set.call(el, value);
            } else if (tag === 'SELECT') {
                const desc = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
                if (desc && desc.set) desc.set.call(el, value);
            }
        } catch(e) {}
        try { el.dispatchEvent(new Event('input',  { bubbles: true })); } catch(_) {}
        try { el.dispatchEvent(new Event('change', { bubbles: true })); } catch(_) {}
    }

    function normalizeColor(raw) {
        if (!raw) return '';
        const r = raw.toLowerCase();
        if (/black/.test(r))                              return 'Black';
        if (/white|pearl|ivory|tricoat/.test(r))          return 'White';
        if (/silver|chrome|aluminum|platinum/.test(r))    return 'Silver';
        if (/gray|grey|graphite|charcoal|iridium/.test(r)) return 'Gray';
        if (/red|crimson|burgundy|maroon/.test(r))        return 'Red';
        if (/blue|navy|cobalt|azure/.test(r))             return 'Blue';
        if (/green|olive|forest/.test(r))                 return 'Green';
        if (/orange/.test(r))                             return 'Orange';
        if (/yellow/.test(r))                             return 'Yellow';
        if (/brown|tan|copper|bronze/.test(r))            return 'Brown';
        if (/beige|cream|sand|champagne/.test(r))         return 'Beige';
        if (/purple|violet|lavender/.test(r))             return 'Purple';
        if (/gold/.test(r))                               return 'Gold';
        return raw;
    }

    function guessBodyStyle(make, model, trim) {
        const m = ((make || '') + ' ' + (model || '') + ' ' + (trim || '')).toLowerCase();
        if (/odyssey|sienna|pacifica|caravan|sedona|minivan|mini-van/.test(m)) return 'Minivan';
        if (/silverado|f-150|f150|f-250|f250|f-350|f350|tundra|tacoma|colorado|canyon|frontier|ranger|ridgeline|titan|\bram\b|\bpickup\b|\btruck\b|crew cab|quad cab|regular cab|mega cab|1500|2500|3500/.test(m)) return 'Truck';
        if (/escalade|tahoe|suburban|explorer|pilot|highlander|traverse|4runner|pathfinder|navigator|expedition|yukon|sequoia|armada|mdx|rdx|gx\b|lx\b|rx\b|rav4|cr-v|crv|tucson|santa fe|equinox|blazer|bronco|terrain|edge|trailblazer|enclave|acadia|atlas|tiguan|rogue|murano|qashqai|cx-5|cx-9|forester|outback|ascent|trax|encore|envoy|captiva|passport|hr-v|hrv|cx-30|cx-3|bravada|envision|kona|venue|palisade|telluride|sorento|sportage|seltos|soul|niro|juke|kicks|xterra|x-trail|wagoneer|grand cherokee|durango|explorer|\bsuv\b|crossover/.test(m)) return 'SUV';
        if (/mustang|camaro|challenger|corvette|charger|86|brz|miata|370z|400z|911|\bcoupe\b|2-door|2dr/.test(m)) return 'Coupe';
        if (/convert|cabriolet|roadster/.test(m)) return 'Convertible';
        if (/hatchback|hatch|golf|fit\b|yaris|versa note|accent hatch/.test(m)) return 'Hatchback';
        if (/wagon|estate|sport wagon/.test(m)) return 'Wagon';
        return 'Sedan';
    }

    // Find a dropdown trigger element by label hints
    function findTrigger(labels) {
        for (const label of labels) {
            const lower = label.toLowerCase().trim();

            // aria-label exact or includes match on interactive elements
            for (const el of document.querySelectorAll('[aria-label]')) {
                const al = el.getAttribute('aria-label').toLowerCase();
                if (al === lower || al.includes(lower)) {
                    if (el.tagName === 'SELECT' || el.getAttribute('role') === 'combobox' ||
                        el.getAttribute('role') === 'button' || el.getAttribute('role') === 'listbox' ||
                        el.tagName === 'BUTTON') return el;
                }
            }

            // native <select>
            for (const el of document.querySelectorAll('select')) {
                const a = (el.getAttribute('aria-label') || '').toLowerCase();
                const first = (el.options[0] ? el.options[0].text : '').toLowerCase();
                if (a.includes(lower) || first.includes(lower)) return el;
            }

            // role=combobox / role=button text match
            for (const el of document.querySelectorAll('[role="combobox"],[role="button"],[role="listbox"]')) {
                if (el.textContent.trim().toLowerCase() === lower) return el;
            }

            // span/div text inside a clickable ancestor
            for (const el of document.querySelectorAll('span, div, label, legend')) {
                if (el.children.length === 0 && el.textContent.trim().toLowerCase() === lower) {
                    const anc = el.closest('[role="button"]') || el.closest('[role="combobox"]')
                             || el.closest('button') || el.closest('select');
                    if (anc) return anc;
                }
            }

            // broad includes match
            for (const el of document.querySelectorAll('[aria-label]')) {
                if (el.getAttribute('aria-label').toLowerCase().includes(lower)) return el;
            }
            for (const el of document.querySelectorAll('[role="button"],[role="combobox"]')) {
                if (el.textContent.trim().toLowerCase().includes(lower)) return el;
            }
        }
        return null;
    }

    function findInputByLabel(labels) {
        for (const label of labels) {
            const lower = label.toLowerCase();

            for (const el of document.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]), textarea')) {
                const a = (el.getAttribute('aria-label') || '').toLowerCase();
                const p = (el.getAttribute('placeholder') || '').toLowerCase();
                if (a.includes(lower) || p.includes(lower)) return el;
            }

            for (const lbl of document.querySelectorAll('label')) {
                if (lbl.textContent.trim().toLowerCase().includes(lower)) {
                    const forId = lbl.getAttribute('for');
                    if (forId) {
                        const el = document.getElementById(forId);
                        if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) return el;
                    }
                    const el = lbl.querySelector('input, textarea') || lbl.nextElementSibling;
                    if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) return el;
                }
            }

            for (const el of document.querySelectorAll('span, div, p, legend')) {
                if (el.textContent.trim().toLowerCase() === lower) {
                    let node = el.parentElement;
                    for (let i = 0; i < 5; i++) {
                        if (!node) break;
                        const inp = node.querySelector('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]), textarea');
                        if (inp) return inp;
                        node = node.parentElement;
                    }
                }
            }
        }
        return null;
    }

    async function fillText(labels, value) {
        if (value === null || value === undefined || value === '') return false;
        const el = await waitFor(() => findInputByLabel(labels), 5000);
        if (!el) { console.warn('[DM] Text input not found:', labels.join(',')); return false; }

        el.scrollIntoView({ block: 'center' });
        await sleep(150);
        el.click();
        el.focus();
        await sleep(250);
        setReact(el, '');
        await sleep(100);
        setReact(el, value);

        if (String(el.value) !== String(value)) {
            try {
                el.select();
                document.execCommand('selectAll', false, null);
                document.execCommand('insertText', false, String(value));
            } catch(e) {}
        }
        await sleep(300);
        return true;
    }

    async function pickOption(values, timeout) {
        timeout = timeout || 6000;
        const lowers = (Array.isArray(values) ? values : [values]).map(v => v.toLowerCase().trim());

        const opt = await waitFor(() => {
            const selectors = ['[role="option"]', '[role="menuitem"]', 'li[tabindex]', '[data-value]', 'li'];
            for (const sel of selectors) {
                for (const el of document.querySelectorAll(sel)) {
                    const txt = el.textContent.trim().toLowerCase();
                    for (const lower of lowers) {
                        if (txt === lower || txt.startsWith(lower) || txt.includes(lower)) return el;
                    }
                }
            }
            return null;
        }, timeout);

        if (opt) {
            opt.scrollIntoView({ block: 'nearest' });
            opt.click();
            await sleep(900);
            return true;
        }
        console.warn('[DM] option not found:', lowers[0]);
        return false;
    }

    async function fillDropdown(labels, value, aliases) {
        if (!value) return false;
        const allValues = [value].concat(aliases || []);
        console.log('[DM] fillDropdown:', labels[0], '=', value);

        // Try native <select> first
        for (const label of labels) {
            for (const sel of document.querySelectorAll('select')) {
                const a = (sel.getAttribute('aria-label') || '').toLowerCase();
                const first = (sel.options[0] ? sel.options[0].text : '').toLowerCase();
                if (!a.includes(label.toLowerCase()) && !first.includes(label.toLowerCase())) continue;
                for (const v of allValues) {
                    for (const o of sel.options) {
                        if (o.text.toLowerCase().includes(v.toLowerCase())) {
                            setReact(sel, o.value);
                            await sleep(700);
                            return true;
                        }
                    }
                }
            }
        }

        const trigger = await waitFor(() => findTrigger(labels), 6000);
        if (!trigger) { console.warn('[DM] Could not find trigger for:', labels.join(',')); return false; }

        trigger.scrollIntoView({ block: 'center' });
        await sleep(400);
        trigger.click();
        await sleep(1000);

        return await pickOption(allValues);
    }

    async function tickCheckbox(labels) {
        for (const label of labels) {
            const lower = label.toLowerCase();
            for (const cb of document.querySelectorAll('input[type="checkbox"]')) {
                const lbl = cb.closest('label') || document.querySelector('label[for="' + cb.id + '"]');
                const txt = ((lbl ? lbl.textContent : '') || cb.getAttribute('aria-label') || '').toLowerCase();
                if (txt.includes(lower)) { if (!cb.checked) cb.click(); await sleep(200); return true; }
            }
            for (const cb of document.querySelectorAll('[role="checkbox"]')) {
                const txt = (cb.getAttribute('aria-label') || cb.textContent || '').toLowerCase();
                if (txt.includes(lower)) {
                    if (cb.getAttribute('aria-checked') !== 'true') cb.click();
                    await sleep(200); return true;
                }
            }
        }
        return false;
    }

    function sendToBg(msg) {
        return new Promise(resolve => {
            chrome.runtime.sendMessage(msg, resp => {
                if (chrome.runtime.lastError) {
                    console.warn('[DM] BG error:', chrome.runtime.lastError.message);
                    resolve(null);
                } else {
                    resolve(resp);
                }
            });
        });
    }

    async function uploadPhotos(images, photoPaths, referer) {
        // If pre-downloaded paths exist, use CDP directly (background uses sender.tab.id)
        if (photoPaths && photoPaths.length) {
            status('Uploading ' + photoPaths.length + ' saved photos...');
            console.log('[DM] Using pre-downloaded paths:', photoPaths.length);
            const resp = await sendToBg({
                type: 'CDP_SET_FILES',
                paths: photoPaths,
                selectors: ['input[type="file"][accept*="image"]', 'input[type="file"]:not([accept*="video"])', 'input[type="file"]']
            });
            if (resp && resp.ok) { status('Photos uploaded (' + photoPaths.length + ')!'); }
            else { console.warn('[DM] CDP set files failed:', resp && resp.error); status('Photo upload failed'); }
            await sleep(2000);
            return;
        }
        await uploadPhotosByUrl(images, referer);
    }

    async function uploadPhotosByUrl(images, referer) {
        if (!images || !images.length) return;
        const urls = images.slice(0, 10);
        status('Downloading ' + urls.length + ' photos...');
        console.log('[DM] Requesting photo upload via background:', urls.length, 'images');

        const resp = await sendToBg({ type: 'UPLOAD_PHOTOS', urls, referer });
        if (resp && resp.ok) {
            status('Photos uploaded (' + resp.count + ')!');
            console.log('[DM] Photos uploaded successfully:', resp.count);
        } else {
            console.warn('[DM] Photo upload failed:', resp && resp.error);
            status('Photo upload failed — check console');
        }
        await sleep(2000);
    }

    async function uploadVideo(videos, videoPath, referer) {
        // Use pre-downloaded path if available
        if (videoPath) {
            status('Uploading saved video...');
            const resp = await sendToBg({
                type: 'CDP_SET_FILES',
                paths: [videoPath],
                selectors: ['input[type="file"][accept*="video"]', 'input[type="file"]']
            });
            if (resp && resp.ok) { status('Video uploaded!'); }
            else { console.warn('[DM] CDP video failed'); }
            await sleep(2000);
            return;
        }

        if (!videos || !videos.length) return;
        const url = videos[0];
        if (/youtube|youtu\.be|vimeo/.test(url)) {
            console.warn('[DM] Skipping YouTube/Vimeo video:', url);
            return;
        }

        status('Uploading video...');
        console.log('[DM] Requesting video upload via background:', url);

        const resp = await sendToBg({ type: 'UPLOAD_VIDEO', url, referer });
        if (resp && resp.ok) {
            status('Video uploaded!');
            console.log('[DM] Video uploaded');
        } else {
            console.warn('[DM] Video upload failed:', resp && resp.error);
        }
        await sleep(2000);
    }

    function status(msg) { btn.textContent = msg; console.log('[DM]', msg); }

    async function autofill(d) {
        btn.disabled = true;
        window.scrollTo(0, 0);
        await sleep(800);

        const extColor    = normalizeColor(d.color);
        const intColor    = normalizeColor(d.interiorColor) || 'Black';
        const transmission = 'Automatic';
        const bodyStyle   = guessBodyStyle(d.make, d.model, d.trim);

        console.log('[DM] Data:', JSON.stringify({
            year: d.year, make: d.make, model: d.model, trim: d.trim,
            bodyStyle, price: d.price, mileage: d.mileage,
            extColor, intColor, transmission,
            photos: (d.images || []).length
        }));

        // Upload photos + video first (file inputs are present before other fields are filled)
        await uploadPhotos(d.images, d.photoPaths, d.url);
        await uploadVideo(d.videos, d.videoPath, d.url);
        await sleep(1000);

        status('Vehicle type...');
        await fillDropdown(
            ['Vehicle type', 'vehicle type', 'Type', 'Category'],
            'Cars & Trucks',
            ['Car', 'Cars/Trucks', 'Cars and Trucks']
        );
        await waitFor(() => findTrigger(['Year', 'Model year', 'year']), 5000);
        await sleep(400);

        status('Year...');
        await fillDropdown(['Year', 'Model year', 'year'], d.year);
        await waitFor(() => findTrigger(['Make', 'Brand', 'make', 'Vehicle make']), 5000);
        await sleep(400);

        status('Make...');
        await fillDropdown(['Make', 'Brand', 'make', 'Vehicle make'], d.make);
        await sleep(500);
        await waitFor(() =>
            findTrigger(['Model', 'Vehicle model']) ||
            findInputByLabel(['Model', 'Vehicle model', 'model']), 5000);
        await sleep(400);

        status('Model...');
        const modelFilled = await fillDropdown(['Model', 'Vehicle model', 'model'], d.model);
        if (!modelFilled) {
            await fillText(['Model', 'model', 'Vehicle model'], d.model);
        }
        await sleep(600);

        if (d.trim) {
            status('Trim...');
            await fillText(['Trim', 'trim', 'Trim level'], d.trim);
            await sleep(400);
        }

        status('Mileage...');
        await fillText(
            ['Mileage', 'mileage', 'Miles', 'Odometer'],
            (d.mileage || '').replace(/[^\d]/g, '')
        );
        await sleep(300);

        status('Price...');
        await fillText(
            ['Price', 'price', 'Asking price'],
            (d.price || '').replace(/[^\d.]/g, '')
        );
        await sleep(300);

        status('Body style...');
        await fillDropdown(['Body style', 'body style', 'Body type'], bodyStyle);
        await sleep(700);

        status('Exterior color...');
        await fillDropdown(['Exterior color', 'exterior color', 'Color'], extColor);
        await sleep(700);

        status('Interior color...');
        await fillDropdown(['Interior color', 'interior color'], intColor);
        await sleep(700);

        status('Condition...');
        await fillDropdown(
            ['Condition', 'Vehicle condition', 'condition'],
            'Very good',
            ['Excellent', 'Good', 'Fair', 'Used - Like New']
        );
        await sleep(700);

        status('Transmission...');
        await fillDropdown(
            ['Transmission', 'transmission'],
            'Automatic',
            ['Auto', 'Automatic Transmission']
        );
        await sleep(700);

        status('Fuel type...');
        await fillDropdown(
            ['Fuel type', 'Fuel', 'fuel type'],
            'Gasoline',
            ['Gas', 'Petrol']
        );
        await sleep(700);

        status('Description...');
        await fillText(
            ['Description', 'description', 'Tell buyers', 'Additional details'],
            d.description || ''
        );
        await sleep(300);

        status('Clean title...');
        await tickCheckbox(['clean title', 'Clean title']);

        btn.textContent = 'Done! Review & submit';
        btn.style.background = '#42b72a';
        btn.disabled = false;
        setTimeout(() => {
            btn.textContent = 'Fill Listing (v18)';
            btn.style.background = '#1877f2';
        }, 10000);
    }
})();
