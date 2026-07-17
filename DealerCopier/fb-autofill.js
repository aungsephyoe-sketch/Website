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
                alert('No data found.\nGo to a dealer page, click the extension icon, then "Auto-Fill Marketplace".');
                return;
            }
            autofill(dealerListing);
        });
    });

    const sleep = ms => new Promise(r => setTimeout(r, ms));

    async function waitUntil(fn, timeout = 5000) {
        const start = Date.now();
        while (Date.now() - start < timeout) {
            const result = fn();
            if (result) return result;
            await sleep(200);
        }
        return null;
    }

    function findSelect(hints) {
        for (const hint of hints) {
            for (const sel of document.querySelectorAll('select')) {
                const lbl = (sel.getAttribute('aria-label') || '').toLowerCase();
                if (lbl.includes(hint.toLowerCase())) return sel;
            }
        }
        return null;
    }

    function findInput(hints) {
        for (const hint of hints) {
            for (const el of document.querySelectorAll('input, textarea')) {
                const lbl = (el.getAttribute('aria-label') || el.getAttribute('placeholder') || '').toLowerCase();
                if (lbl.includes(hint.toLowerCase())) return el;
            }
        }
        return null;
    }

    function setSelect(sel, value) {
        for (const opt of sel.options) {
            const text = opt.text.trim().toLowerCase();
            const val = opt.value.trim().toLowerCase();
            const search = value.toLowerCase();
            if (text === search || text.startsWith(search) || val === search) {
                const nativeSetter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
                nativeSetter.call(sel, opt.value);
                sel.dispatchEvent(new Event('input', { bubbles: true }));
                sel.dispatchEvent(new Event('change', { bubbles: true }));
                return true;
            }
        }
        for (const opt of sel.options) {
            if (opt.text.trim().toLowerCase().includes(value.toLowerCase())) {
                const nativeSetter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
                nativeSetter.call(sel, opt.value);
                sel.dispatchEvent(new Event('input', { bubbles: true }));
                sel.dispatchEvent(new Event('change', { bubbles: true }));
                return true;
            }
        }
        return false;
    }

    function setInput(el, value) {
        const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        if (setter) setter.call(el, value);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
    }

    async function pickOption(value, timeout = 3000) {
        const picked = await waitUntil(() => {
            for (const opt of document.querySelectorAll('[role="option"], [role="listitem"], li[tabindex], li[role="option"]')) {
                if (opt.textContent.trim().toLowerCase().includes(value.toLowerCase())) return opt;
            }
            return null;
        }, timeout);
        if (picked) { picked.click(); await sleep(600); return true; }
        return false;
    }

    async function fillCascadeSelect(hints, value, waitAfter = 1500) {
        if (!value) return false;
        const sel = await waitUntil(() => {
            const s = findSelect(hints);
            if (s && s.options.length > 2) return s;
            return null;
        }, 6000);
        if (!sel) return false;
        const ok = setSelect(sel, value);
        if (ok) { await sleep(waitAfter); return true; }
        return false;
    }

    async function fillCustomDropdown(hints, value) {
        if (!value) return false;
        const sel = findSelect(hints);
        if (sel && sel.options.length > 1) {
            if (setSelect(sel, value)) { await sleep(600); return true; }
        }
        let trigger = null;
        for (const hint of hints) {
            trigger = document.querySelector(`[aria-label*="${hint}" i]`);
            if (trigger) break;
        }
        if (!trigger) return false;
        trigger.click();
        await sleep(1000);
        return await pickOption(value, 2000);
    }

    async function fillTextField(hints, value) {
        if (!value) return false;
        const el = findInput(hints);
        if (!el) return false;
        el.focus();
        await sleep(100);
        setInput(el, value);
        await sleep(300);
        return true;
    }

    async function tickCheckbox(hints) {
        for (const hint of hints) {
            for (const cb of document.querySelectorAll('input[type="checkbox"]')) {
                const lbl = cb.closest('label') || document.querySelector(`label[for="${cb.id}"]`);
                const txt = (lbl?.textContent || cb.getAttribute('aria-label') || '').toLowerCase();
                if (txt.includes(hint.toLowerCase())) {
                    if (!cb.checked) cb.click();
                    await sleep(200);
                    return true;
                }
            }
            for (const cb of document.querySelectorAll('[role="checkbox"]')) {
                const txt = (cb.getAttribute('aria-label') || cb.textContent || '').toLowerCase();
                if (txt.includes(hint.toLowerCase())) {
                    if (cb.getAttribute('aria-checked') !== 'true') cb.click();
                    await sleep(200);
                    return true;
                }
            }
        }
        return false;
    }

    function guessBodyStyle(model) {
        const m = (model || '').toLowerCase();
        if (/escalade|tahoe|suburban|explorer|pilot|highlander|traverse|4runner|pathfinder|navigator|expedition|yukon|sequoia|armada|mdx|rdx|gx|lx|rx|rav4|cr-v|tucson|santa fe|equinox|blazer|bronco/.test(m)) return 'SUV';
        if (/silverado|f-150|f150|tundra|tacoma|colorado|canyon|frontier|ranger|ridgeline|titan/.test(m)) return 'Truck';
        if (/camry|accord|civic|corolla|altima|sentra|malibu|sonata|elantra|jetta|passat/.test(m)) return 'Sedan';
        if (/mustang|camaro|challenger|corvette/.test(m)) return 'Coupe';
        if (/odyssey|sienna|pacifica|caravan|sedona/.test(m)) return 'Minivan';
        return 'SUV';
    }

    async function autofill(d) {
        btn.innerHTML = '⏳ Filling…';
        btn.disabled = true;

        window.scrollTo(0, 0);
        await sleep(600);

        // Vehicle type → Car
        await fillCascadeSelect(['Vehicle type', 'Type'], 'Car', 1000);
        await sleep(500);

        // Year — wait 2s after for Make options to load
        await fillCascadeSelect(['Year', 'Model year'], d.year, 2000);

        // Make — wait 2s after for Model options to load
        await fillCascadeSelect(['Make', 'Brand'], d.make, 2000);

        // Model
        await fillCascadeSelect(['Model'], d.model, 1000);

        // Price
        await fillTextField(['Price', 'Asking price'], (d.price || '').replace(/[^\d.]/g, ''));
        await sleep(300);

        // Mileage
        await fillTextField(['Mileage', 'Miles', 'Odometer'], (d.mileage || '').replace(/[^\d]/g, ''));
        await sleep(300);

        // Exterior color
        await fillCustomDropdown(['Exterior color', 'Color'], d.color);
        await sleep(500);

        // Interior color
        await fillCustomDropdown(['Interior color'], d.color);
        await sleep(500);

        // Body style
        await fillCustomDropdown(['Body style', 'Body type'], guessBodyStyle(d.model));
        await sleep(500);

        // Condition — always Very good
        await fillCustomDropdown(['Condition', 'Vehicle condition'], 'Very good');
        await sleep(500);

        // Fuel type — always Gasoline
        await fillCustomDropdown(['Fuel', 'Fuel type'], 'Gasoline');
        await sleep(500);

        // Description
        await fillTextField(['Description', 'Tell buyers', 'Additional'], d.description || '');
        await sleep(300);

        // Clean title
        await tickCheckbox(['clean title', 'Clean title']);

        btn.innerHTML = '✅ Done! Scroll up to review';
        btn.style.background = '#42b72a';
        setTimeout(() => {
            btn.innerHTML = '🚗 Insert Vehicle Data';
            btn.style.background = '#1877f2';
            btn.disabled = false;
        }, 5000);
    }
})();
