// Extracts car listing data from dealership pages using multiple strategies

function extractListing() {
    const data = {
        year: '', make: '', model: '', trim: '', bodyStyle: '',
        price: '', mileage: '', color: '', interiorColor: '', transmission: '', vin: '',
        description: '', images: [], videos: [], url: window.location.href
    };

    // Third-party badges/widgets (vehicle history report logos, etc.) that show up
    // as <img> tags on dealer pages but are never actual photos of the vehicle.
    const JUNK_IMAGE_HOSTS = ['carfax.com', 'autocheck.com'];
    function isJunkImage(src) {
        if (!src || src.includes('logo') || src.includes('icon')
            || src.includes('placeholder') || src.includes('blank.gif')) return true;
        try {
            const host = new URL(src, window.location.href).hostname;
            if (JUNK_IMAGE_HOSTS.some(h => host === h || host.endsWith('.' + h))) return true;
        } catch(e) {}
        return false;
    }

    // ── Strategy 1: Schema.org structured data ──
    document.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
        try {
            const json = JSON.parse(script.textContent);
            const items = Array.isArray(json) ? json : [json];
            items.forEach(item => {
                const type = (item['@type'] || '').toLowerCase();
                if (type.includes('car') || type.includes('vehicle') || type.includes('product')) {
                    data.year   = data.year   || String(item.modelDate || item.vehicleModelDate || item.productionDate || '');
                    data.make   = data.make   || (item.brand?.name || item.brand || item.manufacturer || '');
                    data.model  = data.model  || (item.model || item.name || '');
                    data.trim   = data.trim   || (item.vehicleConfiguration || '');
                    data.color  = data.color  || (item.color || '');
                    data.interiorColor = data.interiorColor || (item.vehicleInteriorColor || item.vehicleInteriorType || '');
                    if (!data.transmission && item.vehicleTransmission) {
                        const tx = String(item.vehicleTransmission).toLowerCase();
                        if (tx.includes('manualtransmission') || tx === 'manual') data.transmission = 'Manual';
                        else if (tx.includes('automatictransmission') || /^auto/.test(tx) || /\bcvt\b|\bdct\b/.test(tx)) data.transmission = 'Automatic';
                    }
                    data.vin    = data.vin    || (item.vehicleIdentificationNumber || item.vin || '');
                    data.mileage = data.mileage || String(item.mileageFromOdometer?.value || item.mileageFromOdometer || '');
                    if (item.offers?.price) data.price = '$' + item.offers.price;
                    if (item.description) data.description = data.description || item.description;
                    if (item.image) {
                        const imgs = Array.isArray(item.image) ? item.image : [item.image];
                        data.images.push(...imgs.map(i => typeof i === 'string' ? i : i.url).filter(Boolean).filter(u => !isJunkImage(u)));
                    }
                }
            });
        } catch(e) {}
    });

    // ── Strategy 2: Meta / Open Graph tags ──
    const meta = (name) => {
        const el = document.querySelector(`meta[property="${name}"], meta[name="${name}"]`);
        return el ? el.getAttribute('content') : '';
    };
    if (!data.price) data.price = meta('og:price:amount') ? '$' + meta('og:price:amount') : '';
    if (!data.images.length) {
        const ogImg = meta('og:image');
        if (ogImg && !isJunkImage(ogImg)) data.images.push(ogImg);
    }

    // ── Strategy 3: Common DOM patterns ──
    const text = (selectors) => {
        for (const sel of selectors) {
            try {
                const el = document.querySelector(sel);
                if (el && el.textContent.trim()) return el.textContent.trim();
            } catch(e) {}
        }
        return '';
    };

    if (!data.price) data.price = text([
        '[class*="price"]:not([class*="msrp"]):not([class*="was"])',
        '[data-price]', '.vehicle-price', '.listing-price', '#price',
        '[class*="Price"]', '[itemprop="price"]'
    ]).replace(/[^\d$,.]/g, '') || '';

    if (!data.mileage) {
        const raw = text([
            '[class*="mileage"]', '[class*="miles"]', '[data-mileage]',
            '[class*="odometer"]', '[itemprop="mileageFromOdometer"]'
        ]);
        const rawNum = parseInt(raw.replace(/[^\d]/g, ''), 10);
        if (rawNum >= 100 && rawNum <= 500000) data.mileage = raw.replace(/[^\d,]/g, '');
    }
    if (!data.mileage) {
        const bodyText = document.body.innerText;
        const patterns = [
            /(?:mileage|odometer)[:\s]*([0-9]{1,3}(?:,[0-9]{3})*)/i,
            /([0-9]{1,3}(?:,[0-9]{3})+)\s*miles?\b/i
        ];
        for (const pat of patterns) {
            const m = bodyText.match(pat);
            if (m) {
                const num = parseInt(m[1].replace(/,/g, ''), 10);
                if (num >= 100 && num <= 500000) { data.mileage = m[1]; break; }
            }
        }
    }

    if (!data.vin) {
        const raw = text(['[class*="vin"]', '[data-vin]', '[itemprop="vehicleIdentificationNumber"]']);
        data.vin = raw.replace(/[^A-HJ-NPR-Z0-9]/gi, '').substring(0, 17) || '';
        if (!data.vin) {
            const match = document.body.innerText.match(/\bVIN[:\s#]*([A-HJ-NPR-Z0-9]{17})\b/i);
            if (match) data.vin = match[1];
        }
    }

    // ── Label/value scanner ──
    function findLabelValue(labelPattern) {
        const candidates = document.querySelectorAll(
            'p, span, div, td, th, dt, li, [class*="label"], [class*="title"], [class*="heading"]'
        );
        const INLINE = new Set(['STRONG','B','EM','I','SPAN','A','BR','ABBR','SMALL']);
        for (const el of candidates) {
            const isLeafLike = el.childElementCount === 0 || el.tagName === 'DT'
                || Array.from(el.children).every(c => INLINE.has(c.tagName));
            const own = isLeafLike ? el.textContent.trim() : '';
            if (!own || !labelPattern.test(own)) continue;

            let sib = el.nextElementSibling;
            while (sib) {
                const t = sib.textContent.trim();
                if (t && t.length < 60) return t;
                sib = sib.nextElementSibling;
            }

            const parentSib = el.parentElement?.nextElementSibling;
            if (parentSib) {
                const t = parentSib.textContent.trim();
                if (t && t.length < 60) return t;
            }

            const gp = el.parentElement?.parentElement;
            if (gp) {
                const children = Array.from(gp.children);
                const idx = children.indexOf(el.parentElement);
                if (idx > -1 && children[idx + 1]) {
                    const t = children[idx + 1].textContent.trim();
                    if (t && t.length < 60) return t;
                }
            }
        }
        return '';
    }

    // Exterior color
    if (!data.color) data.color = text([
        '[class*="exterior-color"]', '[class*="exteriorColor"]',
        '[data-exterior-color]', '[class*="ext-color"]'
    ]);
    if (!data.color) data.color = findLabelValue(/^exterior\s*(color|colour)$/i);
    if (!data.color) data.color = findLabelValue(/^ext\.?\s*(color|colour)$/i);
    if (!data.color) {
        const bodyText = document.body.innerText;
        const m = bodyText.match(/exterior\s*(?:color|colour)[:\s/]+([A-Za-z][A-Za-z ]{1,25})/i)
               || bodyText.match(/ext\.?\s*color[:\s/]+([A-Za-z][A-Za-z ]{1,25})/i);
        if (m) data.color = m[1].trim().split(/[\n,]/)[0].trim();
    }
    if (!data.color) data.color = text(['[class*="color"]', '[data-color]']);

    // Interior color
    if (!data.interiorColor) data.interiorColor = text([
        '[class*="interior-color"]', '[class*="interiorColor"]',
        '[data-interior-color]', '[class*="int-color"]'
    ]);
    if (!data.interiorColor) data.interiorColor = findLabelValue(/^interior\s*(color|colour)$/i);
    if (!data.interiorColor) data.interiorColor = findLabelValue(/^int\.?\s*(color|colour)$/i);
    if (!data.interiorColor) {
        const bodyText = document.body.innerText;
        const m = bodyText.match(/interior\s*(?:color|colour)[:\s/]+([A-Za-z][A-Za-z ]{1,25})/i)
               || bodyText.match(/int\.?\s*color[:\s/]+([A-Za-z][A-Za-z ]{1,25})/i)
               || bodyText.match(/interior[:\s]+([A-Za-z][A-Za-z ]{1,25})\s*(?:leather|cloth|vinyl|suede|seating)/i);
        if (m) data.interiorColor = m[1].trim().split(/[\n,]/)[0].trim();
    }

    // Body style
    data.bodyStyle = data.bodyStyle || findLabelValue(/^body\s*style$/i) || findLabelValue(/^body\s*type$/i) || '';

    // Transmission
    if (!data.transmission) {
        const raw = findLabelValue(/^transmission$/i);
        if (raw) {
            const r = raw.toLowerCase();
            if (/automatic|cvt|dct|pdk|tiptronic|dual.?clutch|continuously variable/.test(r)) {
                data.transmission = 'Automatic';
            } else if (/\bmanual\b/.test(r)) {
                data.transmission = 'Manual';
            }
        }
    }
    if (!data.transmission) {
        const el = document.querySelector('[data-transmission], [itemprop="vehicleTransmission"]');
        if (el) {
            const r = (el.textContent.trim() || el.getAttribute('content') || '').toLowerCase();
            if (/automatic|cvt|dct|pdk|tiptronic/.test(r)) data.transmission = 'Automatic';
            else if (/\bmanual\b/.test(r)) data.transmission = 'Manual';
        }
    }
    if (!data.transmission) {
        const bodyText = document.body.innerText;
        const txMatch = bodyText.match(/\btransmission\b[:\s]+([A-Za-z0-9][A-Za-z0-9\-\s]{1,40})/i);
        if (txMatch) {
            const raw = txMatch[1].trim().toLowerCase();
            if (/^(automatic|auto\b|cvt|dct|pdk|tiptronic|dual.?clutch|continuously variable)/.test(raw)) {
                data.transmission = 'Automatic';
            } else if (/^manual\b/.test(raw) && !/manual\s+mode|manual\s+shift|manual\s+adjust/.test(raw)) {
                data.transmission = 'Manual';
            }
        }
    }
    if (!data.transmission) data.transmission = 'Automatic';

    // ── Strategy 4: Parse title/H1 for year/make/model ──
    const makes = ['Toyota','Honda','Ford','Chevrolet','Chevy','Nissan','Hyundai','Kia',
        'BMW','Mercedes','Audi','Volkswagen','VW','Subaru','Mazda','Jeep','Ram',
        'Dodge','Chrysler','Buick','GMC','Cadillac','Lincoln','Acura','Infiniti',
        'Lexus','Volvo','Porsche','Land Rover','Tesla','Mitsubishi','Genesis'];

    const h1 = document.querySelector('h1')?.textContent?.trim() || '';
    const pageTitle = document.title || '';

    for (const src of [h1, pageTitle]) {
        if (!src) continue;
        if (!data.year) {
            const m = src.match(/\b(19|20)\d{2}\b/);
            if (m) data.year = m[0];
        }
        if (!data.make) {
            for (const mk of makes) {
                if (src.toLowerCase().includes(mk.toLowerCase())) { data.make = mk; break; }
            }
        }
        if (data.year && data.make && !data.model) {
            const afterYearMake = src
                .replace(data.year, '')
                .replace(new RegExp(data.make, 'i'), '')
                .trim()
                .replace(/^[\s\-|]+/, '');
            if (afterYearMake) {
                const noiseWords = ['used','new','certified','pre-owned','pre','owned','vehicle','the','a','an'];
                const words = afterYearMake.split(/\s+/);
                const modelWord = words.find(w => !noiseWords.includes(w.toLowerCase()));
                if (modelWord) data.model = modelWord;
            }
        }
        if (data.year && data.make && data.model) break;
    }

    // ── Strategy 5: Trim from URL slug ──
    if (!data.trim && data.model) {
        const slug = window.location.pathname.toLowerCase();
        const modelSlug = data.model.toLowerCase();
        const modelIdx = slug.indexOf(modelSlug);
        if (modelIdx > -1) {
            const afterModel = slug.slice(modelIdx + modelSlug.length).replace(/^[-/]+/, '');
            const words = afterModel.split('-');
            const noiseWords = ['headup','head','display','blind','spot','assist','navigation',
                'panor','carrollton','dallas','houston','tx','ca','fl','id','used','new',
                'certified','pre','owned','detail','vehicle','listing','inventory'];
            const trimWords = [];
            for (const w of words) {
                if (noiseWords.includes(w) || /^\d+$/.test(w)) break;
                trimWords.push(w);
                if (trimWords.length >= 3) break;
            }
            if (trimWords.length) {
                data.trim = trimWords.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            }
        }
    }

    // ── Strategy 6: Trim from DOM ──
    if (!data.trim) {
        data.trim = text([
            '[class*="trim"]', '[data-trim]', '[class*="Trim"]',
            '[class*="submodel"]', '[class*="sub-model"]', '[class*="package"]'
        ]);
    }

    // ── Strategy 7: Collect gallery images (handle lazy loading) ──
    document.querySelectorAll('img[data-src], img[data-lazy], img[data-lazy-src], img[data-original], img[data-url]').forEach(img => {
        const lazySrc = img.dataset.src || img.dataset.lazy || img.dataset.lazySrc || img.dataset.original || img.dataset.url;
        if (lazySrc && lazySrc.startsWith('http') && !isJunkImage(lazySrc) && !data.images.includes(lazySrc)) {
            data.images.push(lazySrc);
        }
    });
    document.querySelectorAll('noscript').forEach(ns => {
        const matches = ns.textContent.match(/src=["'](https?:[^"']+)["']/g) || [];
        matches.forEach(attr => {
            const url = attr.replace(/src=["']/,'').replace(/["']/,'');
            if (url && !isJunkImage(url) && !data.images.includes(url)) {
                data.images.push(url);
            }
        });
    });
    document.querySelectorAll('img').forEach(img => {
        const candidates = [
            img.src, img.dataset.src, img.dataset.lazySrc, img.dataset.lazy,
            img.dataset.original, img.getAttribute('data-full'), img.getAttribute('data-zoom-image')
        ];
        for (const src of candidates) {
            if (src && src.startsWith('http') && !isJunkImage(src)
                && src.match(/\.(jpg|jpeg|png|webp)/i)
                && !data.images.includes(src)) {
                data.images.push(src);
                break;
            }
        }
    });
    data.images = [...new Set(data.images)].slice(0, 20);

    // ── Strategy 8: Description (strip HTML) ──
    function stripHtml(html) {
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        return (tmp.innerText || tmp.textContent || '').trim();
    }
    if (!data.description) {
        const raw = text([
            '[class*="description"]', '[class*="comments"]',
            '[class*="details"] p', '[itemprop="description"]',
            '.vehicle-description', '#description'
        ]);
        data.description = stripHtml(raw);
    } else {
        data.description = stripHtml(data.description);
    }

    // ── Strategy 9: Collect videos ──
    document.querySelectorAll('video').forEach(v => {
        const src = v.src || v.querySelector('source')?.src;
        if (src && src.startsWith('http') && !data.videos.includes(src)) data.videos.push(src);
    });
    document.querySelectorAll('source[src*=".mp4"], source[src*=".mov"], source[src*=".webm"]').forEach(s => {
        if (s.src && !data.videos.includes(s.src)) data.videos.push(s.src);
    });
    document.querySelectorAll('iframe[src*="youtube"], iframe[src*="vimeo"]').forEach(f => {
        if (f.src && !data.videos.includes(f.src)) data.videos.push(f.src);
    });

    return data;
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'GET_LISTING') {
        const h = document.body.scrollHeight;
        let pos = 0;
        const step = Math.max(300, h / 8);
        const doScroll = () => {
            pos += step;
            window.scrollTo(0, pos);
            if (pos < h) {
                setTimeout(doScroll, 80);
            } else {
                window.scrollTo(0, 0);
                setTimeout(() => sendResponse(extractListing()), 300);
            }
        };
        doScroll();
        return true;
    }
});
