document.addEventListener('DOMContentLoaded', () => {

    // Loader
    const loader = document.getElementById('loader');
    setTimeout(() => {
        loader.classList.add('hidden');
        animateHero();
    }, 2400);

    // Hero entrance animations
    function animateHero() {
        const eyebrow = document.querySelector('.hero-eyebrow');
        const lines = document.querySelectorAll('.hero-title-line');
        const subtitle = document.querySelector('.hero-subtitle');
        const actions = document.querySelector('.hero-actions');

        setTimeout(() => {
            eyebrow.style.transition = 'opacity 0.8s, transform 0.8s';
            eyebrow.style.opacity = '1';
            eyebrow.style.transform = 'translateY(0)';
        }, 100);

        lines.forEach((line, i) => {
            setTimeout(() => {
                line.style.transition = 'opacity 1s cubic-bezier(0.16, 1, 0.3, 1), transform 1s cubic-bezier(0.16, 1, 0.3, 1)';
                line.style.opacity = '1';
                line.style.transform = 'translateY(0)';
            }, 300 + i * 150);
        });

        setTimeout(() => {
            subtitle.style.transition = 'opacity 0.8s, transform 0.8s';
            subtitle.style.opacity = '1';
            subtitle.style.transform = 'translateY(0)';
        }, 800);

        setTimeout(() => {
            actions.style.transition = 'opacity 0.8s, transform 0.8s';
            actions.style.opacity = '1';
            actions.style.transform = 'translateY(0)';
        }, 1000);
    }

    // Scroll animations
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });

    document.querySelectorAll('[data-animate]:not(.hero-eyebrow):not(.hero-title-line):not(.hero-subtitle):not(.hero-actions)').forEach(el => {
        observer.observe(el);
    });

    // Nav scroll effect
    const nav = document.getElementById('nav');
    let lastScroll = 0;
    window.addEventListener('scroll', () => {
        const scrollY = window.scrollY;
        nav.classList.toggle('scrolled', scrollY > 80);
        lastScroll = scrollY;
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

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            const target = document.querySelector(anchor.getAttribute('href'));
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // Parallax on hero (subtle)
    window.addEventListener('scroll', () => {
        const hero = document.querySelector('.hero-content');
        if (!hero) return;
        const scrollY = window.scrollY;
        if (scrollY < window.innerHeight) {
            hero.style.transform = `translateY(${scrollY * 0.3}px)`;
            hero.style.opacity = 1 - scrollY / window.innerHeight;
        }
    }, { passive: true });
});
