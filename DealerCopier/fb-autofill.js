// Facebook Marketplace vehicle auto-fill

(function () {
    if (document.getElementById('dm-fab')) return;

    // Floating button
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
                alert('No vehicle data found.\nGo to a dealer listing page, click the extension, then click "Auto-Fill Marketplace".');
                return;
            }
            autofill(dealerListing);
        });
    });

    const sleep = ms => new Promise(r => setTimeout(r, ms));

    async function reactType(el, value) {
        if (!el || !value) return;
        el.focus();
        await sleep(100);
        el.select?.();
        document.execCommand('selectAll', false);
        document.execCommand('insertText', false, String(value));
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        await sleep(200);
    }

    function findField(hints) {
        for (const hint of hints) {
            const direct = document.querySelector(
                `input[aria-label="${hint}"], textarea[aria-label="${hint}"],` +
                `input[placeholder="${hint}"], textarea[placeholder="${hint}"]`
            );
            if (direct) return direct;
            for (const el of document.querySelectorAll('input, textarea')) {
                const lbl = (el.getAttribute('aria-label') || el.getAttribute('placeholder') || '').toLowerCase();
                if (lbl === hint.toLowerCase()) return el;
            }
            for (const label of document.querySelectorAll('label')) {
                if (label.textContent.trim().toLowerCase() === hint.toLowerCase()) {
                    const forId = label.getAttribute('for');
                    const found = forId ? document.getElementById(forId) : label.querySelector('input, select, textarea');
                    if (found) return found;
                }
            }
        }
        return null;
    }

    async function selectDropdown(hints, optionText) {
        if (!optionText) return false;

        // Try native <select>
        for (const hint of hints) {
            for (const sel of document.querySelectorAll('select')) {
                const lbl = (sel.getAttribute('aria-label') || '').toLowerCase();
                if (lbl.includes(hint.toLowerCase())) {
                    for (const opt of sel.options) {
                        if (opt.text.toLowerCase().includes(optionText.toLowerCase())) {
                            sel.value = opt.value;
                            sel.dispatchEvent(new Event('change', { bubbles: true }));
                            await sleep(300);
                            return true;
                        }
                    }
                }
            }
        }

        // Custom React dropdown
        let trigger = null;
        for (const hint of hints) {
            trigger = document.querySelector(`[aria-label*="${hint}" i]`);
            if (!trigger) {
                for (const el of document.querySelectorAll('[role="button"], [role="combobox"], div[tabindex]')) {
                    const txt = (el.getAttribute('aria-label') || el.textContent || '').toLowerCase();
                    if (txt.includes(hint.toLowerCase())) { trigger = el; break; }
                }
            }
            if (trigger) break;
        }

        if (!trigger) return false;
        trigger.click();
        await sleep(800);

        const allOpts = document.querySelectorAll('[role="option"], [role="menuitem"], [role="listitem"], li[tabindex]');
        for (const opt of allOpts) {
            if (opt.textContent.trim().toLowerCase().includes(optionText.toLowerCase())) {
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
                const label = cb.closest('label') || document.querySelector(`label[for="${cb.id}"]`);
                const txt = (label?.textContent || cb.getAttribute('aria-label') || '').toLowerCase();
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
        if (/escalade|tahoe|suburban|explorer|pilot|highlander|traverse|4runner|pathfinder|navigator|expedition|yukon|sequoia|armada|mdx|rdx|qx[0-9]|gx|lx|rx|cx-[59]|rav4|cr-v|hrv|tucson|santa fe|equinox|blazer|bronco/.test(m)) return 'SUV';
        if (/silverado|f-150|f150|ram 1500|tundra|tacoma|colorado|canyon|frontier|ranger|ridgeline|titan/.test(m)) return 'Truck';
        if (/camry|accord|civic|corolla|altima|sentra|malibu|impala|fusion|sonata|elantra|optima|jetta|passat|model 3|model s/.test(m)) return 'Sedan';
        if (/mustang|camaro|challenger|corvette/.test(m)) return 'Coupe';
        if (/odyssey|sienna|pacifica|caravan|sedona|carnival/.test(m)) return 'Minivan';
        if (/convertible|cabriolet/.test(m)) return 'Convertible';
        return '';
    }

    async function autofill(d) {
        btn.innerHTML = '⏳ Filling…';
        btn.disabled = true;
        window.scrollTo(0, 0);
        await sleep(600);

        await selectDropdown(['Year', 'Model year'], d.year);
        await sleep(400);

        await selectDropdown(['Make', 'Brand'], d.make);
        await sleep(400);

        await selectDropdown(['Model'], d.model);
        await sleep(400);

        const priceEl = findField(['Price', 'Asking price', 'List price']);
        if (priceEl) await reactType(priceEl, (d.price || '').replace(/[^\d.]/g, ''));

        const mileageEl = findField(['Mileage', 'Miles', 'Odometer']);
        if (mileageEl) await reactType(mileageEl, (d.mileage || '').replace(/[^\d]/g, ''));

        await selectDropdown(['Exterior color', 'Color'], d.color);
        await sleep(400);

        await selectDropdown(['Interior color'], d.color);
        await sleep(400);

        const bodyStyle = guessBodyStyle(d.model);
        if (bodyStyle) { await selectDropdown(['Body style', 'Body type', 'Type'], bodyStyle); await sleep(400); }

        await selectDropdown(['Condition', 'Vehicle condition'], 'Very good');
        await sleep(400);

        await selectDropdown(['Fuel', 'Fuel type'], 'Gasoline');
        await sleep(400);

        const descEl = findField(['Description', 'Tell buyers', 'Additional details']);
        if (descEl) await reactType(descEl, d.description || '');

        await tickCheckbox(['clean title', 'Clean title', 'title is clean']);

        btn.innerHTML = '✅ Done! Scroll up to review';
        btn.style.background = '#42b72a';
        setTimeout(() => {
            btn.innerHTML = '🚗 Insert Vehicle Data';
            btn.style.background = '#1877f2';
            btn.disabled = false;
        }, 4000);
    }
})();
