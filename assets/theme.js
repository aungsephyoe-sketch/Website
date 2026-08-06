/* Ares Pantheon — Shopify theme JS
   Adapted from the original static site's script.js + cart.js,
   wired to Shopify's cart AJAX API (/cart/add.js, /cart/change.js). */

(function () {
  'use strict';

  /* ═══ Money formatting (Shopify's documented money_format helper) ═══ */

  function formatMoney(cents, format) {
    if (typeof cents === 'string') cents = cents.replace('.', '');
    var value = '';
    var placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
    var formatString = format || window.themeMoneyFormat || '${{amount}}';

    function defaultOption(opt, def) { return typeof opt === 'undefined' ? def : opt; }

    function formatWithDelimiters(number, precision, thousands, decimal) {
      precision = defaultOption(precision, 2);
      thousands = defaultOption(thousands, ',');
      decimal = defaultOption(decimal, '.');
      if (isNaN(number) || number == null) return 0;
      number = (number / 100.0).toFixed(precision);
      var parts = number.split('.');
      var dollars = parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1' + thousands);
      var cents2 = parts[1] ? decimal + parts[1] : '';
      return dollars + cents2;
    }

    switch (formatString.match(placeholderRegex)[1]) {
      case 'amount':
        value = formatWithDelimiters(cents, 2);
        break;
      case 'amount_no_decimals':
        value = formatWithDelimiters(cents, 0);
        break;
      case 'amount_with_comma_separator':
        value = formatWithDelimiters(cents, 2, '.', ',');
        break;
      case 'amount_no_decimals_with_comma_separator':
        value = formatWithDelimiters(cents, 0, '.', ',');
        break;
      default:
        value = formatWithDelimiters(cents, 2);
    }

    return formatString.replace(placeholderRegex, value);
  }

  /* ═══ Cart count badge (all pages) ═══ */

  function updateCartCountUI(count) {
    document.querySelectorAll('#cartCount, .cart-count').forEach(function (el) {
      if (count > 0) {
        el.textContent = count;
        el.style.display = 'flex';
      } else {
        el.style.display = 'none';
      }
    });
  }

  function announce(message) {
    var region = document.getElementById('cart-live-region');
    if (region) region.textContent = message;
  }

  document.addEventListener('DOMContentLoaded', function () {

    /* ═══ Loader (home page only) ═══ */

    var loader = document.getElementById('loader');
    if (loader) {
      setTimeout(function () {
        loader.classList.add('hidden');
        animateHero();
      }, 2200);
    }

    function animateHero() {
      var eyebrow = document.querySelector('.hero-eyebrow');
      var title = document.querySelector('.hero-title');
      var cta = document.querySelector('.hero-cta');
      [eyebrow, title, cta].forEach(function (el, i) {
        if (!el) return;
        setTimeout(function () {
          el.style.transition = 'opacity 0.9s cubic-bezier(0.16, 1, 0.3, 1), transform 0.9s cubic-bezier(0.16, 1, 0.3, 1)';
          el.style.opacity = '1';
          el.style.transform = 'translateY(0)';
        }, 200 + i * 200);
      });
    }

    /* ═══ Scroll-in animations ═══ */

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('[data-animate]').forEach(function (el) { observer.observe(el); });

    /* ═══ Nav scroll shadow ═══ */

    var nav = document.getElementById('nav');
    if (nav) {
      window.addEventListener('scroll', function () {
        nav.classList.toggle('scrolled', window.scrollY > 10);
      }, { passive: true });
    }

    /* ═══ Mobile menu ═══ */

    var menuBtn = document.getElementById('menuBtn');
    var mobileMenu = document.getElementById('mobileMenu');
    if (menuBtn && mobileMenu) {
      menuBtn.addEventListener('click', function () {
        var isActive = menuBtn.classList.toggle('active');
        mobileMenu.classList.toggle('active');
        menuBtn.setAttribute('aria-expanded', isActive ? 'true' : 'false');
        document.body.style.overflow = mobileMenu.classList.contains('active') ? 'hidden' : '';
      });
      document.querySelectorAll('.mobile-link').forEach(function (link) {
        link.addEventListener('click', function () {
          menuBtn.classList.remove('active');
          mobileMenu.classList.remove('active');
          document.body.style.overflow = '';
        });
      });
    }

    /* ═══ Smooth scroll for in-page anchors ═══ */

    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
      anchor.addEventListener('click', function (e) {
        var hash = anchor.getAttribute('href');
        if (hash === '#' || hash.length < 2) return;
        var target = document.querySelector(hash);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });

    /* ═══ Filter pills (decorative, matches original — visual state only) ═══ */

    document.querySelectorAll('.filter-btn').forEach(function (btn) {
      if (btn.tagName === 'A') return; // real collection tag filters — let them navigate
      btn.addEventListener('click', function () {
        document.querySelectorAll('.filter-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
      });
    });

    /* ═══ Product grid image sliders (home + collection cards) ═══ */

    document.querySelectorAll('.product-slider').forEach(function (slider) {
      var slides = slider.querySelectorAll('.slide');
      var dots = slider.querySelectorAll('.slide-dot');
      var prev = slider.querySelector('.slide-prev');
      var next = slider.querySelector('.slide-next');
      var current = 0;
      if (slides.length < 2) return;

      function goTo(index) {
        slides[current].classList.remove('active');
        if (dots[current]) dots[current].classList.remove('active');
        current = (index + slides.length) % slides.length;
        slides[current].classList.add('active');
        if (dots[current]) dots[current].classList.add('active');
      }

      if (prev) prev.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); goTo(current - 1); });
      if (next) next.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); goTo(current + 1); });
      dots.forEach(function (dot, i) {
        dot.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); goTo(i); });
      });
    });

    /* ═══ Product page: gallery (main image + thumbs) ═══ */

    var mainImg = document.getElementById('ProductMainImg');
    var thumbs = document.querySelectorAll('.modal-thumb');
    var galleryPrev = document.getElementById('ProductSlidePrev');
    var galleryNext = document.getElementById('ProductSlideNext');
    var galleryIndex = 0;

    function goToGallerySlide(index) {
      if (!thumbs.length) return;
      galleryIndex = (index + thumbs.length) % thumbs.length;
      var thumb = thumbs[galleryIndex];
      mainImg.style.opacity = '0';
      setTimeout(function () {
        mainImg.src = thumb.getAttribute('data-src');
        mainImg.alt = thumb.getAttribute('data-alt') || '';
        mainImg.style.opacity = '1';
      }, 150);
      thumbs.forEach(function (t, i) { t.classList.toggle('active', i === galleryIndex); });
    }

    if (mainImg && thumbs.length) {
      thumbs.forEach(function (thumb, i) {
        thumb.addEventListener('click', function () { goToGallerySlide(i); });
      });
      if (galleryPrev) galleryPrev.addEventListener('click', function () { goToGallerySlide(galleryIndex - 1); });
      if (galleryNext) galleryNext.addEventListener('click', function () { goToGallerySlide(galleryIndex + 1); });
    }

    /* ═══ Product page: variant selection + add to cart ═══ */

    var productForm = document.getElementById('ProductForm');
    if (productForm) {
      var jsonScript = document.querySelector('script[id^="ProductJSON-"]');
      var product = jsonScript ? JSON.parse(jsonScript.textContent) : null;
      var variantIdInput = document.getElementById('ProductVariantId');
      var priceEl = document.getElementById('ProductPrice');
      var addBtn = document.getElementById('AddToCartBtn');
      var addBtnText = addBtn ? addBtn.querySelector('.cart-btn-text') : null;
      var optionGroups = document.querySelectorAll('.modal-sizes');
      var selectedOptions = [];

      // Pre-select first available variant's option values
      if (product) {
        var initialVariant = product.variants.find(function (v) { return v.available; }) || product.variants[0];
        selectedOptions = initialVariant ? initialVariant.options.slice() : [];
        optionGroups.forEach(function (group) {
          var idx = parseInt(group.getAttribute('data-option-index'), 10);
          var value = selectedOptions[idx];
          group.querySelectorAll('.size-btn').forEach(function (btn) {
            btn.classList.toggle('selected', btn.getAttribute('data-value') === value);
          });
        });
        updateAvailability();
      }

      optionGroups.forEach(function (group) {
        var idx = parseInt(group.getAttribute('data-option-index'), 10);
        group.querySelectorAll('.size-btn').forEach(function (btn) {
          btn.addEventListener('click', function () {
            if (btn.disabled) return;
            group.querySelectorAll('.size-btn').forEach(function (b) { b.classList.remove('selected'); });
            btn.classList.add('selected');
            selectedOptions[idx] = btn.getAttribute('data-value');
            updateAvailability();
          });
        });
      });

      function findMatchingVariant() {
        if (!product) return null;
        return product.variants.find(function (v) {
          return v.options.every(function (val, i) { return val === selectedOptions[i]; });
        });
      }

      function updateAvailability() {
        var variant = findMatchingVariant();

        // Disable option buttons that can't be combined with current selections
        optionGroups.forEach(function (group) {
          var idx = parseInt(group.getAttribute('data-option-index'), 10);
          group.querySelectorAll('.size-btn').forEach(function (btn) {
            var testOptions = selectedOptions.slice();
            testOptions[idx] = btn.getAttribute('data-value');
            var match = product.variants.find(function (v) {
              return v.options.every(function (val, i) { return val === testOptions[i]; });
            });
            btn.disabled = !match || !match.available;
          });
        });

        if (variant) {
          if (variantIdInput) variantIdInput.value = variant.id;
          if (priceEl) priceEl.textContent = formatMoney(variant.price);
          if (addBtn) {
            addBtn.disabled = !variant.available;
            if (addBtnText) addBtnText.textContent = variant.available ? 'Add to Cart' : 'Sold Out';
          }
        } else if (addBtn) {
          addBtn.disabled = true;
          if (addBtnText) addBtnText.textContent = 'Unavailable';
        }
      }

      productForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var variant = findMatchingVariant();

        if (!variant) {
          optionGroups.forEach(function (group) {
            group.querySelectorAll('.size-btn:not(.selected)').forEach(function (b) {
              b.style.borderColor = '#c0392b';
            });
          });
          setTimeout(function () {
            document.querySelectorAll('.size-btn').forEach(function (b) { b.style.borderColor = ''; });
          }, 800);
          return;
        }

        if (addBtn) addBtn.disabled = true;

        fetch(window.routes.cartAddUrl + '.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ items: [{ id: variant.id, quantity: 1 }] })
        })
          .then(function (res) { return res.json(); })
          .then(function () { return fetch('/cart.js'); })
          .then(function (res) { return res.json(); })
          .then(function (cart) {
            updateCartCountUI(cart.item_count);
            announce(product.title + ' added to your cart.');
            if (addBtn) {
              addBtn.classList.add('added');
              if (addBtnText) addBtnText.textContent = 'Added to Cart ✓';
            }
            setTimeout(function () {
              if (addBtn) {
                addBtn.classList.remove('added');
                addBtn.disabled = !variant.available;
                if (addBtnText) addBtnText.textContent = 'Add to Cart';
              }
            }, 2500);
          })
          .catch(function () {
            if (addBtn) addBtn.disabled = false;
            announce('Something went wrong adding this item to your cart.');
          });
      });
    }

    /* ═══ Cart page: quantity +/- and remove via AJAX ═══ */

    var cartForm = document.getElementById('CartForm');
    if (cartForm) {
      cartForm.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-qty-change], .cart-item-remove');
        if (!btn || !cartForm.contains(btn)) return;
        e.preventDefault();

        var line = parseInt(btn.getAttribute('data-line'), 10);
        var quantity = Math.max(0, parseInt(btn.value, 10));

        fetch(window.routes.cartChangeUrl + '.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ line: line, quantity: quantity })
        })
          .then(function (res) { return res.json(); })
          .then(function (cart) {
            updateCartCountUI(cart.item_count);

            if (cart.item_count === 0) {
              window.location.reload();
              return;
            }

            var item = cart.items[line - 1];
            var row = cartForm.querySelector('.cart-item[data-line="' + line + '"]');

            if (!item) {
              // Line removed — a full reload keeps line numbering in sync and is simplest/safest.
              window.location.reload();
              return;
            }

            var qtyDisplay = cartForm.querySelector('[data-qty-display="' + line + '"]');
            var priceDisplay = cartForm.querySelector('[data-line-price="' + line + '"]');
            if (qtyDisplay) qtyDisplay.textContent = item.quantity;
            if (priceDisplay) priceDisplay.textContent = formatMoney(item.final_line_price);

            row.querySelectorAll('[data-qty-change]').forEach(function (b) {
              var delta = b.classList.contains('qty-btn') && b.textContent.trim() === '+' ? 1 : -1;
              b.value = item.quantity + delta;
            });
            var removeBtn = row.querySelector('.cart-item-remove');
            if (removeBtn) removeBtn.value = 0;

            var subtotalEl = document.getElementById('CartSubtotal');
            var totalEl = document.getElementById('CartTotal');
            if (subtotalEl) subtotalEl.textContent = formatMoney(cart.total_price);
            if (totalEl) totalEl.textContent = formatMoney(cart.total_price);
          })
          .catch(function () {
            window.location.reload();
          });
      });
    }
  });
})();
