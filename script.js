const nav = document.getElementById('nav');
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const saveData = Boolean(navigator.connection && navigator.connection.saveData);

function setMobileMenu(open, restoreFocus = false, focusFirstLink = false) {
    if (!navToggle || !navLinks) return;

    navLinks.classList.toggle('active', open);
    navToggle.classList.toggle('active', open);
    navToggle.setAttribute('aria-expanded', String(open));

    if (restoreFocus) {
        navToggle.focus();
    } else if (open && focusFirstLink) {
        navLinks.querySelector('a')?.focus();
    }
}

if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
        const open = navToggle.getAttribute('aria-expanded') !== 'true';
        setMobileMenu(open, false, open);
    });

    nav?.querySelectorAll('a[href^="#"]').forEach((link) => {
        link.addEventListener('click', () => {
            setMobileMenu(false);

            const target = document.querySelector(link.hash);
            if (!target) return;

            requestAnimationFrame(() => {
                target.setAttribute('tabindex', '-1');
                target.focus({ preventScroll: true });
                target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
            });
        });
    });

    document.addEventListener('click', (event) => {
        if (navLinks.classList.contains('active') && !nav.contains(event.target)) {
            setMobileMenu(false);
        }
    });
}

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && navLinks && navLinks.classList.contains('active')) {
        setMobileMenu(false, true);
    }
});

function updateNavigation() {
    if (nav) {
        nav.classList.toggle('scrolled', window.scrollY > 50);
    }
}

window.addEventListener('scroll', updateNavigation, { passive: true });
window.addEventListener('resize', () => {
    if (window.innerWidth > 768) setMobileMenu(false);
});
updateNavigation();

const revealTargets = document.querySelectorAll([
    '.betta-header',
    '.betta-banner',
    '.betta-milestones',
    '.betta-videos',
    '.betta-showcase',
    '.betta-footer',
    '.project-card',
    '.about-content',
    '.publications-header',
    '.publication-item',
    '.project-item',
    '.contact-content'
].join(','));

if ('IntersectionObserver' in window && !reducedMotion.matches) {
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;

            entry.target.classList.remove('reveal-pending');
            entry.target.classList.add('active');
            revealObserver.unobserve(entry.target);
        });
    }, {
        threshold: 0.01,
        rootMargin: '0px 0px -40px 0px'
    });

    revealTargets.forEach((element) => {
        element.classList.add('reveal', 'reveal-pending');
        revealObserver.observe(element);
    });
}

function attachVideoMedia(video) {
    if (!video) return;

    const source = video.dataset.src;
    const poster = video.dataset.poster;
    let changed = false;

    if (source && !video.getAttribute('src')) {
        video.setAttribute('src', source);
        changed = true;
    }

    if (poster && !video.getAttribute('poster')) {
        video.setAttribute('poster', poster);
        changed = true;
    }

    if (changed) {
        video.load();
    }
}

function shouldAutoplay(video) {
    return video.hasAttribute('data-autoplay') &&
        !reducedMotion.matches &&
        !saveData &&
        video.dataset.userPaused !== 'true';
}

const lazyVideos = document.querySelectorAll('video[data-src]');
const ambientVideos = document.querySelectorAll('video[data-autoplay]');
let preloadObserver = null;
let playbackObserver = null;

if ('IntersectionObserver' in window) {
    preloadObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;

            attachVideoMedia(entry.target);
            preloadObserver.unobserve(entry.target);
        });
    }, {
        rootMargin: '400px 0px'
    });

    playbackObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            const video = entry.target;
            video.dataset.inViewport = String(entry.isIntersecting);

            if (entry.isIntersecting) {
                attachVideoMedia(video);
                if (shouldAutoplay(video)) video.play().catch(() => {});
            } else {
                video.pause();
            }
        });
    }, { threshold: 0.01 });

    lazyVideos.forEach((video) => preloadObserver.observe(video));
    ambientVideos.forEach((video) => playbackObserver.observe(video));
} else {
    lazyVideos.forEach((video) => attachVideoMedia(video));
}

const rigVideo = document.querySelector('video[data-autoplay]');
const rigToggle = document.getElementById('bettaRigToggle');

function updateRigToggle() {
    if (!rigVideo || !rigToggle) return;

    const playing = !rigVideo.paused;
    rigToggle.textContent = playing ? 'Pause video' : 'Play video';
    rigToggle.setAttribute('aria-pressed', String(playing));
}

if (rigVideo && rigToggle) {
    rigToggle.addEventListener('click', () => {
        attachVideoMedia(rigVideo);

        if (rigVideo.paused) {
            rigVideo.dataset.userPaused = 'false';
            rigVideo.play().catch(() => updateRigToggle());
        } else {
            rigVideo.dataset.userPaused = 'true';
            rigVideo.pause();
        }
    });

    rigVideo.addEventListener('play', updateRigToggle);
    rigVideo.addEventListener('pause', updateRigToggle);
    updateRigToggle();
}

const homeMonitorPlay = document.getElementById('home-monitor-play');
const homeMonitorVideo = document.getElementById('home-monitor-video');
const homeMonitorThumbnail = document.getElementById('home-monitor-thumbnail');

if (homeMonitorPlay && homeMonitorVideo) {
    homeMonitorPlay.addEventListener('click', () => {
        attachVideoMedia(homeMonitorVideo);
        homeMonitorPlay.hidden = true;
        if (homeMonitorThumbnail) homeMonitorThumbnail.hidden = true;
        homeMonitorVideo.hidden = false;
        homeMonitorVideo.focus({ preventScroll: true });
        homeMonitorVideo.play().catch(() => {});
    });
}

document.querySelectorAll('.project-item-toggle').forEach((toggle) => {
    const panel = document.getElementById(toggle.getAttribute('aria-controls'));
    const item = toggle.closest('.project-item');

    if (!panel || !item) return;

    toggle.addEventListener('click', () => {
        const expanded = toggle.getAttribute('aria-expanded') !== 'true';
        toggle.setAttribute('aria-expanded', String(expanded));
        panel.hidden = !expanded;
        item.classList.toggle('expanded', expanded);

        if (expanded) {
            panel.querySelectorAll('video[data-src]').forEach((video) => {
                attachVideoMedia(video);
            });

            if (!reducedMotion.matches) {
                requestAnimationFrame(() => {
                    item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                });
            }
        } else {
            panel.querySelectorAll('video').forEach((video) => video.pause());
        }
    });
});

const yearElement = document.getElementById('currentYear');
if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
}

function handleReducedMotionChange(event) {
    if (event.matches) {
        revealTargets.forEach((element) => {
            element.classList.remove('reveal-pending');
            element.classList.add('active');
        });

        if (rigVideo) rigVideo.pause();
    } else if (rigVideo?.dataset.inViewport === 'true' && shouldAutoplay(rigVideo)) {
        rigVideo.play().catch(() => {});
    }
}

if (typeof reducedMotion.addEventListener === 'function') {
    reducedMotion.addEventListener('change', handleReducedMotionChange);
} else if (typeof reducedMotion.addListener === 'function') {
    reducedMotion.addListener(handleReducedMotionChange);
}

document.addEventListener('visibilitychange', () => {
    if (!rigVideo) return;

    if (document.hidden) {
        rigVideo.pause();
    } else if (rigVideo.dataset.inViewport === 'true' && shouldAutoplay(rigVideo)) {
        rigVideo.play().catch(() => {});
    }
});
