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

    async function waitFor(fn, timeout = 6000, interval = 150) {
        const end = Date.now() + timeout;
        while (Date.now() < end) {
            const v = fn();
            if (v) return v;
            await sleep(interval);
        }
        return null;
    }

    // Find an interactive element by aria-label or placeholder text
    function findField(hints) {
        for (const hint of hints) {
            const lower = hint.toLowerCase();
            // Check aria-label on any element
            for (const el of document.querySelectorAll('[aria-label]')) {
                if (el.getAttribute('aria-label').toLowerCase().includes(lower)) return el;
            }
            // Check placeholder
            for (const el of document.querySelectorAll('[placeholder]')) {
                if (el.getAttribute('placeholder').toLowerCase().includes(lower)) return el;
            }
        }
        return null;
    }

    // Set value on a React-controlled input/textarea/select
    function setReactValue(el, value) {
        const tag = el.tagName;
        const proto = tag === 'TEXTAREA' ? HTMLTextAreaElement.prototype
                    : tag === 'SELECT'   ? HTMLSelectElement.prototype
                    : HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        if (setter) setter.call(el, value);
        el.dispatchEvent(new Event('input',  { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Type into a field character-by-character to trigger React filtering
    async function typeInto(el, value) {
        el.focus();
        setReactValue(el, '');
        await sleep(100);
        // Use execCommand for React compatibility
        document.execCommand('selectAll', false, null);
        document.execCommand('insertText', false, value);
        // Fallback: also set via prototype setter
        setReactValue(el, value);
        el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: value.slice(-1) }));
        el.dispatchEvent(new KeyboardEvent('keyup',   { bubbles: true, key: value.slice(-1) }));
    }

    // Click an option from an open dropdown list
    async function pickOption(value) {
        const lower = value.toLowerCase();
        // Wait for any listbox/option elements to appear
        const opt = await waitFor(() => {
            const selectors = [
                '[role="option"]',
                '[role="menuitem"]',
                'li[tabindex]',
                '[data-value]',
                'ul li',
            ];
            for (const sel of selectors) {
                for (const el of document.querySelectorAll(sel)) {
                    const txt = el.textContent.trim().toLowerCase();
                    if (txt === lower || txt.startsWith(lower)) return el;
                }
            }
            return null;
        }, 4000);

        if (opt) {
            opt.scrollIntoView({ block: 'nearest' });
            opt.click();
            await sleep(600);
            return true;
        }

        // Broader fallback scan
        for (const el of document.querySelectorAll('li, [role="option"], [role="menuitem"]')) {
            const txt = el.textContent.trim().toLowerCase();
            if (txt === lower || txt.includes(lower)) {
                el.scrollIntoView({ block: 'nearest' });
                el.click();
                await sleep(500);
                return true;
            }
        }
        return false;
    }

    async function fillText(hints, value) {
        if (!value) return false;
        const el = findField(hints);
        if (!el) return false;
        el.click();
        el.focus();
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
                    if (opt.text.trim().toLowerCase() === value.toLowerCase() ||
                        opt.text.trim().toLowerCase().includes(value.toLowerCase())) {
                        setReactValue(sel, opt.value);
                        await sleep(500);
                        return true;
                    }
                }
            }
        }

        // Find the trigger element
        const field = findField(hints);
        if (!field) {
            console.warn('[DM] Could not find field for hints:', hints);
            return false;
        }

        console.log('[DM] Filling dropdown:', hints[0], '=', value, '| Element:', field.tagName, field.getAttribute('aria-label'));

        // Click to open the dropdown
        field.scrollIntoView({ block: 'center' });
        await sleep(200);
        field.click();
        field.focus();
        await sleep(500);

        // If it's an input/combobox, type to filter
        if (['INPUT', 'TEXTAREA'].includes(field.tagName) ||
            field.getAttribute('role') === 'combobox') {
            await typeInto(field, value);
            await sleep(800);
        }

        // Try to pick an option
        const picked = await pickOption(value);
        if (picked) return true;

        // Last resort: find a parent trigger and try clicking it
        const trigger = field.closest('[role="button"]') || field.closest('[aria-haspopup]');
        if (trigger && trigger !== field) {
            trigger.click();
            await sleep(600);
            return await pickOption(value);
        }

        console.warn('[DM] Could not pick option for:', value);
        return false;
    }

    async function tickCheckbox(hints) {
        for (const hint of hints) {
            // Standard checkboxes
            for (const cb of document.querySelectorAll('input[type="checkbox"]')) {
                const lbl = cb.closest('label') || document.querySelector(`label[for="${cb.id}"]`);
                const txt = (lbl?.textContent || cb.getAttribute('aria-label') || '').toLowerCase();
                if (txt.includes(hint.toLowerCase())) {
                    if (!cb.checked) cb.click();
                    await sleep(200);
                    return true;
                }
            }
            // ARIA checkboxes
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
        if (/escalade|tahoe|suburban|explorer|pilot|highlander|traverse|4runner|pathfinder|navigator|expedition|yukon|sequoia|armada|mdx|rdx|gx|lx|rx|rav4|cr-v|tucson|santa fe|equinox|blazer|bronco|terrain|edge/.test(m)) return 'SUV';
        if (/silverado|f-150|f150|tundra|tacoma|colorado|canyon|frontier|ranger|ridgeline|titan/.test(m)) return 'Truck';
        if (/camry|accord|civic|corolla|altima|sentra|malibu|sonata|elantra|jetta|passat|impala/.test(m)) return 'Sedan';
        if (/mustang|camaro|challenger|corvette/.test(m)) return 'Coupe';
        if (/odyssey|sienna|pacifica|caravan|sedona/.test(m)) return 'Minivan';
        return 'SUV';
    }

    function status(msg) {
        btn.innerHTML = msg;
        console.log('[DM]', msg);
    }

    async function autofill(d) {
        btn.disabled = true;
        window.scrollTo(0, 0);
        await sleep(800);

        status('⏳ Vehicle type…');
        await fillDropdown(['Vehicle type', 'Type'], 'Car');
        await sleep(1500);

        status('⏳ Year…');
        await fillDropdown(['Year', 'Model year'], d.year);
        await sleep(3500); // wait for Make options to load

        status('⏳ Make…');
        await fillDropdown(['Make', 'Brand', 'Vehicle make'], d.make);
        await sleep(3500); // wait for Model options to load

        status('⏳ Model…');
        await fillDropdown(['Model', 'Vehicle model'], d.model);
        await sleep(1500);

        status('⏳ Price…');
        await fillText(['Price', 'Asking price'], (d.price || '').replace(/[^\d.]/g, ''));
        await sleep(400);

        status('⏳ Mileage…');
        await fillText(['Mileage', 'Miles', 'Odometer'], (d.mileage || '').replace(/[^\d]/g, ''));
        await sleep(400);

        status('⏳ Exterior color…');
        await fillDropdown(['Exterior color', 'Color'], d.color);
        await sleep(1200);

        status('⏳ Interior color…');
        await fillDropdown(['Interior color'], d.color);
        await sleep(1200);

        status('⏳ Body style…');
        await fillDropdown(['Body style', 'Body type'], guessBodyStyle(d.model));
        await sleep(1200);

        status('⏳ Condition…');
        await fillDropdown(['Condition', 'Vehicle condition'], 'Very good');
        await sleep(1200);

        status('⏳ Fuel type…');
        await fillDropdown(['Fuel', 'Fuel type'], 'Gasoline');
        await sleep(1200);

        status('⏳ Description…');
        await fillText(['Description', 'Tell buyers', 'Additional'], d.description || '');
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
