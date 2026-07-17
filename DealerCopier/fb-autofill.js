// Facebook Marketplace vehicle auto-fill content script

(function () {
    if (document.getElementById('dealer-autofill-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'dealer-autofill-btn';
    btn.textContent = '🚗 Insert Vehicle Data';
    Object.assign(btn.style, {
        position: 'fixed', top: '80px', right: '16px', zIndex: '99999',
        background: '#1877f2', color: '#fff', border: 'none', borderRadius: '8px',
        padding: '12px 18px', fontSize: '14px', fontWeight: '700',
        cursor: 'pointer', boxShadow: '0 2px 12px rgba(0,0,0,0.3)'
    });
    document.body.appendChild(btn);

    btn.addEventListener('click', () => {
        chrome.storage.local.get('dealerListing', ({ dealerListing }) => {
            if (!dealerListing) { alert('No vehicle data found. Go to a dealer listing first.'); return; }
            autofill(dealerListing);
        });
    });

    function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

    function setNativeValue(el, value) {
        const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
        const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        if (nativeSetter) nativeSetter.call(el, value);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function findInput(hints) {
        for (const hint of hints) {
            const el = document.querySelector(
                `input[aria-label*="${hint}" i], textarea[aria-label*="${hint}" i],
                 input[placeholder*="${hint}" i], textarea[placeholder*="${hint}" i]`
            );
            if (el) return el;
        }
        return null;
    }

    async function typeInto(hints, value) {
        if (!value) return false;
        const el = findInput(hints);
        if (!el) return false;
        el.focus();
        el.click();
        setNativeValue(el, value);
        await sleep(700);
        const opts = document.querySelectorAll('[role="option"], [role="listitem"], li');
        for (const opt of opts) {
            if (opt.textContent.trim().toLowerCase().includes(value.toLowerCase())) {
                opt.click();
                await sleep(500);
                return true;
            }
        }
        return true;
    }

    async function clickDropdownOption(hints, value) {
        const el = findInput(hints);
        if (el) {
            el.focus();
            el.click();
            await sleep(800);
        } else {
            const allEls = document.querySelectorAll('[aria-label], [placeholder], [role="button"]');
            for (const e of allEls) {
                const label = (e.getAttribute('aria-label') || e.getAttribute('placeholder') || '').toLowerCase();
                if (hints.some(h => label.includes(h.toLowerCase()))) {
                    e.click();
                    await sleep(800);
                    break;
                }
            }
        }
        const opts = document.querySelectorAll('[role="option"], [role="listitem"], li');
        for (const opt of opts) {
            if (opt.textContent.trim().toLowerCase().includes(value.toLowerCase())) {
                opt.click();
                await sleep(400);
                return true;
            }
        }
        return false;
    }

    async function checkCheckbox(hints) {
        for (const cb of document.querySelectorAll('input[type="checkbox"]')) {
            const label = cb.closest('label') || document.querySelector(`label[for="${cb.id}"]`);
            const text = (label?.textContent || cb.getAttribute('aria-label') || '').toLowerCase();
            if (hints.some(h => text.includes(h.toLowerCase()))) {
                if (!cb.checked) cb.click();
                await sleep(300);
                return true;
            }
        }
        for (const cb of document.querySelectorAll('[role="checkbox"]')) {
            const text = (cb.getAttribute('aria-label') || cb.textContent || '').toLowerCase();
            if (hints.some(h => text.includes(h.toLowerCase()))) {
                if (cb.getAttribute('aria-checked') !== 'true') cb.click();
                await sleep(300);
                return true;
            }
        }
        return false;
    }

    async function autofill(d) {
        btn.textContent = '⏳ Filling…';
        btn.disabled = true;
        window.scrollTo(0, 0);
        await sleep(500);

        await typeInto(['Year', 'Model year'], d.year);
        await sleep(400);

        await typeInto(['Make', 'Brand'], d.make);
        await sleep(400);

        await typeInto(['Model'], d.model);
        await sleep(400);

        const mileageEl = findInput(['Mileage', 'Miles', 'Odometer']);
        if (mileageEl) { setNativeValue(mileageEl, (d.mileage || '').replace(/[^\d]/g, '')); await sleep(300); }

        const priceEl = findInput(['Price', 'Asking price']);
        if (priceEl) { setNativeValue(priceEl, (d.price || '').replace(/[^\d.]/g, '')); await sleep(300); }

        await typeInto(['Exterior color', 'Exterior', 'Color'], d.color);
        await sleep(400);

        await typeInto(['Interior color', 'Interior'], d.color);
        await sleep(400);

        // Vehicle condition - always Very good
        await clickDropdownOption(['Condition', 'Vehicle condition'], 'Very good');
        await sleep(400);

        // Fuel type - always Gasoline
        await clickDropdownOption(['Fuel', 'Fuel type'], 'Gasoline');
        await sleep(400);

        // Body style - guess from model name
        const modelLower = (d.model || '').toLowerCase();
        let bodyStyle = '';
        if (/escalade|tahoe|suburban|explorer|pilot|highlander|traverse|4runner|pathfinder|navigator|expedition|yukon|sequoia|armada|mdx|rdx|qx|gx|lx|rx/.test(modelLower)) bodyStyle = 'SUV';
        else if (/silverado|f-150|f150|ram|tundra|tacoma|colorado|canyon|frontier|ranger|ridgeline|titan/.test(modelLower)) bodyStyle = 'Truck';
        else if (/camry|accord|civic|corolla|altima|sentra|malibu|impala|fusion|sonata|elantra|optima|jetta|passat/.test(modelLower)) bodyStyle = 'Sedan';
        else if (/coupe|mustang|camaro|challenger/.test(modelLower)) bodyStyle = 'Coupe';
        else if (/van|odyssey|sienna|pacifica|caravan/.test(modelLower)) bodyStyle = 'Minivan';
        else if (/convertible|cabriolet/.test(modelLower)) bodyStyle = 'Convertible';
        if (bodyStyle) { await clickDropdownOption(['Body style', 'Body type', 'Type'], bodyStyle); await sleep(400); }

        // Description
        const descEl = findInput(['Description', 'Tell buyers']);
        if (descEl) { setNativeValue(descEl, d.description || ''); await sleep(300); }

        // Clean title checkbox - always check
        await checkCheckbox(['clean title', 'Clean title', 'title is clean']);
        await sleep(300);

        btn.textContent = '✅ Done!';
        btn.style.background = '#42b72a';
        setTimeout(() => {
            btn.textContent = '🚗 Insert Vehicle Data';
            btn.style.background = '#1877f2';
            btn.disabled = false;
        }, 3000);
    }
})();
