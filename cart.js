function getCart() {
    return JSON.parse(localStorage.getItem('ap_cart') || '[]');
}

function saveCart(cart) {
    localStorage.setItem('ap_cart', JSON.stringify(cart));
}

function clearCart() {
    localStorage.removeItem('ap_cart');
}

function addToCart(item) {
    const cart = getCart();
    const existing = cart.find(i => i.name === item.name && i.size === item.size);
    if (existing) {
        existing.qty += 1;
    } else {
        cart.push({ ...item, qty: 1 });
    }
    saveCart(cart);
    updateCartCount();
}

function removeFromCart(index) {
    const cart = getCart();
    cart.splice(index, 1);
    saveCart(cart);
    updateCartCount();
}

function updateQty(index, delta) {
    const cart = getCart();
    cart[index].qty = Math.max(1, cart[index].qty + delta);
    saveCart(cart);
    updateCartCount();
}

function updateCartCount() {
    const cart = getCart();
    const total = cart.reduce((sum, i) => sum + i.qty, 0);
    document.querySelectorAll('#cartCount').forEach(el => {
        if (total > 0) {
            el.textContent = total;
            el.style.display = 'flex';
        } else {
            el.style.display = 'none';
        }
    });
}

function renderCart() {
    const cart = getCart();
    const layout = document.getElementById('cartLayout');
    if (!layout) return;

    if (!cart.length) {
        layout.innerHTML = `
            <div class="cart-empty">
                <p>Your cart is empty.</p>
                <a href="index.html">Continue Shopping</a>
            </div>`;
        return;
    }

    const subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);

    layout.innerHTML = `
        <div class="cart-items" id="cartItems">
            ${cart.map((item, idx) => `
                <div class="cart-item">
                    <div class="cart-item-img">
                        <img src="${item.image}" alt="${item.name}" loading="lazy">
                    </div>
                    <div class="cart-item-info">
                        <div class="cart-item-name">${item.name}</div>
                        <div class="cart-item-meta">Size: ${item.size} · ${item.color}</div>
                        <div class="cart-item-qty">
                            <button class="qty-btn" onclick="changeQty(${idx}, -1)">−</button>
                            <span class="qty-num">${item.qty}</span>
                            <button class="qty-btn" onclick="changeQty(${idx}, 1)">+</button>
                        </div>
                        <button class="cart-item-remove" onclick="removeItem(${idx})">Remove</button>
                    </div>
                    <div class="cart-item-price">$${(item.price * item.qty).toFixed(2)}</div>
                </div>
            `).join('')}
        </div>
        <div class="cart-summary">
            <h2>Order Summary</h2>
            <div class="summary-row"><span>Subtotal</span><span>$${subtotal.toFixed(2)}</span></div>
            <div class="summary-row"><span>Shipping</span><span>Free</span></div>
            <div class="summary-row total"><span>Total</span><span>$${subtotal.toFixed(2)}</span></div>
            <a href="checkout.html" class="checkout-btn">Proceed to Checkout</a>
            <a href="index.html" class="continue-link">Continue Shopping</a>
            <p class="summary-shipping">🚚 Complimentary shipping on all orders</p>
        </div>`;
}

function changeQty(idx, delta) {
    updateQty(idx, delta);
    renderCart();
}

function removeItem(idx) {
    removeFromCart(idx);
    renderCart();
}

// Init count on every page load
document.addEventListener('DOMContentLoaded', updateCartCount);
updateCartCount();
