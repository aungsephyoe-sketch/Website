document.addEventListener('DOMContentLoaded', () => {

    // Loader
    const loader = document.getElementById('loader');
    setTimeout(() => {
        loader.classList.add('hidden');
        animateHero();
    }, 2200);

    function animateHero() {
        const eyebrow = document.querySelector('.hero-eyebrow');
        const title = document.querySelector('.hero-title');
        const cta = document.querySelector('.hero-cta');

        [eyebrow, title, cta].forEach((el, i) => {
            if (!el) return;
            setTimeout(() => {
                el.style.transition = `opacity 0.9s cubic-bezier(0.16, 1, 0.3, 1), transform 0.9s cubic-bezier(0.16, 1, 0.3, 1)`;
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
            }, 200 + i * 200);
        });
    }

    // Scroll animations
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('[data-animate]').forEach(el => observer.observe(el));

    // Nav scroll
    const nav = document.getElementById('nav');
    window.addEventListener('scroll', () => {
        nav.classList.toggle('scrolled', window.scrollY > 10);
    }, { passive: true });

    // Mobile menu
    const menuBtn = document.getElementById('menuBtn');
    const mobileMenu = document.getElementById('mobileMenu');

    menuBtn.addEventListener('click', () => {
        menuBtn.classList.toggle('active');
        mobileMenu.classList.toggle('active');
        document.body.style.overflow = mobileMenu.classList.contains('active') ? 'hidden' : '';
    });

    document.querySelectorAll('.mobile-link').forEach(link => {
        link.addEventListener('click', () => {
            menuBtn.classList.remove('active');
            mobileMenu.classList.remove('active');
            document.body.style.overflow = '';
        });
    });

    // Smooth scroll
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            const target = document.querySelector(anchor.getAttribute('href'));
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // Product Modal
    const modal = document.getElementById('productModal');
    const backdrop = document.getElementById('modalBackdrop');
    const modalClose = document.getElementById('modalClose');
    const modalMainImg = document.getElementById('modalMainImg');
    const modalMainImageWrap = document.getElementById('modalMainImageWrap');
    const modalThumbs = document.getElementById('modalThumbs');
    const modalName = document.getElementById('modalName');
    const modalPrice = document.getElementById('modalPrice');
    const modalColor = document.getElementById('modalColor');
    const modalDesc = document.getElementById('modalDesc');
    const modalFeatures = document.getElementById('modalFeatures');
    const modalCartBtn = document.getElementById('modalCartBtn');
    const modalSlidePrev = document.getElementById('modalSlidePrev');
    const modalSlideNext = document.getElementById('modalSlideNext');

    let modalImages = [];
    let modalCurrentIndex = 0;

    function goToModalSlide(index) {
        modalCurrentIndex = (index + modalImages.length) % modalImages.length;
        modalMainImg.style.opacity = '0';
        setTimeout(() => {
            modalMainImg.src = modalImages[modalCurrentIndex];
            modalMainImg.style.opacity = '1';
        }, 150);
        document.querySelectorAll('.modal-thumb').forEach((t, i) => {
            t.classList.toggle('active', i === modalCurrentIndex);
        });
    }

    modalSlidePrev.addEventListener('click', (e) => { e.stopPropagation(); goToModalSlide(modalCurrentIndex - 1); });
    modalSlideNext.addEventListener('click', (e) => { e.stopPropagation(); goToModalSlide(modalCurrentIndex + 1); });


    function openModal(product) {
        modalImages = JSON.parse(product.dataset.images);
        modalCurrentIndex = 0;
        const details = [
            product.dataset.detail1,
            product.dataset.detail2,
            product.dataset.detail3,
            product.dataset.detail4,
        ].filter(Boolean);

        // Populate
        modalName.textContent = product.dataset.name;
        modalPrice.textContent = product.dataset.price;
        modalColor.textContent = product.dataset.color;
        modalDesc.textContent = product.dataset.desc;

        // Main image
        modalMainImg.src = modalImages[0];
        modalMainImg.alt = product.dataset.name;
        modalMainImg.style.opacity = '1';

        // Show/hide arrows based on image count
        const hasMultiple = modalImages.length > 1;
        modalSlidePrev.style.display = hasMultiple ? '' : 'none';
        modalSlideNext.style.display = hasMultiple ? '' : 'none';

        // Thumbnails
        modalThumbs.innerHTML = '';
        modalImages.forEach((src, i) => {
            const thumb = document.createElement('div');
            thumb.className = 'modal-thumb' + (i === 0 ? ' active' : '');
            thumb.innerHTML = `<img src="${src}" alt="${product.dataset.name} ${i + 1}" loading="lazy">`;
            thumb.addEventListener('click', () => goToModalSlide(i));
            modalThumbs.appendChild(thumb);
        });

        // Features
        modalFeatures.innerHTML = details.map(d =>
            `<div class="modal-feature">${d}</div>`
        ).join('');

        // Reset size + cart
        document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('selected'));
        modalCartBtn.classList.remove('added');
        modalCartBtn.querySelector('.cart-btn-text').textContent = 'Add to Cart';

        // Show
        modal.classList.add('active');
        backdrop.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        modal.classList.remove('active');
        backdrop.classList.remove('active');
        document.body.style.overflow = '';
    }

    document.querySelectorAll('[data-product]').forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.target.closest('.slide-prev') || e.target.closest('.slide-next') || e.target.closest('.slide-dot')) return;
            openModal(item);
        });
        item.style.cursor = 'pointer';
    });

    modalClose.addEventListener('click', closeModal);
    backdrop.addEventListener('click', closeModal);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

    // Size selection
    document.querySelectorAll('.size-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
        });
    });

    // Add to cart
    modalCartBtn.addEventListener('click', () => {
        const selected = document.querySelector('.size-btn.selected');
        if (!selected) {
            document.querySelectorAll('.size-btn').forEach(b => b.style.borderColor = '#c0392b');
            setTimeout(() => document.querySelectorAll('.size-btn').forEach(b => b.style.borderColor = ''), 800);
            return;
        }
        modalCartBtn.classList.add('added');
        modalCartBtn.querySelector('.cart-btn-text').textContent = 'Added to Cart ✓';
        setTimeout(() => {
            modalCartBtn.classList.remove('added');
            modalCartBtn.querySelector('.cart-btn-text').textContent = 'Add to Cart';
        }, 2500);
    });

    // Product sliders
    let activeSlider = null;

    document.querySelectorAll('.product-slider').forEach(slider => {
        const slides = slider.querySelectorAll('.slide');
        const dots = slider.querySelectorAll('.slide-dot');
        const prev = slider.querySelector('.slide-prev');
        const next = slider.querySelector('.slide-next');
        let current = 0;

        function goTo(index) {
            slides[current].classList.remove('active');
            dots[current].classList.remove('active');
            current = (index + slides.length) % slides.length;
            slides[current].classList.add('active');
            dots[current].classList.add('active');
        }

        prev.addEventListener('click', (e) => { e.stopPropagation(); goTo(current - 1); });
        next.addEventListener('click', (e) => { e.stopPropagation(); goTo(current + 1); });
        dots.forEach((dot, i) => dot.addEventListener('click', (e) => { e.stopPropagation(); goTo(i); }));

        // Track focused slider for arrow key navigation
        slider.addEventListener('mouseenter', () => { activeSlider = { goTo, slides }; });
        slider.addEventListener('mouseleave', () => { activeSlider = null; });

    });

    // Arrow key navigation
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

    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
});
