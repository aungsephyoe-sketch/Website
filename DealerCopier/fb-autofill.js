// Facebook Marketplace vehicle auto-fill
// VERSION 18

(function () {
    if (document.getElementById('dm-fab')) return;

    console.log('%c[DM] VERSION 18 LOADED', 'background:green;color:white;font-size:16px;padding:4px 8px');

    const btn = document.createElement('button');
    btn.id = 'dm-fab';
    btn.textContent = 'Fill (v18)';
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
            await sleep(200);
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
        if (/black/.test(r))                           return 'Black';
        if (/white|pearl|ivory/.test(r))               return 'White';
        if (/silver|chrome|aluminum|platinum/.test(r)) return 'Silver';
        if (/gray|grey|graphite|charcoal/.test(r))     return 'Gray';
        if (/red|crimson|burgundy|maroon/.test(r))     return 'Red';
        if (/blue|navy|cobalt|azure/.test(r))          return 'Blue';
        if (/green|olive|forest/.test(r))              return 'Green';
        if (/orange/.test(r))                          return 'Orange';
        if (/yellow/.test(r))                          return 'Yellow';
        if (/brown|tan|copper|bronze/.test(r))         return 'Brown';
        if (/beige|cream|sand|champagne/.test(r))      return 'Beige';
        if (/purple|violet|lavender/.test(r))          return 'Purple';
        if (/gold/.test(r))                            return 'Gold';
        return raw;
    }

    function findInputByLabel(labels) {
        for (const label of labels) {
            const lower = label.toLowerCase();

            for (const el of document.querySelectorAll('input, textarea')) {
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

        if (!el) { console.warn('[DM] Text input not found:', labels); return false; }

        console.log('[DM] fillText:', labels[0], '=', String(value).slice(0, 60));
        el.scrollIntoView({ block: 'center' });
        await sleep(200);
        el.click();
        el.focus();
        await sleep(300);

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

    function findTrigger(labels) {
        for (const label of labels) {
            const lower = label.toLowerCase().trim();

            for (const el of document.querySelectorAll('select')) {
                const a = (el.getAttribute('aria-label') || '').toLowerCase();
                const first = (el.options[0] ? el.options[0].text : '').toLowerCase();
                if (a.includes(lower) || first.includes(lower)) return el;
            }
            for (const el of document.querySelectorAll('[aria-label]')) {
                if (el.getAttribute('aria-label').toLowerCase().trim() === lower) return el;
            }
            for (const el of document.querySelectorAll('[role="combobox"],[role="button"],[role="listbox"]')) {
                if (el.textContent.trim().toLowerCase() === lower) return el;
            }
            for (const el of document.querySelectorAll('span,div,p,label')) {
                if (el.textContent.trim().toLowerCase() === lower) {
                    const anc = el.closest('[role="button"]') || el.closest('[role="combobox"]')
                              || el.closest('button') || el.closest('select');
                    if (anc) return anc;
                }
            }
            for (const el of document.querySelectorAll('[aria-label]')) {
                if (el.getAttribute('aria-label').toLowerCase().includes(lower)) return el;
            }
            for (const el of document.querySelectorAll('[role="button"],[role="combobox"]')) {
                if (el.textContent.trim().toLowerCase().includes(lower)) return el;
            }
        }
        console.warn('[DM] Trigger not found:', labels);
        return null;
    }

    async function pickOption(values) {
        const lowers = (Array.isArray(values) ? values : [values]).map(v => v.toLowerCase().trim());
        console.log('[DM] pickOption:', lowers[0]);

        const opt = await waitFor(() => {
            const selectors = ['[role="option"]', '[role="menuitem"]', 'li[tabindex]', '[data-value]', 'li'];
            for (const sel of selectors) {
                for (const el of document.querySelectorAll(sel)) {
                    const txt = el.textContent.trim().toLowerCase();
                    for (const lower of lowers) {
                        if (txt === lower || txt.startsWith(lower) || txt.includes(lower)) {
                            console.log('[DM] option found:', txt);
                            return el;
                        }
                    }
                }
            }
            return null;
        }, 6000);

        if (opt) {
            opt.scrollIntoView({ block: 'nearest' });
            opt.click();
            await sleep(800);
            return true;
        }
        console.warn('[DM] option not found:', lowers[0]);
        return false;
    }

    async function fillDropdown(labels, value, aliases) {
        if (!value) return false;
        const allValues = [value, ...(aliases || [])];
        console.log('[DM] fillDropdown:', labels[0], '=', value);

        for (const label of labels) {
            for (const sel of document.querySelectorAll('select')) {
                const a = (sel.getAttribute('aria-label') || '').toLowerCase();
                const first = (sel.options[0] ? sel.options[0].text : '').toLowerCase();
                if (!a.includes(label.toLowerCase()) && !first.includes(label.toLowerCase())) continue;
                for (const v of allValues) {
                    for (const o of sel.options) {
                        if (o.text.toLowerCase().includes(v.toLowerCase())) {
                            console.log('[DM] select option:', o.text);
                            setReact(sel, o.value);
                            await sleep(700);
                            return true;
                        }
                    }
                }
            }
        }

        const trigger = await waitFor(() => findTrigger(labels), 6000);
        if (!trigger) return false;

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

    function guessBodyStyle(model, trim) {
        const m = ((model || '') + ' ' + (trim || '')).toLowerCase();
        if (/odyssey|sienna|pacifica|caravan|sedona|minivan|mini-van/.test(m)) return 'Minivan';
        if (/silverado|f-150|f150|tundra|tacoma|colorado|canyon|frontier|ranger|ridgeline|titan|ram 1500|ram 2500|ram 3500|\bpickup\b|\btruck\b/.test(m)) return 'Truck';
        if (/escalade|tahoe|suburban|explorer|pilot|highlander|traverse|4runner|pathfinder|navigator|expedition|yukon|sequoia|armada|mdx|rdx|gx\b|lx\b|rx\b|rav4|cr-v|crv|tucson|santa fe|equinox|blazer|bronco|terrain|edge|trailblazer|enclave|acadia|atlas|tiguan|rogue|murano|qashqai|cx-5|cx-9|forester|outback|ascent|trax|encore|envoy|captiva|passport|hr-v|hrv|cx-30|cx-3|bravada|envision|kona|venue|palisade|telluride|sorento|sportage|seltos|soul|niro|juke|kicks|xterra|x-trail|bolt\b|tracker|\bsuv\b|crossover|4wd|awd/.test(m)) return 'SUV';
        if (/mustang|camaro|challenger|corvette|charger|86|brz|miata|370z|400z|\bcoupe\b|2-door|2dr/.test(m)) return 'Coupe';
        if (/convert|cabriolet|roadster/.test(m)) return 'Convertible';
        if (/hatchback|hatch|golf|fit\b|yaris|versa note|accent hatch/.test(m)) return 'Hatchback';
        if (/wagon|estate|sport wagon/.test(m)) return 'Wagon';
        if (/camry|accord|civic|corolla|altima|sentra|malibu|sonata|elantra|jetta|passat|fusion|impala|charger|300\b|maxima|avalon|legacy|impreza|optima|k5|stinger|a4|a6|3 series|5 series|c-class|e-class|isf?\b|gs\b|es\b|\bsedan\b|4-door|4dr/.test(m)) return 'Sedan';
        return 'Sedan';
    }

    function status(msg) { btn.textContent = msg; console.log('[DM]', msg); }

    async function autofill(d) {
        btn.disabled = true;
        window.scrollTo(0, 0);
        await sleep(800);

        const extColor = normalizeColor(d.color);
        const intColor = normalizeColor(d.interiorColor) || 'Black';
        const transmission = d.transmission || 'Automatic';
        const bodyStyle = d.bodyStyle || guessBodyStyle(d.model, d.trim);
        console.log('[DM] Data:', JSON.stringify({ year: d.year, make: d.make, model: d.model, trim: d.trim, bodyStyle, price: d.price, mileage: d.mileage, extColor, intColor, transmission }));

        status('Vehicle type...');
        await fillDropdown(['Vehicle type', 'vehicle type', 'Type'], 'Cars & Trucks', ['Car', 'Cars/Trucks']);
        await waitFor(() => findTrigger(['Year', 'Model year', 'year']), 5000);
        await sleep(300);

        status('Year...');
        await fillDropdown(['Year', 'Model year', 'year'], d.year);
        await waitFor(() => findTrigger(['Make', 'Brand', 'make', 'Vehicle make']), 5000);
        await sleep(300);

        status('Make...');
        await fillDropdown(['Make', 'Brand', 'make', 'Vehicle make'], d.make);
        await waitFor(() => findInputByLabel(['Model', 'model', 'Vehicle model']), 5000);
        await sleep(300);

        status('Model...');
        await fillText(['Model', 'model', 'Vehicle model'], d.model);
        await sleep(600);

        status('Mileage...');
        await fillText(['Mileage', 'mileage', 'Miles', 'Odometer'], (d.mileage || '').replace(/[^\d]/g, ''));
        await sleep(300);

        status('Price...');
        await fillText(['Price', 'price', 'Asking price'], (d.price || '').replace(/[^\d.]/g, ''));
        await sleep(300);

        status('Body style...');
        await fillDropdown(['Body style', 'body style', 'Body type'], bodyStyle);
        await sleep(800);

        status('Exterior color...');
        await fillDropdown(['Exterior color', 'exterior color', 'Color'], extColor);
        await sleep(800);

        status('Interior color...');
        await fillDropdown(['Interior color', 'interior color'], intColor);
        await sleep(800);

        status('Condition...');
        await fillDropdown(['Condition', 'Vehicle condition', 'condition'], 'Very good');
        await sleep(800);

        status('Transmission...');
        await fillDropdown(['Transmission', 'transmission'], transmission, ['Auto', 'Automatic Transmission', 'Manual Transmission']);
        await sleep(800);

        status('Fuel type...');
        await fillDropdown(['Fuel type', 'Fuel', 'fuel type'], 'Gasoline');
        await sleep(800);

        status('Description...');
        await fillText(['Description', 'description', 'Tell buyers', 'Additional details'], d.description || '');
        await sleep(300);

        status('Clean title...');
        await tickCheckbox(['clean title', 'Clean title']);

        btn.textContent = 'Done! Review and submit';
        btn.style.background = '#42b72a';
        setTimeout(() => {
            btn.textContent = 'Fill (v18)';
            btn.style.background = '#1877f2';
            btn.disabled = false;
        }, 8000);
    }
})();
