// Facebook Marketplace vehicle auto-fill

(function () {
    if (document.getElementById('dm-fab')) return;

    const btn = document.createElement('button');
    btn.id = 'dm-fab';
    btn.innerHTML = '🚗 Insert Vehicle Data';
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
                alert('No data.\nGo to a dealer page, click the extension, then "Auto-Fill Marketplace".');
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

    // Set value on a React input/textarea — only works on real form elements
    function setReactValue(el, value) {
        try {
            const tag = el.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
                const proto = tag === 'TEXTAREA' ? HTMLTextAreaElement.prototype
                            : tag === 'SELECT'   ? HTMLSelectElement.prototype
                            : HTMLInputElement.prototype;
                const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
                if (setter) setter.call(el, value);
            }
            el.dispatchEvent(new Event('input',  { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        } catch(e) {}
    }

    // Find ANY element whose aria-label or placeholder contains the hint
    function findByLabel(hints) {
        for (const hint of hints) {
            const lower = hint.toLowerCase();
            for (const el of document.querySelectorAll('[aria-label]')) {
                if (el.getAttribute('aria-label').toLowerCase() === lower) return el;
            }
            for (const el of document.querySelectorAll('[aria-label]')) {
                if (el.getAttribute('aria-label').toLowerCase().includes(lower)) return el;
            }
            for (const el of document.querySelectorAll('[placeholder]')) {
                if (el.getAttribute('placeholder').toLowerCase().includes(lower)) return el;
            }
        }
        return null;
    }

    // Click an option from an open dropdown list
    async function pickOption(value) {
        const lower = value.toLowerCase().trim();
        const opt = await waitFor(() => {
            for (const el of document.querySelectorAll(
                '[role="option"], [role="menuitem"], li[tabindex], [data-value]'
            )) {
                const txt = el.textContent.trim().toLowerCase();
                if (txt === lower || txt.startsWith(lower)) return el;
            }
            return null;
        }, 5000);

        if (opt) { opt.scrollIntoView({ block: 'nearest' }); opt.click(); await sleep(600); return true; }

        // Broader scan
        for (const el of document.querySelectorAll('li, [role="option"], [role="menuitem"]')) {
            if (el.textContent.trim().toLowerCase().includes(lower)) {
                el.scrollIntoView({ block: 'nearest' }); el.click(); await sleep(500); return true;
            }
        }
        return false;
    }

    async function fillText(hints, value) {
        if (!value) return false;
        const el = findByLabel(hints);
        if (!el) return false;
        el.click(); el.focus();
        await sleep(150);
        setReactValue(el, value);
        // Also try execCommand for React
        try { document.execCommand('selectAll', false, null); document.execCommand('insertText', false, value); } catch(e) {}
        await sleep(200);
        return true;
    }

    async function fillDropdown(hints, value) {
        if (!value) return false;

        // Try native <select> first
        for (const hint of hints) {
            for (const sel of document.querySelectorAll('select')) {
                const lbl = (sel.getAttribute('aria-label') || '').toLowerCase();
                if (!lbl.includes(hint.toLowerCase())) continue;
                for (const opt of sel.options) {
                    if (opt.text.trim().toLowerCase().includes(value.toLowerCase())) {
                        setReactValue(sel, opt.value);
                        await sleep(600);
                        return true;
                    }
                }
            }
        }

        // Find trigger
        const field = findByLabel(hints);
        if (!field) { console.warn('[DM] No field found for:', hints); return false; }

        console.log('[DM] Found field for', hints[0], ':', field.tagName, JSON.stringify(field.getAttribute('aria-label')));

        field.scrollIntoView({ block: 'center' });
        await sleep(300);
        field.click();
        field.focus();
        await sleep(600);

        // If it's a text input, type to filter
        if (field.tagName === 'INPUT' || field.tagName === 'TEXTAREA' ||
            field.getAttribute('role') === 'combobox') {
            setReactValue(field, value);
            try { document.execCommand('selectAll', false, null); document.execCommand('insertText', false, value); } catch(e) {}
            await sleep(800);
        }

        const picked = await pickOption(value);
        if (picked) return true;

        // Try clicking a parent [role=button] if field itself wasn't the trigger
        const parent = field.closest('[role="button"]') || field.closest('[aria-haspopup]') || field.parentElement;
        if (parent && parent !== field) {
            parent.click();
            await sleep(600);
            return await pickOption(value);
        }

        console.warn('[DM] Could not pick:', value);
        return false;
    }

    async function tickCheckbox(hints) {
        for (const hint of hints) {
            for (const cb of document.querySelectorAll('input[type="checkbox"]')) {
                const lbl = cb.closest('label') || document.querySelector(`label[for="${cb.id}"]`);
                const txt = (lbl?.textContent || cb.getAttribute('aria-label') || '').toLowerCase();
                if (txt.includes(hint.toLowerCase())) { if (!cb.checked) cb.click(); await sleep(200); return true; }
            }
            for (const cb of document.querySelectorAll('[role="checkbox"]')) {
                const txt = (cb.getAttribute('aria-label') || cb.textContent || '').toLowerCase();
                if (txt.includes(hint.toLowerCase())) {
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

    // Dump all aria-labels on the page to console so we know exactly what Facebook uses
    function dumpLabels() {
        const labels = [...document.querySelectorAll('[aria-label]')]
            .map(el => `${el.tagName}[role=${el.getAttribute('role')}]: "${el.getAttribute('aria-label')}"`)
            .filter((v, i, a) => a.indexOf(v) === i);
        console.log('[DM] All aria-labels on page:\n' + labels.join('\n'));
    }

    function status(msg) { btn.innerHTML = msg; }

    async function autofill(d) {
        btn.disabled = true;
        window.scrollTo(0, 0);
        await sleep(800);
        dumpLabels(); // log all labels so we can debug

        status('⏳ Vehicle type…');
        await fillDropdown(['Vehicle type', 'vehicle type', 'Type of vehicle', 'type'], 'Car');
        await sleep(1500);

        status('⏳ Year…');
        await fillDropdown(['Year', 'year', 'Model year', 'model year', 'Vehicle year'], d.year);
        await sleep(3500);

        status('⏳ Make…');
        await fillDropdown(['Make', 'make', 'Vehicle make', 'vehicle make', 'Brand'], d.make);
        await sleep(3500);

        status('⏳ Model…');
        await fillDropdown(['Model', 'model', 'Vehicle model', 'vehicle model'], d.model);
        await sleep(1500);

        status('⏳ Price…');
        await fillText(['Price', 'price', 'Asking price'], (d.price || '').replace(/[^\d.]/g, ''));
        await sleep(400);

        status('⏳ Mileage…');
        await fillText(['Mileage', 'mileage', 'Miles', 'Odometer'], (d.mileage || '').replace(/[^\d]/g, ''));
        await sleep(400);

        status('⏳ Exterior color…');
        await fillDropdown(['Exterior color', 'exterior color', 'Color'], d.color);
        await sleep(1200);

        status('⏳ Interior color…');
        await fillDropdown(['Interior color', 'interior color'], d.color);
        await sleep(1200);

        status('⏳ Body style…');
        await fillDropdown(['Body style', 'body style', 'Body type'], guessBodyStyle(d.model));
        await sleep(1200);

        status('⏳ Condition…');
        await fillDropdown(['Condition', 'condition', 'Vehicle condition'], 'Very good');
        await sleep(1200);

        status('⏳ Fuel type…');
        await fillDropdown(['Fuel type', 'fuel type', 'Fuel'], 'Gasoline');
        await sleep(1200);

        status('⏳ Description…');
        await fillText(['Description', 'description', 'Tell buyers', 'Additional'], d.description || '');
        await sleep(400);

        status('⏳ Clean title…');
        await tickCheckbox(['clean title', 'Clean title']);

        btn.innerHTML = '✅ Done! Review & submit';
        btn.style.background = '#42b72a';
        setTimeout(() => {
            btn.innerHTML = '🚗 Insert Vehicle Data';
            btn.style.background = '#1877f2';
            btn.disabled = false;
        }, 6000);
    }
})();
