// =============================================
// AeroX Drones — Interactions & Animations
// =============================================

document.addEventListener('DOMContentLoaded', () => {

    // --- Custom Cursor ---
    const cursor = document.getElementById('cursor');
    const follower = document.getElementById('cursor-follower');

    if (cursor && follower) {
        let mouseX = 0, mouseY = 0;
        let followerX = 0, followerY = 0;

        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
            cursor.style.left = mouseX + 'px';
            cursor.style.top = mouseY + 'px';
            cursor.style.transform = 'translate(-50%, -50%)';
        });

        function animateFollower() {
            followerX += (mouseX - followerX) * 0.12;
            followerY += (mouseY - followerY) * 0.12;
            follower.style.left = followerX + 'px';
            follower.style.top = followerY + 'px';
            requestAnimationFrame(animateFollower);
        }
        animateFollower();

        // Enlarge cursor on links and buttons
        const interactiveEls = document.querySelectorAll('a, button, .btn-explore, .cta-button');
        interactiveEls.forEach(el => {
            el.addEventListener('mouseenter', () => {
                follower.style.width = '60px';
                follower.style.height = '60px';
                follower.style.borderColor = 'var(--accent-orange)';
            });
            el.addEventListener('mouseleave', () => {
                follower.style.width = '40px';
                follower.style.height = '40px';
                follower.style.borderColor = 'var(--accent-cream)';
            });
        });
    }

    // --- Scroll Reveal (IntersectionObserver) ---
    const revealElements = document.querySelectorAll('.reveal-text, .reveal-up, .reveal-img');

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
            }
        });
    }, {
        threshold: 0.15,
        rootMargin: '0px 0px -50px 0px'
    });

    revealElements.forEach(el => revealObserver.observe(el));

    // --- Split FLY BEYOND LIMITS into individual letter spans ---
    const flyPhrases = document.querySelectorAll('.fly-phrase');
    flyPhrases.forEach(phrase => {
        const text = phrase.getAttribute('data-text') || phrase.textContent;
        phrase.textContent = '';
        for (let i = 0; i < text.length; i++) {
            const span = document.createElement('span');
            if (text[i] === ' ') {
                span.classList.add('fly-char', 'fly-space');
                span.innerHTML = '&nbsp;';
            } else {
                span.classList.add('fly-char');
                span.textContent = text[i];
            }
            phrase.appendChild(span);
        }
    });

    // --- Hero drone parallax removed: now using 3D Three.js hero ---

    // --- Navbar hide/show on scroll ---
    const navbar = document.getElementById('navbar');
    let lastScroll = 0;

    window.addEventListener('scroll', () => {
        const currentScroll = window.scrollY;
        if (currentScroll > lastScroll && currentScroll > 100) {
            navbar.style.transform = 'translateY(-100%)';
            navbar.style.transition = 'transform 0.4s ease';
        } else {
            navbar.style.transform = 'translateY(0)';
        }
        lastScroll = currentScroll;
    });

    // --- Smooth scroll for nav links ---
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href');
            const target = document.querySelector(targetId);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // --- Magnetic effect on CTA button ---
    const ctaBtn = document.querySelector('.cta-button');
    if (ctaBtn) {
        ctaBtn.addEventListener('mousemove', (e) => {
            const rect = ctaBtn.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            ctaBtn.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px)`;
        });
        ctaBtn.addEventListener('mouseleave', () => {
            ctaBtn.style.transform = 'translate(0, 0)';
            ctaBtn.style.transition = 'transform 0.4s ease';
        });
        ctaBtn.addEventListener('mouseenter', () => {
            ctaBtn.style.transition = 'none';
        });
    }

    // --- Product Page Thumbnail Switching ---
    const mainImg = document.querySelector('.product-main-img');
    const thumbs = document.querySelectorAll('.thumb');

    if (mainImg && thumbs.length > 0) {
        thumbs.forEach(thumb => {
            thumb.addEventListener('click', () => {
                const newSrc = thumb.querySelector('img').src;
                mainImg.src = newSrc.replace('w=300', 'w=1200'); // Swap for high-res
                
                // Update active state
                thumbs.forEach(t => t.classList.remove('active'));
                thumb.classList.add('active');
            });
        });
    }
});
