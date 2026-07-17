// Extracts car listing data from dealership pages using multiple strategies

function extractListing() {
    const data = {
        year: '', make: '', model: '', trim: '', bodyStyle: '',
        price: '', mileage: '', color: '', interiorColor: '', transmission: '', vin: '',
        description: '', images: [], videos: [], url: window.location.href
    };

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
                    // vehicleTransmission can be a URL or schema value — only keep plain words
                    if (!data.transmission && item.vehicleTransmission) {
                        const tx = String(item.vehicleTransmission).toLowerCase();
                        if (/manual/.test(tx) && !/automatic/.test(tx)) data.transmission = 'Manual';
                        else if (/auto|cvt|dct/.test(tx)) data.transmission = 'Automatic';
                    }
                    data.vin    = data.vin    || (item.vehicleIdentificationNumber || item.vin || '');
                    data.mileage = data.mileage || String(item.mileageFromOdometer?.value || item.mileageFromOdometer || '');
                    if (item.offers?.price) data.price = '$' + item.offers.price;
                    if (item.description) data.description = data.description || item.description;
                    if (item.image) {
                        const imgs = Array.isArray(item.image) ? item.image : [item.image];
                        data.images.push(...imgs.map(i => typeof i === 'string' ? i : i.url).filter(Boolean));
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
        if (ogImg) data.images.push(ogImg);
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

    // ── Label/value scanner: finds a visible label element then reads the adjacent value ──
    // Works for Carfax Vehicle Highlights grid, AutoTrader spec tables, dealer pages, etc.
    function findLabelValue(labelPattern) {
        const candidates = document.querySelectorAll(
            'p, span, div, td, th, dt, li, [class*="label"], [class*="title"], [class*="heading"]'
        );
        for (const el of candidates) {
            const own = (el.childElementCount === 0 || el.tagName === 'DT')
                ? el.textContent.trim()
                : '';
            if (!own || !labelPattern.test(own)) continue;

            // 1. Next sibling element
            let sib = el.nextElementSibling;
            while (sib) {
                const t = sib.textContent.trim();
                if (t && t.length < 60) return t;
                sib = sib.nextElementSibling;
            }

            // 2. Parent's next sibling
            const parentSib = el.parentElement?.nextElementSibling;
            if (parentSib) {
                const t = parentSib.textContent.trim();
                if (t && t.length < 60) return t;
            }

            // 3. Grandparent scan (Carfax highlight grid)
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

    // Body style — read from page first, fall back to model-based guess in autofill
    data.bodyStyle = data.bodyStyle || findLabelValue(/^body\s*style$/i) || findLabelValue(/^body\s*type$/i) || '';

    // Transmission — read explicit label first, then fall back carefully
    if (!data.transmission) data.transmission = findLabelValue(/^transmission$/i);
    if (!data.transmission) {
        const el = document.querySelector('[data-transmission], [itemprop="vehicleTransmission"]');
        if (el) data.transmission = el.textContent.trim() || el.getAttribute('content') || '';
    }
    if (!data.transmission) {
        const bodyText = document.body.innerText;
        const txMatch = bodyText.match(/\btransmission\b[:\s]+([A-Za-z0-9][A-Za-z0-9\-\s]{1,40})/i);
        if (txMatch) {
            const raw = txMatch[1].trim().toLowerCase();
            // "manual mode" / "manual shift" still means automatic; only pure manual counts
            const isManual = /\bmanual\b/.test(raw) && !/automatic|cvt|dct|pdk|tiptronic/.test(raw)
                          && !/manual\s+mode|manual\s+shift|manual\s+adjust/.test(raw);
            data.transmission = isManual ? 'Manual' : 'Automatic';
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

    // ── Strategy 7: Collect gallery images ──
    if (data.images.length < 3) {
        document.querySelectorAll([
            '.vehicle-images img', '.gallery img', '[class*="photo"] img',
            '[class*="carousel"] img', '[class*="slider"] img',
            '[class*="gallery"] img', 'img[src*="vehicle"]',
            'img[src*="inventory"]', 'img[src*="stock"]'
        ].join(',')).forEach(img => {
            const src = img.src || img.dataset.src || img.dataset.lazySrc;
            if (src && src.startsWith('http') && !src.includes('logo') && !src.includes('icon')
                && !data.images.includes(src)) {
                data.images.push(src);
            }
        });
    }
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
    if (msg.type === 'GET_LISTING') sendResponse(extractListing());
});
