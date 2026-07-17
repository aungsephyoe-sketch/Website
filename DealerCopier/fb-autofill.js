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

    async function waitFor(selectorFn, timeout = 4000) {
        const start = Date.now();
        while (Date.now() - start < timeout) {
            const el = selectorFn();
            if (el) return el;
            await sleep(150);
        }
        return null;
    }

    function findEl(hints) {
        for (const hint of hints) {
            const lower = hint.toLowerCase();
            for (const el of document.querySelectorAll('input, textarea, select, [role="combobox"], [role="button"]')) {
                const label = (
                    el.getAttribute('aria-label') ||
                    el.getAttribute('placeholder') ||
                    el.getAttribute('aria-labelledby') || ''
                ).toLowerCase();
                if (label.includes(lower)) return el;
            }
            for (const lbl of document.querySelectorAll('label')) {
                if (lbl.textContent.trim().toLowerCase().includes(lower)) {
                    const id = lbl.getAttribute('for');
                    const el = id ? document.getElementById(id) : lbl.querySelector('input,select,textarea');
                    if (el) return el;
                }
            }
        }
        return null;
    }

    function setReactValue(el, value) {
        const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        if (setter) setter.call(el, value);
        ['input', 'change'].forEach(type => el.dispatchEvent(new Event(type, { bubbles: true })));
    }

    async function typeIntoField(hints, value) {
        if (!value) return false;
        const el = findEl(hints);
        if (!el) return false;
        el.focus();
        el.click();
        await sleep(200);
        setReactValue(el, value);
        await sleep(300);
        return true;
    }

    async function fillDropdown(hints, value) {
        if (!value) return false;

        // 1. Try native <select>
        for (const hint of hints) {
            for (const sel of document.querySelectorAll('select')) {
                const lbl = (sel.getAttribute('aria-label') || '').toLowerCase();
                if (!lbl.includes(hint.toLowerCase())) continue;
                for (const opt of sel.options) {
                    if (opt.text.toLowerCase().includes(value.toLowerCase())) {
                        sel.value = opt.value;
                        sel.dispatchEvent(new Event('change', { bubbles: true }));
                        await sleep(400);
                        return true;
                    }
                }
            }
        }

        // 2. Find field, type to open suggestions
        let field = findEl(hints);
        if (!field) return false;

        field.click();
        field.focus();
        await sleep(400);

        setReactValue(field, value);
        await sleep(100);
        field.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: value[0] }));
        field.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: value[0] }));
        await sleep(800);

        // Wait for and click matching option
        const picked = await waitFor(() => {
            const opts = document.querySelectorAll('[role="option"], [role="listitem"]');
            for (const opt of opts) {
                if (opt.textContent.trim().toLowerCase().includes(value.toLowerCase())) return opt;
            }
            return null;
        }, 3000);

        if (picked) {
            picked.click();
            await sleep(600);
            return true;
        }

        // 3. Fallback: any visible list item
        const allOpts = document.querySelectorAll('li, [role="option"], [data-value]');
        for (const opt of allOpts) {
            if (opt.textContent.trim().toLowerCase().includes(value.toLowerCase())) {
                opt.click();
                await sleep(500);
                return true;
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
        return '';
    }

    async function autofill(d) {
        btn.innerHTML = '⏳ Filling… please wait';
        btn.disabled = true;
        window.scrollTo(0, 0);
        await sleep(800);

        await waitFor(() => findEl(['Year', 'Model year']), 5000);
        await fillDropdown(['Year', 'Model year'], d.year);
        await sleep(800);

        await waitFor(() => findEl(['Make', 'Brand']), 5000);
        await fillDropdown(['Make', 'Brand'], d.make);
        await sleep(800);

        await waitFor(() => findEl(['Model']), 5000);
        await fillDropdown(['Model'], d.model);
        await sleep(800);

        await typeIntoField(['Price', 'Asking price'], (d.price || '').replace(/[^\d.]/g, ''));
        await sleep(400);

        await typeIntoField(['Mileage', 'Miles', 'Odometer'], (d.mileage || '').replace(/[^\d]/g, ''));
        await sleep(400);

        await fillDropdown(['Exterior color', 'Color'], d.color);
        await sleep(600);

        await fillDropdown(['Interior color'], d.color);
        await sleep(600);

        const bodyStyle = guessBodyStyle(d.model);
        if (bodyStyle) { await fillDropdown(['Body style', 'Body type'], bodyStyle); await sleep(600); }

        await fillDropdown(['Condition', 'Vehicle condition'], 'Very good');
        await sleep(600);

        await fillDropdown(['Fuel', 'Fuel type'], 'Gasoline');
        await sleep(600);

        await typeIntoField(['Description', 'Tell buyers', 'Additional'], d.description || '');
        await sleep(400);

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
