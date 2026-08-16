const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const saveData = Boolean(navigator.connection && navigator.connection.saveData);

const revealTargets = document.querySelectorAll([
    '.betta-header',
    '.betta-showcase',
    '.betta-milestones',
    '.betta-videos',
    '.betta-footer',
    '.publication-item',
    '.about-body',
    '.about-section'
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
        const rect = element.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) return;

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

const waveCanvas = document.getElementById('wave');
if (waveCanvas && window.RibbonWave) {
    const waveIntensity = parseFloat(document.body.dataset.wave || '0.6');
    window.__wave = window.RibbonWave.mount(waveCanvas, { intensity: waveIntensity });
}
