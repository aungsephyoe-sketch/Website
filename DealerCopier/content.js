// Extracts car listing data from dealership pages using multiple strategies

function extractListing() {
    const data = {
        year: '', make: '', model: '', trim: '',
        price: '', mileage: '', color: '', vin: '',
        description: '', images: [], url: window.location.href
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
                    data.trim   = data.trim   || (item.vehicleConfiguration || item.vehicleInteriorType || '');
                    data.color  = data.color  || (item.color || item.vehicleInteriorColor || '');
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
            const el = document.querySelector(sel);
            if (el && el.textContent.trim()) return el.textContent.trim();
        }
        return '';
    };

    if (!data.price) data.price = text([
        '[class*="price"]:not([class*="msrp"]):not([class*="was"])',
        '[data-price]', '.vehicle-price', '.listing-price', '#price',
        '[class*="Price"]', '[itemprop="price"]'
    ]).replace(/[^\d$,.]/g, '') || '';

    if (!data.mileage) {
        // Try labeled DOM elements first
        const raw = text([
            '[class*="mileage"]', '[class*="miles"]', '[data-mileage]',
            '[class*="odometer"]', '[itemprop="mileageFromOdometer"]'
        ]);
        const rawNum = parseInt(raw.replace(/[^\d]/g, ''), 10);
        if (rawNum >= 100 && rawNum <= 500000) {
            data.mileage = raw.replace(/[^\d,]/g, '');
        }
    }
    if (!data.mileage) {
        // Scan for mileage label context in page text
        const bodyText = document.body.innerText;
        const patterns = [
            /(?:mileage|odometer|miles)[:\s]*([0-9]{1,3}(?:,[0-9]{3})*)\s*(?:mi|miles)?/i,
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
        const raw = text([
            '[class*="vin"]', '[data-vin]', '[itemprop="vehicleIdentificationNumber"]'
        ]);
        data.vin = raw.replace(/[^A-HJ-NPR-Z0-9]/gi, '').substring(0, 17) || '';
        // Also scan visible text for 17-char VIN pattern
        if (!data.vin) {
            const match = document.body.innerText.match(/\bVIN[:\s#]*([A-HJ-NPR-Z0-9]{17})\b/i);
            if (match) data.vin = match[1];
        }
    }

    if (!data.color) data.color = text([
        '[class*="exterior-color"]', '[class*="exteriorColor"]',
        '[class*="color"]', '[data-color]'
    ]);

    // ── Strategy 4: Parse the page title / H1 for year/make/model ──
    const title = document.querySelector('h1')?.textContent || document.title || '';
    if (title && (!data.year || !data.make || !data.model)) {
        const yearMatch = title.match(/\b(19|20)\d{2}\b/);
        if (yearMatch && !data.year) data.year = yearMatch[0];

        const makes = ['Toyota','Honda','Ford','Chevrolet','Chevy','Nissan','Hyundai','Kia',
            'BMW','Mercedes','Audi','Volkswagen','VW','Subaru','Mazda','Jeep','Ram',
            'Dodge','Chrysler','Buick','GMC','Cadillac','Lincoln','Acura','Infiniti',
            'Lexus','Volvo','Porsche','Land Rover','Tesla','Mitsubishi','Genesis'];
        if (!data.make) {
            for (const m of makes) {
                if (title.toLowerCase().includes(m.toLowerCase())) { data.make = m; break; }
            }
        }
        // Model is what comes after year + make in the title
        if (data.year && data.make && !data.model) {
            const after = title.replace(data.year, '').replace(new RegExp(data.make, 'i'), '').trim();
            data.model = after.split(/\s{2,}|\||-/)[0].trim();
        }
    }

    // ── Strategy 5: Collect images from gallery ──
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

    // ── Strategy 6: Description fallback ──
    if (!data.description) {
        data.description = text([
            '[class*="description"]', '[class*="comments"]',
            '[class*="details"] p', '[itemprop="description"]',
            '.vehicle-description', '#description'
        ]);
    }

    return data;
}

// Listen for popup requesting data
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'GET_LISTING') {
        sendResponse(extractListing());
    }
});
