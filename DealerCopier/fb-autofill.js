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
                alert('No data found.\nGo to a dealer page first, click the extension, then "Auto-Fill Marketplace".');
                return;
            }
            autofill(dealerListing);
        });
    });

    const sleep = ms => new Promise(r => setTimeout(r, ms));

    async function waitUntil(fn, timeout = 5000) {
        const start = Date.now();
        while (Date.now() - start < timeout) {
            const v = fn();
            if (v) return v;
            await sleep(150);
        }
        return null;
    }

    function findEl(hints) {
        for (const hint of hints) {
            const lower = hint.toLowerCase();
            for (const el of document.querySelectorAll(
                'input, textarea, select, [role="combobox"], [role="listbox"], [role="button"]'
            )) {
                const lbl = (
                    el.getAttribute('aria-label') ||
                    el.getAttribute('placeholder') || ''
                ).toLowerCase();
                if (lbl.includes(lower)) return el;
            }
        }
        return null;
    }

    function setReactValue(el, value) {
        const proto = el.tagName === 'TEXTAREA'
            ? HTMLTextAreaElement.prototype
            : HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        if (setter) setter.call(el, value);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
    }

    async function fillText(hints, value) {
        if (!value) return false;
        const el = findEl(hints);
        if (!el) return false;
        el.focus();
        el.click();
        await sleep(150);
        setReactValue(el, value);
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
                    if (opt.text.toLowerCase().includes(value.toLowerCase())) {
                        const s = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
                        s.call(sel, opt.value);
                        sel.dispatchEvent(new Event('input', { bubbles: true }));
                        sel.dispatchEvent(new Event('change', { bubbles: true }));
                        await sleep(400);
                        return true;
                    }
                }
            }
        }

        // Custom React dropdown
        const field = findEl(hints);
        if (!field) return false;

        field.click();
        field.focus();
        await sleep(300);
        setReactValue(field, value);
        field.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: value[0] }));
        field.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: value[0] }));
        await sleep(1000);

        const opt = await waitUntil(() => {
            for (const el of document.querySelectorAll(
                '[role="option"], [role="listitem"], li[tabindex], li[role="option"]'
            )) {
                if (el.textContent.trim().toLowerCase().includes(value.toLowerCase())) return el;
            }
            return null;
        }, 3000);

        if (opt) { opt.click(); await sleep(700); return true; }

        for (const el of document.querySelectorAll('li, [role="option"]')) {
            if (el.textContent.trim().toLowerCase().includes(value.toLowerCase())) {
                el.click(); await sleep(500); return true;
            }
        }
        return false;
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
        await sleep(800);

        await fillDropdown(['Vehicle type', 'Type'], 'Car');
        await sleep(1000);

        await fillDropdown(['Year', 'Model year'], d.year);
        await sleep(2500);

        await fillDropdown(['Make', 'Brand'], d.make);
        await sleep(2500);

        await fillDropdown(['Model'], d.model);
        await sleep(1000);

        await fillText(['Price', 'Asking price'], (d.price || '').replace(/[^\d.]/g, ''));
        await sleep(300);

        await fillText(['Mileage', 'Miles', 'Odometer'], (d.mileage || '').replace(/[^\d]/g, ''));
        await sleep(300);

        await fillDropdown(['Exterior color', 'Color'], d.color);
        await sleep(800);

        await fillDropdown(['Interior color'], d.color);
        await sleep(800);

        await fillDropdown(['Body style', 'Body type'], guessBodyStyle(d.model));
        await sleep(800);

        await fillDropdown(['Condition', 'Vehicle condition'], 'Very good');
        await sleep(800);

        await fillDropdown(['Fuel', 'Fuel type'], 'Gasoline');
        await sleep(800);

        await fillText(['Description', 'Tell buyers', 'Additional'], d.description || '');
        await sleep(300);

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
