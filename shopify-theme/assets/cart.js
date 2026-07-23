/* Ares Pantheon — Shopify AJAX Cart API helpers.
   Talks to the store's real cart (/cart/add.js, /cart/change.js, /cart.js)
   instead of localStorage, so quantities/totals are always the source of truth. */

(function () {
    const routes = (window.themeVars && window.themeVars.routes) || {
        cartAddUrl: '/cart/add.js',
        cartChangeUrl: '/cart/change.js',
        cartGetUrl: '/cart.js'
    };

    function formatMoney(cents, format) {
        const formatString = format || (window.themeVars && window.themeVars.moneyFormat) || '${{amount}}';
        const match = formatString.match(/\{\{\s*(\w+)\s*\}\}/);
        if (!match || typeof cents !== 'number') return formatString;

        const token = match[1];
        const precision = (token === 'amount_no_decimals' || token === 'amount_no_decimals_with_comma_separator') ? 0 : 2;
        const useComma = token.indexOf('with_comma_separator') !== -1;
        const thousands = useComma ? '.' : ',';
        const decimalSep = useComma ? ',' : '.';

        const amount = (cents / 100).toFixed(precision);
        const parts = amount.split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousands);
        const value = parts.length > 1 ? parts.join(decimalSep) : parts[0];

        return formatString.replace(match[0], value);
    }

    function request(url, options) {
        return fetch(url, Object.assign({
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
        }, options)).then(async (r) => {
            let data;
            try { data = await r.json(); } catch (e) { data = null; }
            if (!r.ok) {
                const err = new Error((data && (data.description || data.message)) || 'Cart request failed');
                err.status = r.status;
                err.data = data;
                throw err;
            }
            return data;
        });
    }

    const CartAPI = {
        get() {
            return request(routes.cartGetUrl, { method: 'GET' });
        },
        add(id, quantity) {
            return request(routes.cartAddUrl, {
                method: 'POST',
                body: JSON.stringify({ id: id, quantity: quantity || 1 })
            });
        },
        change(key, quantity) {
            return request(routes.cartChangeUrl, {
                method: 'POST',
                body: JSON.stringify({ id: key, quantity: quantity })
            });
        }
    };

    function updateCartCount(cart) {
        function apply(c) {
            document.querySelectorAll('[data-cart-count]').forEach((el) => {
                if (c.item_count > 0) {
                    el.textContent = c.item_count;
                    el.style.display = 'flex';
                } else {
                    el.style.display = 'none';
                }
            });
        }
        if (cart) {
            apply(cart);
            return Promise.resolve(cart);
        }
        return CartAPI.get().then((c) => {
            apply(c);
            return c;
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        updateCartCount().catch(() => {});
    });

    window.CartAPI = CartAPI;
    window.formatMoney = formatMoney;
    window.updateCartCount = updateCartCount;
})();
