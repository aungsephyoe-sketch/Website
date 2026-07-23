document.addEventListener('DOMContentLoaded', () => {

    /* ═══ LOADER (homepage only) ═══ */
    const loader = document.getElementById('loader');
    if (loader) {
        setTimeout(() => {
            loader.classList.add('hidden');
            animateHero();
        }, 2200);
    }

    function animateHero() {
        const eyebrow = document.querySelector('.hero-eyebrow');
        const title = document.querySelector('.hero-title');
        const cta = document.querySelector('.hero-cta');

        [eyebrow, title, cta].forEach((el, i) => {
            if (!el) return;
            setTimeout(() => {
                el.style.transition = 'opacity 0.9s cubic-bezier(0.16, 1, 0.3, 1), transform 0.9s cubic-bezier(0.16, 1, 0.3, 1)';
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
            }, 200 + i * 200);
        });
    }

    /* ═══ SCROLL ANIMATIONS ═══ */
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('[data-animate]').forEach((el) => observer.observe(el));

    /* ═══ NAV SCROLL SHADOW ═══ */
    const nav = document.getElementById('nav');
    if (nav) {
        window.addEventListener('scroll', () => {
            nav.classList.toggle('scrolled', window.scrollY > 10);
        }, { passive: true });
    }

    /* ═══ MOBILE MENU ═══ */
    const menuBtn = document.getElementById('menuBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    if (menuBtn && mobileMenu) {
        menuBtn.addEventListener('click', () => {
            const active = menuBtn.classList.toggle('active');
            mobileMenu.classList.toggle('active', active);
            menuBtn.setAttribute('aria-expanded', String(active));
            document.body.style.overflow = active ? 'hidden' : '';
        });
        document.querySelectorAll('.mobile-link').forEach((link) => {
            link.addEventListener('click', () => {
                menuBtn.classList.remove('active');
                mobileMenu.classList.remove('active');
                menuBtn.setAttribute('aria-expanded', 'false');
                document.body.style.overflow = '';
            });
        });
    }

    /* ═══ SMOOTH SCROLL FOR IN-PAGE ANCHORS ═══ */
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
        anchor.addEventListener('click', (e) => {
            const hash = anchor.getAttribute('href');
            if (!hash || hash === '#') return;
            const target = document.querySelector(hash);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    /* ═══ PRODUCT GRID FILTER BUTTONS (tag-based) ═══ */
    document.querySelectorAll('[data-product-filters]').forEach((filterBar) => {
        const grid = filterBar.closest('.section, section')?.querySelector('[data-product-grid]');
        if (!grid) return;
        const buttons = filterBar.querySelectorAll('.filter-btn');
        buttons.forEach((btn) => {
            btn.addEventListener('click', () => {
                buttons.forEach((b) => b.classList.remove('active'));
                btn.classList.add('active');
                const tag = btn.dataset.filterTag || '';
                grid.querySelectorAll('[data-product]').forEach((card) => {
                    if (!tag) {
                        card.classList.remove('is-filtered-out');
                        return;
                    }
                    const tags = (card.dataset.tags || '').split(',').map((t) => t.trim().toLowerCase());
                    card.classList.toggle('is-filtered-out', !tags.includes(tag.toLowerCase()));
                });
            });
        });
    });

    /* ═══ PRODUCT CARD IMAGE SLIDERS ═══ */
    let activeSlider = null;

    document.querySelectorAll('.product-slider').forEach((slider) => {
        const slides = slider.querySelectorAll('.slide');
        const dots = slider.querySelectorAll('.slide-dot');
        const prev = slider.querySelector('.slide-prev');
        const next = slider.querySelector('.slide-next');
        if (slides.length < 2) return;
        let current = 0;

        function goTo(index) {
            slides[current].classList.remove('active');
            if (dots[current]) dots[current].classList.remove('active');
            current = (index + slides.length) % slides.length;
            slides[current].classList.add('active');
            if (dots[current]) dots[current].classList.add('active');
        }

        if (prev) prev.addEventListener('click', (e) => { e.stopPropagation(); e.preventDefault(); goTo(current - 1); });
        if (next) next.addEventListener('click', (e) => { e.stopPropagation(); e.preventDefault(); goTo(current + 1); });
        dots.forEach((dot, i) => dot.addEventListener('click', (e) => { e.stopPropagation(); e.preventDefault(); goTo(i); }));

        slider.addEventListener('mouseenter', () => { activeSlider = { goTo, slides }; });
        slider.addEventListener('mouseleave', () => { activeSlider = null; });
    });

    /* ═══ QUICK-VIEW MODAL ═══ */
    const modal = document.getElementById('productModal');
    const backdrop = document.getElementById('modalBackdrop');

    if (modal && backdrop) {
        const modalClose = document.getElementById('modalClose');
        const modalMainImg = document.getElementById('modalMainImg');
        const modalThumbs = document.getElementById('modalThumbs');
        const modalName = document.getElementById('modalName');
        const modalPrice = document.getElementById('modalPrice');
        const modalColor = document.getElementById('modalColor');
        const modalDesc = document.getElementById('modalDesc');
        const modalFeatures = document.getElementById('modalFeatures');
        const modalOptions = document.getElementById('modalOptions');
        const modalCartBtn = document.getElementById('modalCartBtn');
        const modalSlidePrev = document.getElementById('modalSlidePrev');
        const modalSlideNext = document.getElementById('modalSlideNext');
        const modalViewFull = document.getElementById('modalViewFull');

        let modalImages = [];
        let modalCurrentIndex = 0;
        let currentVariant = null;
        const productCache = {};

        function goToModalSlide(index) {
            if (!modalImages.length) return;
            modalCurrentIndex = (index + modalImages.length) % modalImages.length;
            modalMainImg.style.opacity = '0';
            setTimeout(() => {
                modalMainImg.src = modalImages[modalCurrentIndex];
                modalMainImg.style.opacity = '1';
            }, 150);
            modalThumbs.querySelectorAll('.modal-thumb').forEach((t, i) => {
                t.classList.toggle('active', i === modalCurrentIndex);
            });
        }

        if (modalSlidePrev) modalSlidePrev.addEventListener('click', (e) => { e.stopPropagation(); goToModalSlide(modalCurrentIndex - 1); });
        if (modalSlideNext) modalSlideNext.addEventListener('click', (e) => { e.stopPropagation(); goToModalSlide(modalCurrentIndex + 1); });

        function flashInvalid(buttons) {
            buttons.forEach((b) => { b.style.borderColor = '#c0392b'; });
            setTimeout(() => buttons.forEach((b) => { b.style.borderColor = ''; }), 800);
        }

        function buildOptionPicker(product) {
            modalOptions.innerHTML = '';
            const selected = new Array(product.options.length).fill(null);

            function refreshState() {
                const match = product.variants.find((v) => {
                    const vOpts = [v.option1, v.option2, v.option3].slice(0, product.options.length);
                    return vOpts.every((val, i) => val === selected[i]);
                });
                currentVariant = match || null;
                if (currentVariant) {
                    modalPrice.textContent = window.formatMoney(currentVariant.price);
                    modalCartBtn.disabled = !currentVariant.available;
                    modalCartBtn.querySelector('.cart-btn-text').textContent = currentVariant.available ? 'Add to Cart' : 'Sold Out';
                } else {
                    modalCartBtn.disabled = true;
                }
            }

            const hasRealOptions = !(product.options.length === 1 && product.options[0].toLowerCase() === 'title');
            if (!hasRealOptions) {
                currentVariant = product.variants[0];
                modalPrice.textContent = window.formatMoney(currentVariant.price);
                modalCartBtn.disabled = !currentVariant.available;
                modalCartBtn.querySelector('.cart-btn-text').textContent = currentVariant.available ? 'Add to Cart' : 'Sold Out';
                return;
            }

            product.options.forEach((name, idx) => {
                const values = [];
                product.variants.forEach((v) => {
                    const val = [v.option1, v.option2, v.option3][idx];
                    if (val && !values.includes(val)) values.push(val);
                });

                const section = document.createElement('div');
                section.className = 'modal-size-section';

                const header = document.createElement('div');
                header.className = 'modal-size-header';
                const label = document.createElement('span');
                label.className = 'modal-label';
                label.textContent = 'Select ' + name;
                header.appendChild(label);
                section.appendChild(header);

                const row = document.createElement('div');
                row.className = 'modal-sizes';

                values.forEach((val) => {
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'size-btn';
                    btn.textContent = val;
                    btn.addEventListener('click', () => {
                        row.querySelectorAll('.size-btn').forEach((b) => b.classList.remove('selected'));
                        btn.classList.add('selected');
                        selected[idx] = val;
                        refreshState();
                    });
                    row.appendChild(btn);
                });

                section.appendChild(row);
                modalOptions.appendChild(section);
            });

            // Pre-select the first available variant so Add to Cart works immediately.
            const initial = product.variants.find((v) => v.available) || product.variants[0];
            if (initial) {
                [initial.option1, initial.option2, initial.option3].forEach((val, idx) => {
                    if (idx >= product.options.length || !val) return;
                    selected[idx] = val;
                    const row = modalOptions.children[idx]?.querySelector('.modal-sizes');
                    if (!row) return;
                    row.querySelectorAll('.size-btn').forEach((b) => {
                        if (b.textContent === val) b.classList.add('selected');
                    });
                });
                refreshState();
            }
        }

        function stripHtml(html) {
            const doc = new DOMParser().parseFromString(html || '', 'text/html');
            return doc.body.textContent || '';
        }

        function fetchProduct(handle) {
            if (productCache[handle]) return Promise.resolve(productCache[handle]);
            return fetch('/products/' + handle + '.js', { headers: { Accept: 'application/json' } })
                .then((r) => r.json())
                .then((data) => { productCache[handle] = data; return data; });
        }

        function openQuickView(cardEl) {
            const handle = cardEl.dataset.productHandle;
            if (!handle) return;

            fetchProduct(handle).then((product) => {
                modalImages = product.images && product.images.length ? product.images : [];
                modalCurrentIndex = 0;

                modalName.textContent = product.title;
                modalDesc.textContent = stripHtml(product.description);
                modalColor.textContent = '';

                let details = [];
                try {
                    const raw = cardEl.dataset.details;
                    if (raw && raw !== 'null') details = JSON.parse(raw);
                } catch (e) { /* no metafield details set — that's fine */ }
                modalFeatures.innerHTML = '';
                details.filter(Boolean).forEach((d) => {
                    const row = document.createElement('div');
                    row.className = 'modal-feature';
                    row.textContent = d;
                    modalFeatures.appendChild(row);
                });

                if (modalImages.length) {
                    modalMainImg.src = modalImages[0];
                    modalMainImg.style.opacity = '1';
                }
                modalMainImg.alt = product.title;

                const hasMultiple = modalImages.length > 1;
                if (modalSlidePrev) modalSlidePrev.style.display = hasMultiple ? '' : 'none';
                if (modalSlideNext) modalSlideNext.style.display = hasMultiple ? '' : 'none';

                modalThumbs.innerHTML = '';
                modalImages.forEach((src, i) => {
                    const thumb = document.createElement('div');
                    thumb.className = 'modal-thumb' + (i === 0 ? ' active' : '');
                    const img = document.createElement('img');
                    img.src = src;
                    img.alt = product.title + ' ' + (i + 1);
                    img.loading = 'lazy';
                    thumb.appendChild(img);
                    thumb.addEventListener('click', () => goToModalSlide(i));
                    modalThumbs.appendChild(thumb);
                });

                buildOptionPicker(product);

                if (modalViewFull) {
                    modalViewFull.href = product.url;
                    modalViewFull.style.display = '';
                }

                modalCartBtn.classList.remove('added');

                modal.classList.add('active');
                backdrop.classList.add('active');
                document.body.style.overflow = 'hidden';
            }).catch(() => {
                window.location.href = '/products/' + handle;
            });
        }

        function closeModal() {
            modal.classList.remove('active');
            backdrop.classList.remove('active');
            document.body.style.overflow = '';
        }

        /* Drag-to-close gesture (touch + mouse) */
        let dragStartX = null;
        let dragStartY = null;
        let isDragging = false;
        let isHorizontalDrag = null;

        function onDragStart(x, y) {
            dragStartX = x;
            dragStartY = y;
            isDragging = true;
            isHorizontalDrag = null;
        }

        function onDragMove(x, y) {
            if (!isDragging) return;
            const dx = x - dragStartX;
            const dy = y - dragStartY;

            if (isHorizontalDrag === null && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
                isHorizontalDrag = Math.abs(dx) > Math.abs(dy);
            }
            if (!isHorizontalDrag) return;

            if (dx <= 0) {
                modal.style.transform = '';
                return;
            }

            modal.classList.add('dragging');
            modal.style.transform = 'translateX(' + dx + 'px)';

            const modalWidth = modal.offsetWidth;
            const progress = Math.min(dx / modalWidth, 1);
            backdrop.style.opacity = String(1 - progress);
        }

        function onDragEnd(x) {
            if (!isDragging) return;
            isDragging = false;
            modal.classList.remove('dragging');
            modal.style.transform = '';
            backdrop.style.opacity = '';

            if (!isHorizontalDrag) return;

            const dx = x - dragStartX;
            const threshold = modal.offsetWidth * 0.35;
            if (dx > threshold) closeModal();
        }

        modal.addEventListener('touchstart', (e) => onDragStart(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
        modal.addEventListener('touchmove', (e) => onDragMove(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
        modal.addEventListener('touchend', (e) => onDragEnd(e.changedTouches[0].clientX));

        modal.addEventListener('mousedown', (e) => {
            if (e.target.closest('button, a, input, select, .size-btn, .modal-thumb')) return;
            onDragStart(e.clientX, e.clientY);
        });
        window.addEventListener('mousemove', (e) => { if (isDragging) onDragMove(e.clientX, e.clientY); });
        window.addEventListener('mouseup', (e) => onDragEnd(e.clientX));

        document.querySelectorAll('[data-product]').forEach((item) => {
            item.style.cursor = 'pointer';
            item.addEventListener('click', (e) => {
                if (e.target.closest('.slide-prev, .slide-next, .slide-dot, a')) return;
                openQuickView(item);
            });
        });

        if (modalClose) modalClose.addEventListener('click', closeModal);
        backdrop.addEventListener('click', closeModal);

        document.addEventListener('keydown', (e) => {
            if (modal.classList.contains('active')) {
                if (e.key === 'Escape') closeModal();
                if (e.key === 'ArrowLeft') { e.preventDefault(); goToModalSlide(modalCurrentIndex - 1); }
                if (e.key === 'ArrowRight') { e.preventDefault(); goToModalSlide(modalCurrentIndex + 1); }
                return;
            }
            if (!activeSlider) return;
            if (e.key === 'ArrowLeft') { e.preventDefault(); activeSlider.goTo(activeSlider.slides.length - 1); }
            if (e.key === 'ArrowRight') { e.preventDefault(); activeSlider.goTo(1); }
        });

        modalCartBtn.addEventListener('click', () => {
            if (!currentVariant) {
                flashInvalid(Array.from(modalOptions.querySelectorAll('.size-btn:not(.selected)')));
                return;
            }
            modalCartBtn.disabled = true;
            window.CartAPI.add(currentVariant.id, 1).then((item) => {
                return window.updateCartCount();
            }).then(() => {
                modalCartBtn.classList.add('added');
                modalCartBtn.querySelector('.cart-btn-text').textContent = 'Added to Cart ✓';
                setTimeout(() => {
                    modalCartBtn.classList.remove('added');
                    modalCartBtn.querySelector('.cart-btn-text').textContent = 'Add to Cart';
                    modalCartBtn.disabled = !currentVariant || !currentVariant.available;
                }, 2500);
            }).catch((err) => {
                modalCartBtn.disabled = false;
                modalCartBtn.querySelector('.cart-btn-text').textContent = err.message || 'Could not add item';
                setTimeout(() => {
                    modalCartBtn.querySelector('.cart-btn-text').textContent = 'Add to Cart';
                }, 2500);
            });
        });
    }

    /* ═══ MAIN PRODUCT PAGE (gallery + variant picker) ═══ */
    const productMain = document.querySelector('[data-product-main]');
    if (productMain) {
        const pageMainImg = document.getElementById('pageMainImg');
        const pageThumbs = document.getElementById('pageThumbs');
        const pageSlidePrev = document.getElementById('pageSlidePrev');
        const pageSlideNext = document.getElementById('pageSlideNext');
        const pagePrice = document.getElementById('pagePrice');
        const pageOptions = document.getElementById('pageOptions');
        const pageCartBtn = document.getElementById('pageCartBtn');
        const productSelect = document.getElementById('ProductSelect');
        const selectWrapper = document.querySelector('[data-product-select-wrapper]');
        const productForm = document.querySelector('[data-product-form]');

        let pageImages = [];
        let pageCurrentIndex = 0;

        function goToPageSlide(index) {
            if (!pageImages.length) return;
            pageCurrentIndex = (index + pageImages.length) % pageImages.length;
            pageMainImg.src = pageImages[pageCurrentIndex];
            if (pageThumbs) {
                pageThumbs.querySelectorAll('.modal-thumb').forEach((t, i) => t.classList.toggle('active', i === pageCurrentIndex));
            }
        }

        if (pageSlidePrev) pageSlidePrev.addEventListener('click', () => goToPageSlide(pageCurrentIndex - 1));
        if (pageSlideNext) pageSlideNext.addEventListener('click', () => goToPageSlide(pageCurrentIndex + 1));
        if (pageThumbs) {
            pageThumbs.querySelectorAll('.modal-thumb').forEach((thumb, i) => {
                const fullSrc = thumb.dataset.fullSrc;
                if (fullSrc && !pageImages[i]) pageImages[i] = fullSrc;
                thumb.addEventListener('click', () => goToPageSlide(i));
            });
        }

        fetch('/products/' + productMain.dataset.productHandle + '.js', { headers: { Accept: 'application/json' } })
            .then((r) => r.json())
            .then((product) => {
                if (product.images && product.images.length) pageImages = product.images;

                if (selectWrapper) selectWrapper.classList.add('hidden-by-js');
                pageOptions.innerHTML = '';

                const urlVariantId = Number(new URLSearchParams(window.location.search).get('variant'));
                let currentVariant = (urlVariantId && product.variants.find((v) => v.id === urlVariantId))
                    || product.variants.find((v) => v.available)
                    || product.variants[0];

                const selected = currentVariant ? [currentVariant.option1, currentVariant.option2, currentVariant.option3].slice(0, product.options.length) : [];

                function refresh() {
                    const match = product.variants.find((v) => {
                        const vOpts = [v.option1, v.option2, v.option3].slice(0, product.options.length);
                        return vOpts.every((val, i) => val === selected[i]);
                    });
                    currentVariant = match || null;
                    if (productSelect && currentVariant) productSelect.value = String(currentVariant.id);
                    if (pagePrice && currentVariant) pagePrice.textContent = window.formatMoney(currentVariant.price);
                    if (pageCartBtn) {
                        const available = !!currentVariant && currentVariant.available;
                        pageCartBtn.disabled = !available;
                        pageCartBtn.querySelector('.cart-btn-text').textContent = !currentVariant ? 'Unavailable' : (available ? 'Add to Cart' : 'Sold Out');
                    }
                    if (currentVariant && currentVariant.featured_image && currentVariant.featured_image.src) {
                        const idx = product.images.indexOf(currentVariant.featured_image.src);
                        if (idx !== -1) goToPageSlide(idx);
                    }
                }

                const hasRealOptions = !(product.options.length === 1 && product.options[0].toLowerCase() === 'title');

                if (hasRealOptions) {
                    product.options.forEach((name, idx) => {
                        const values = [];
                        product.variants.forEach((v) => {
                            const val = [v.option1, v.option2, v.option3][idx];
                            if (val && !values.includes(val)) values.push(val);
                        });

                        const section = document.createElement('div');
                        section.className = 'modal-size-section';

                        const header = document.createElement('div');
                        header.className = 'modal-size-header';
                        const label = document.createElement('span');
                        label.className = 'modal-label';
                        label.textContent = 'Select ' + name;
                        header.appendChild(label);
                        section.appendChild(header);

                        const row = document.createElement('div');
                        row.className = 'modal-sizes';

                        values.forEach((val) => {
                            const btn = document.createElement('button');
                            btn.type = 'button';
                            btn.className = 'size-btn' + (selected[idx] === val ? ' selected' : '');
                            btn.textContent = val;
                            btn.addEventListener('click', () => {
                                row.querySelectorAll('.size-btn').forEach((b) => b.classList.remove('selected'));
                                btn.classList.add('selected');
                                selected[idx] = val;
                                refresh();
                            });
                            row.appendChild(btn);
                        });

                        section.appendChild(row);
                        pageOptions.appendChild(section);
                    });
                }

                refresh();
            })
            .catch(() => { /* progressive enhancement only — native <select> + form still work */ });

        if (productForm && pageCartBtn) {
            productForm.addEventListener('submit', (e) => {
                if (!window.CartAPI || !productSelect) return; // let it submit normally
                e.preventDefault();
                pageCartBtn.disabled = true;
                window.CartAPI.add(Number(productSelect.value), 1).then(() => {
                    return window.updateCartCount();
                }).then(() => {
                    pageCartBtn.classList.add('added');
                    pageCartBtn.querySelector('.cart-btn-text').textContent = 'Added to Cart ✓';
                    setTimeout(() => {
                        pageCartBtn.classList.remove('added');
                        pageCartBtn.querySelector('.cart-btn-text').textContent = 'Add to Cart';
                        pageCartBtn.disabled = false;
                    }, 2500);
                }).catch((err) => {
                    pageCartBtn.disabled = false;
                    pageCartBtn.querySelector('.cart-btn-text').textContent = err.message || 'Could not add item';
                    setTimeout(() => { pageCartBtn.querySelector('.cart-btn-text').textContent = 'Add to Cart'; }, 2500);
                });
            });
        }
    }

    /* ═══ CART PAGE (qty / remove via AJAX) ═══ */
    const cartItemsWrap = document.getElementById('cartItems');
    if (cartItemsWrap && window.CartAPI) {
        function reloadCartPage() {
            window.location.reload();
        }

        function applyCartUpdate(cart) {
            const subtotalEl = document.querySelector('[data-cart-subtotal]');
            const totalEl = document.querySelector('[data-cart-total]');
            if (subtotalEl) subtotalEl.textContent = window.formatMoney(cart.total_price);
            if (totalEl) totalEl.textContent = window.formatMoney(cart.total_price);
            window.updateCartCount(cart);

            if (cart.item_count === 0) {
                reloadCartPage();
            }
        }

        cartItemsWrap.querySelectorAll('[data-cart-item]').forEach((row) => {
            const key = row.dataset.lineKey;
            const qtyValue = row.querySelector('[data-qty-value]');
            const decreaseBtn = row.querySelector('[data-qty-decrease]');
            const increaseBtn = row.querySelector('[data-qty-increase]');
            const removeBtn = row.querySelector('[data-cart-remove]');
            const priceEl = row.querySelector('[data-line-price]');

            function setBusy(busy) {
                [decreaseBtn, increaseBtn, removeBtn].forEach((b) => { if (b) b.disabled = busy; });
            }

            function changeQty(newQty) {
                setBusy(true);
                window.CartAPI.change(key, newQty).then((cart) => {
                    if (newQty <= 0) {
                        row.remove();
                        applyCartUpdate(cart);
                        return;
                    }
                    const line = cart.items.find((i) => i.key === key);
                    if (line) {
                        qtyValue.textContent = line.quantity;
                        if (priceEl) priceEl.textContent = window.formatMoney(line.final_line_price);
                    }
                    applyCartUpdate(cart);
                    setBusy(false);
                }).catch(() => setBusy(false));
            }

            if (decreaseBtn) decreaseBtn.addEventListener('click', () => {
                const current = parseInt(qtyValue.textContent, 10) || 1;
                changeQty(Math.max(0, current - 1));
            });
            if (increaseBtn) increaseBtn.addEventListener('click', () => {
                const current = parseInt(qtyValue.textContent, 10) || 1;
                changeQty(current + 1);
            });
            if (removeBtn) removeBtn.addEventListener('click', () => changeQty(0));
        });
    }
});
