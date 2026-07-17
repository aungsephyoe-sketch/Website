// Facebook Marketplace vehicle auto-fill
// VERSION 7

(function () {
    if (document.getElementById('dm-fab')) return;

    // Confirm this version is loaded — check browser console for this message
    console.log('%c[DM] VERSION 7 LOADED', 'background:#1877f2;color:white;font-size:16px;padding:4px 8px');

    const btn = document.createElement('button');
    btn.id = 'dm-fab';
    btn.innerHTML = '🚗 Fill (v7)';
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
                alert('No data.\nGo to a dealer page, click the extension icon, then "Auto-Fill Marketplace".');
                return;
            }
            autofill(dealerListing);
        });
    });

    const sleep = ms => new Promise(r => setTimeout(r, ms));

    async function waitFor(fn, timeout = 6000) {
        const end = Date.now() + timeout;
        while (Date.now() < end) {
            const v = fn();
            if (v) return v;
            await sleep(150);
        }
        return null;
    }

    // Safe React value setter — guards against non-input elements
    function setVal(el, value) {
        try {
            if (!el) return;
            const tag = el.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
                const proto = tag === 'TEXTAREA' ? HTMLTextAreaElement.prototype
                            : tag === 'SELECT'   ? HTMLSelectElement.prototype
                            : HTMLInputElement.prototype;
                const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
                if (setter) setter.call(el, value);
            }
        } catch(e) {}
        try { el.dispatchEvent(new Event('input',  { bubbles: true })); } catch(e) {}
        try { el.dispatchEvent(new Event('change', { bubbles: true })); } catch(e) {}
    }

    // ── FIND DROPDOWN TRIGGER ──────────────────────────────────────────────────
    function findTrigger(labels) {
        for (const label of labels) {
            const lower = label.toLowerCase().trim();

            // 1. Native <select> whose first option or aria-label matches
            for (const sel of document.querySelectorAll('select')) {
                const a = (sel.getAttribute('aria-label') || '').toLowerCase();
                const first = (sel.options[0]?.text || '').toLowerCase();
                if (a.includes(lower) || first.includes(lower)) {
                    console.log('[DM] Found <select> for', label);
                    return sel;
                }
            }

            // 2. Element with exact aria-label match
            for (const el of document.querySelectorAll('[aria-label]')) {
                if (el.getAttribute('aria-label').toLowerCase().trim() === lower) {
                    console.log('[DM] Found aria-label exact for', label, el.tagName);
                    return el;
                }
            }

            // 3. role=combobox or role=button whose text content equals label
            for (const el of document.querySelectorAll('[role="combobox"],[role="button"],[role="listbox"]')) {
                const directText = [...el.childNodes]
                    .filter(n => n.nodeType === Node.TEXT_NODE)
                    .map(n => n.textContent.trim()).join('').toLowerCase();
                if (directText === lower) {
                    console.log('[DM] Found role el by direct text for', label);
                    return el;
                }
                if (el.textContent.trim().toLowerCase() === lower) {
                    console.log('[DM] Found role el by full text for', label);
                    return el;
                }
            }

            // 4. Any element with text equals label — return clickable ancestor
            for (const el of document.querySelectorAll('span, div, p')) {
                if (el.textContent.trim().toLowerCase() === lower) {
                    const ancestor = el.closest('[role="button"]')
                                  || el.closest('[role="combobox"]')
                                  || el.closest('button')
                                  || el.closest('select');
                    if (ancestor) {
                        console.log('[DM] Found via child text ancestor for', label);
                        return ancestor;
                    }
                }
            }

            // 5. Partial aria-label match
            for (const el of document.querySelectorAll('[aria-label]')) {
                if (el.getAttribute('aria-label').toLowerCase().includes(lower)) {
                    console.log('[DM] Found aria-label partial for', label, el.tagName);
                    return el;
                }
            }

            // 6. Partial text match on role elements
            for (const el of document.querySelectorAll('[role="button"],[role="combobox"]')) {
                if (el.textContent.trim().toLowerCase().includes(lower)) {
                    console.log('[DM] Found role partial text for', label);
                    return el;
                }
            }
        }

        console.warn('[DM] Could not find trigger for:', labels);
        return null;
    }

    // ── FIND TEXT INPUT ────────────────────────────────────────────────────────
    function findInput(labels) {
        for (const label of labels) {
            const lower = label.toLowerCase();
            for (const el of document.querySelectorAll('input, textarea')) {
                const a = (el.getAttribute('aria-label') || '').toLowerCase();
                const p = (el.getAttribute('placeholder') || '').toLowerCase();
                if (a.includes(lower) || p.includes(lower)) return el;
            }
        }
        return null;
    }

    // ── PICK OPTION FROM OPEN DROPDOWN ────────────────────────────────────────
    async function pickOption(values) {
        const lowers = (Array.isArray(values) ? values : [values]).map(v => v.toLowerCase().trim());
        console.log('[DM] Waiting for option:', lowers);

        const opt = await waitFor(() => {
            for (const sel of ['[role="option"]', '[role="menuitem"]', 'li[tabindex]', '[data-value]', 'li']) {
                for (const el of document.querySelectorAll(sel)) {
                    if (!el.offsetParent) continue;
                    const txt = el.textContent.trim().toLowerCase();
                    for (const lower of lowers) {
                        if (txt === lower || txt.startsWith(lower) || txt.includes(lower)) {
                            console.log('[DM] Found option:', JSON.stringify(txt));
                            return el;
                        }
                    }
                }
            }
            return null;
        }, 5000);

        if (opt) {
            opt.scrollIntoView({ block: 'nearest' });
            opt.click();
            await sleep(600);
            return true;
        }
        console.warn('[DM] Option not found for:', lowers);
        return false;
    }

    // ── FILL A TEXT FIELD ─────────────────────────────────────────────────────
    async function fillText(labels, value) {
        if (!value) return false;
        const el = findInput(labels);
        if (!el) { console.warn('[DM] Input not found for:', labels); return false; }
        el.click();
        el.focus();
        await sleep(150);
        setVal(el, value);
        try { document.execCommand('selectAll', false, null); document.execCommand('insertText', false, value); } catch(e) {}
        await sleep(200);
        return true;
    }

    // ── FILL A DROPDOWN ───────────────────────────────────────────────────────
    async function fillDropdown(labels, value, aliases) {
        if (!value) return false;
        const allValues = [value, ...(aliases || [])];

        for (const label of labels) {
            for (const sel of document.querySelectorAll('select')) {
                const a = (sel.getAttribute('aria-label') || '').toLowerCase();
                const first = (sel.options[0]?.text || '').toLowerCase();
                if (!a.includes(label.toLowerCase()) && !first.includes(label.toLowerCase())) continue;
                for (const v of allValues) {
                    for (const o of sel.options) {
                        if (o.text.toLowerCase().includes(v.toLowerCase())) {
                            console.log('[DM] Filling <select>', label, '=', o.text);
                            setVal(sel, o.value);
                            await sleep(600);
                            return true;
                        }
                    }
                }
            }
        }

        const trigger = findTrigger(labels);
        if (!trigger) return false;

        trigger.scrollIntoView({ block: 'center' });
        await sleep(300);
        trigger.click();
        await sleep(800);

        return await pickOption(allValues);
    }

    // ── TICK A CHECKBOX ───────────────────────────────────────────────────────
    async function tickCheckbox(labels) {
        for (const label of labels) {
            const lower = label.toLowerCase();
            for (const cb of document.querySelectorAll('input[type="checkbox"]')) {
                const lbl = cb.closest('label') || document.querySelector(`label[for="${cb.id}"]`);
                const txt = (lbl?.textContent || cb.getAttribute('aria-label') || '').toLowerCase();
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

    function guessBodyStyle(model) {
        const m = (model || '').toLowerCase();
        if (/escalade|tahoe|suburban|explorer|pilot|highlander|traverse|4runner|pathfinder|navigator|expedition|yukon|sequoia|armada|mdx|rdx|gx|lx|rx|rav4|cr-v|tucson|santa fe|equinox|blazer|bronco|terrain|edge/.test(m)) return 'SUV';
        if (/silverado|f-150|f150|tundra|tacoma|colorado|canyon|frontier|ranger|ridgeline|titan/.test(m)) return 'Truck';
        if (/camry|accord|civic|corolla|altima|sentra|malibu|sonata|elantra|jetta|passat/.test(m)) return 'Sedan';
        if (/mustang|camaro|challenger|corvette/.test(m)) return 'Coupe';
        if (/odyssey|sienna|pacifica|caravan|sedona/.test(m)) return 'Minivan';
        return 'SUV';
    }

    function status(msg) { btn.innerHTML = msg; }

    async function autofill(d) {
        btn.disabled = true;
        window.scrollTo(0, 0);
        await sleep(800);

        console.log('[DM] Filling with data:', JSON.stringify({
            year: d.year, make: d.make, model: d.model,
            price: d.price, mileage: d.mileage, color: d.color
        }));

        status('⏳ Vehicle type…');
        await fillDropdown(
            ['Vehicle type', 'vehicle type', 'Type'],
            'Cars & Trucks',
            ['Car', 'Cars/Trucks', 'Vehicles', 'cars & trucks']
        );
        await sleep(2000);

        status('⏳ Year…');
        await fillDropdown(['Year', 'Model year', 'year'], d.year);
        await sleep(4000);

        status('⏳ Make…');
        await fillDropdown(['Make', 'Brand', 'make', 'Vehicle make'], d.make);
        await sleep(4000);

        status('⏳ Model…');
        await fillDropdown(['Model', 'Vehicle model', 'model'], d.model);
        await sleep(2000);

        status('⏳ Price…');
        await fillText(['Price', 'Asking price', 'price'], (d.price || '').replace(/[^\d.]/g, ''));
        await sleep(400);

        status('⏳ Mileage…');
        await fillText(['Mileage', 'Miles', 'Odometer', 'mileage'], (d.mileage || '').replace(/[^\d]/g, ''));
        await sleep(400);

        status('⏳ Exterior color…');
        await fillDropdown(['Exterior color', 'Color', 'exterior color'], d.color);
        await sleep(1200);

        status('⏳ Interior color…');
        await fillDropdown(['Interior color', 'interior color'], d.color);
        await sleep(1200);

        status('⏳ Body style…');
        await fillDropdown(['Body style', 'Body type', 'body style'], guessBodyStyle(d.model));
        await sleep(1200);

        status('⏳ Condition…');
        await fillDropdown(['Condition', 'Vehicle condition', 'condition'], 'Very good');
        await sleep(1200);

        status('⏳ Fuel type…');
        await fillDropdown(['Fuel type', 'Fuel', 'fuel type'], 'Gasoline');
        await sleep(1200);

        status('⏳ Description…');
        await fillText(['Description', 'Tell buyers', 'Additional details', 'description'], d.description || '');
        await sleep(400);

        status('⏳ Clean title…');
        await tickCheckbox(['clean title', 'Clean title']);

        btn.innerHTML = '✅ Done! Review & submit';
        btn.style.background = '#42b72a';
        setTimeout(() => {
            btn.innerHTML = '🚗 Fill (v7)';
            btn.style.background = '#1877f2';
            btn.disabled = false;
        }, 6000);
    }
})();
