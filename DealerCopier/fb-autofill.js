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

    // Set value on React inputs only (guards against non-input elements)
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

    // Find a dropdown trigger by its VISIBLE TEXT (what the button shows when empty, e.g. "Year")
    // Facebook dropdowns show the field name as placeholder text inside the button
    function findDropdownByText(labels) {
        for (const label of labels) {
            const lower = label.toLowerCase().trim();
            // Check role=button / role=combobox elements whose text content matches
            for (const tag of ['[role="combobox"]', '[role="button"]', 'button', 'select']) {
                for (const el of document.querySelectorAll(tag)) {
                    const txt = (el.textContent || '').trim().toLowerCase();
                    if (txt === lower) return el;
                }
            }
            // Fallback: any element whose aria-label matches
            for (const el of document.querySelectorAll('[aria-label]')) {
                if (el.getAttribute('aria-label').toLowerCase().trim() === lower) return el;
            }
            // Fallback partial text match on role=button
            for (const el of document.querySelectorAll('[role="button"], [role="combobox"]')) {
                const txt = (el.textContent || '').trim().toLowerCase();
                if (txt.startsWith(lower) || txt.includes(lower)) return el;
            }
        }
        return null;
    }

    // Find a text input by aria-label or placeholder
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

    // After opening a dropdown, click the matching option
    async function pickOption(values) {
        const lowers = (Array.isArray(values) ? values : [values]).map(v => v.toLowerCase().trim());

        const opt = await waitFor(() => {
            for (const sel of ['[role="option"]', '[role="menuitem"]', 'li[tabindex]', '[data-value]']) {
                for (const el of document.querySelectorAll(sel)) {
                    const txt = el.textContent.trim().toLowerCase();
                    for (const lower of lowers) {
                        if (txt === lower || txt.startsWith(lower) || txt.includes(lower)) return el;
                    }
                }
            }
            return null;
        }, 5000);

        if (opt) { opt.scrollIntoView({ block: 'nearest' }); opt.click(); await sleep(600); return true; }
        return false;
    }

    async function fillText(labels, value) {
        if (!value) return false;
        // Try aria-label/placeholder input first
        let el = findInput(labels);
        // Fallback: any element with matching aria-label
        if (!el) {
            for (const label of labels) {
                const lower = label.toLowerCase();
                for (const e of document.querySelectorAll('[aria-label]')) {
                    if (e.getAttribute('aria-label').toLowerCase().includes(lower)) { el = e; break; }
                }
                if (el) break;
            }
        }
        if (!el) return false;
        el.click(); el.focus();
        await sleep(150);
        setReactValue(el, value);
        try { document.execCommand('selectAll', false, null); document.execCommand('insertText', false, value); } catch(e) {}
        await sleep(200);
        return true;
    }

    async function fillDropdown(labels, value, optionAliases) {
        if (!value) return false;
        const allOptions = [value, ...(optionAliases || [])];

        // Try native <select> first
        for (const label of labels) {
            for (const sel of document.querySelectorAll('select')) {
                const a = (sel.getAttribute('aria-label') || '').toLowerCase();
                const placeholder = [...sel.options].find(o => o.value === '')?.text || '';
                if (!a.includes(label.toLowerCase()) && !placeholder.toLowerCase().includes(label.toLowerCase())) continue;
                for (const opt of allOptions) {
                    for (const o of sel.options) {
                        if (o.text.trim().toLowerCase().includes(opt.toLowerCase())) {
                            setReactValue(sel, o.value);
                            await sleep(600);
                            return true;
                        }
                    }
                }
            }
        }

        // Find the custom dropdown trigger
        const field = findDropdownByText(labels);
        if (!field) { console.warn('[DM] Could not find dropdown:', labels); return false; }

        console.log('[DM] Clicking:', labels[0], '| found:', field.tagName, JSON.stringify((field.textContent||'').trim().slice(0,40)));

        field.scrollIntoView({ block: 'center' });
        await sleep(300);
        field.click();
        await sleep(700);

        return await pickOption(allOptions);
    }

    async function tickCheckbox(labels) {
        for (const label of labels) {
            for (const cb of document.querySelectorAll('input[type="checkbox"]')) {
                const lbl = cb.closest('label') || document.querySelector(`label[for="${cb.id}"]`);
                const txt = (lbl?.textContent || cb.getAttribute('aria-label') || '').toLowerCase();
                if (txt.includes(label.toLowerCase())) { if (!cb.checked) cb.click(); await sleep(200); return true; }
            }
            for (const cb of document.querySelectorAll('[role="checkbox"]')) {
                const txt = (cb.getAttribute('aria-label') || cb.textContent || '').toLowerCase();
                if (txt.includes(label.toLowerCase())) {
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

        // Vehicle type — option might be "Cars & Trucks" or "Car" or "Vehicles"
        status('⏳ Vehicle type…');
        await fillDropdown(['Vehicle type', 'Type'], 'Car', ['Cars & Trucks', 'Cars/Trucks', 'Vehicles']);
        await sleep(1500);

        // Year — wait for cascade to load
        status('⏳ Year…');
        await fillDropdown(['Year', 'Model year'], d.year);
        await sleep(3500);

        // Make
        status('⏳ Make…');
        await fillDropdown(['Make', 'Brand'], d.make);
        await sleep(3500);

        // Model
        status('⏳ Model…');
        await fillDropdown(['Model'], d.model);
        await sleep(1500);

        // Price
        status('⏳ Price…');
        await fillText(['Price', 'Asking price', 'price'], (d.price || '').replace(/[^\d.]/g, ''));
        await sleep(400);

        // Mileage
        status('⏳ Mileage…');
        await fillText(['Mileage', 'Miles', 'Odometer', 'mileage'], (d.mileage || '').replace(/[^\d]/g, ''));
        await sleep(400);

        // Exterior color
        status('⏳ Exterior color…');
        await fillDropdown(['Exterior color', 'Color'], d.color);
        await sleep(1200);

        // Interior color
        status('⏳ Interior color…');
        await fillDropdown(['Interior color'], d.color);
        await sleep(1200);

        // Body style
        status('⏳ Body style…');
        await fillDropdown(['Body style', 'Body type'], guessBodyStyle(d.model));
        await sleep(1200);

        // Condition
        status('⏳ Condition…');
        await fillDropdown(['Condition', 'Vehicle condition'], 'Very good');
        await sleep(1200);

        // Fuel type
        status('⏳ Fuel type…');
        await fillDropdown(['Fuel type', 'Fuel'], 'Gasoline');
        await sleep(1200);

        // Description
        status('⏳ Description…');
        await fillText(['Description', 'Tell buyers', 'Additional details', 'description'], d.description || '');
        await sleep(400);

        // Clean title
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
