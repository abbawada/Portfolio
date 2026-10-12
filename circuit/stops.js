/* Wada Ring, what each stop opens. Phase 4.
   Every block of copy here is verbatim from the pages it came from
   (about.html, betta.html, writing.html, projects.html) and uses the same
   classes, so styles.css renders it as it does there. Cases come from
   cases.js, the engine projects.html runs on, laid out as a grid. */
export function createStops(L, dom) {
    'use strict';
    let engine = null;
    /* round 6: a live piece mounts inside a panel and is loaded only when
       its stop opens. Round 7: the lab (circuit/lab.js), the drawn timeline
       of building Betta, moved from the Betta stop to its own stop, 08
       Journey, and plays on the map as well; the skydiving tile left the
       Projects grid, because the jump now happens on the map, from the
       helicopter. A mount returns a controller with destroy(); a failed
       import leaves the panel as it was, so nothing here can take a stop
       down with it. */
    const V = '16.0';
    const live = [];   // mounted controllers, torn down on clear()
    const REEL = 'https://www.instagram.com/reel/Ddv8Qr_gruP/';
    function mountLive(path, fn) {
        return import('./' + path + '?v=' + V).then(fn).catch(err => { if (window.console) console.warn('live piece skipped', path, err); });
    }

    const SKILLS = ['Python', 'C++', 'C#', 'SQL', 'R', 'Matlab', 'Tableau', 'Excel', 'Fusion 360', 'VectorBT', 'NumPy',
        'Data Analysis', 'Financial Modeling', 'Tokenomics Research', 'Quantitative Analysis', 'Risk Management',
        'A/B Testing', 'Electrical Circuit Design', 'IMU Sensors', 'Haptics', 'Embedded Firmware', 'IoT Development'];

    const grid = ids => '<div class="ring-grid" data-cases="' + ids.join(',') + '" aria-label="Project cases"></div>';
    const line = text => '<p class="ring-panel-line">' + text + '</p>';

    const T = {
        about: () =>
            '<section class="about-body">' +
                '<p class="about-description">I graduated from USC, where I studied economics and hardware.</p>' +
                '<p class="about-description">I\'m currently reading <em>East of Eden</em> by John Steinbeck.</p>' +
                '<p class="about-description">I love running, bike rides, filmmaking, and watching Arsenal or Formula One.</p>' +
            '</section>' +
            '<figure class="ring-portrait"><img src="images/page_halftone.png" alt="" width="2956" height="3768" loading="lazy" decoding="async"></figure>' +
            '<section class="about-section skills">' +
                '<h2 class="about-h">Technical Skills</h2>' +
                '<div class="skills-grid">' + SKILLS.map(s => '<span>' + s + '</span>').join('') + '</div>' +
            '</section>',

        /* round 7: the stop is the way to the Betta site, the sleeve from its hero as one big link */
        betta: () =>
            line('a haptic shooting sleeve') +
            '<a class="ring-hero" href="https://betta.live" target="_blank" rel="noopener noreferrer" aria-label="betta.live, the Betta site, opens in a new tab">' +
                '<picture><source type="image/webp" srcset="images/betta_sleeve_hero-800.webp 800w, images/betta_sleeve_hero-1600.webp 1600w" sizes="(max-width: 760px) 92vw, 520px">' +
                '<img src="images/betta_sleeve_hero-1600.jpg" srcset="images/betta_sleeve_hero-800.jpg 800w, images/betta_sleeve_hero-1600.jpg 1600w" sizes="(max-width: 760px) 92vw, 520px" alt="A player lining up a shot in the black Betta sleeve" width="1600" height="900" decoding="async"></picture>' +
                '<span class="ring-hero-go">betta.live <span aria-hidden="true">&#8599;</span></span>' +
            '</a>' +
            '<p class="ring-lab-links"><a href="betta.html" class="ring-pill">The full case</a><button type="button" class="ring-pill" data-go="journey">The journey</button></p>' +
            '<section class="plain-projects ring-rows" aria-label="Side Quests">' +
                '<div class="plain-group"><h2 class="section-h">Side Quests</h2><ul class="plain-list">' +
                    '<li>Wheelchair Basketball Volunteering. Volunteering with adaptive sports programs.' +
                        '<video controls preload="none" poster="images/wheelchair_poster.jpg" src="videos/Wheelchair_Basketball.mp4" width="1280" height="720" playsinline aria-label="Wheelchair basketball video"></video>' +
                    '</li>' +
                '</ul></div>' +
            '</section>',

        education: () =>
            '<section class="about-section education">' +
                '<h2 class="about-h">Education</h2>' +
                '<p><strong>University of Southern California</strong> | Los Angeles, CA</p>' +
                '<p>Bachelor of Arts, Economics - Dean Scholar (Academic Merit Scholarship)</p>' +
                '<p>Minor: Mathematical Finance | Graduated May 2026</p>' +
                '<p>Specialization: Viterbi School of Engineering, Connected Devices &amp; Making</p>' +
            '</section>' +
            '<section class="betta-milestones ring-award">' +
                '<div class="betta-stats"><div class="betta-stat">' +
                    '<span class="betta-stat-headline">Top 4 of 221</span>' +
                    '<p>The project placed 4th of 221 teams at USC\'s 2026 New Venture Seed Competition and received a $10,000 award.</p>' +
                '</div></div>' +
                '<figure class="betta-cheque">' +
                    '<img src="images/betta_nvsc_cheque.jpg" alt="Accepting the $10,000 NVSC award at USC" width="1170" height="1594" loading="lazy" decoding="async">' +
                    '<figcaption>Accepting the award at USC, April 2026.</figcaption>' +
                '</figure>' +
            '</section>',

        economics: () =>
            grid(['yield-vaults', 'ethereum-validators']) +
            '<section class="plain-projects ring-rows" aria-label="Side Quests">' +
                '<div class="plain-group"><h2 class="section-h">Side Quests</h2><ul class="plain-list">' +
                    '<li>The Medici Network. I built research packets on the speakers and themes ahead of Medici LA 26. After the event, I wrote the 10 Key Takeaways report and produced it print-ready.</li>' +
                '</ul></div>' +
            '</section>',

        writing: () =>
            line('essays on Medium') +
            '<div class="publications-list">' +
                '<a href="https://medium.com/@abbaquant/redeeming-the-internets-original-sin-x402-autonomous-economies-6ca416807e53" target="_blank" rel="noopener noreferrer" class="publication-item">' +
                    '<div class="publication-date">NOV 22, 2025</div>' +
                    '<div class="publication-content"><h2 class="publication-title">Redeeming the Internet\'s Original Sin: X402 Autonomous Economies</h2>' +
                    '<p class="publication-hook">The web never learned to move money, so it sold ads; a dormant HTTP status code could finally fix that.</p></div>' +
                '</a>' +
                '<a href="https://medium.com/@abbawada_63188/a-new-hope-13b7e42c79bd" target="_blank" rel="noopener noreferrer" class="publication-item">' +
                    '<div class="publication-date">JUL 22, 2024</div>' +
                    '<div class="publication-content"><h2 class="publication-title">A New Hope</h2>' +
                    '<p class="publication-hook">A year of getting past self-doubt, choosing to build before writing the novel, and learning that execution beats the perfect concept.</p></div>' +
                '</a>' +
                '<a href="https://medium.com/@abbawada_63188/the-world-is-yours-de54e80b2fb3" target="_blank" rel="noopener noreferrer" class="publication-item">' +
                    '<div class="publication-date">MAY 10, 2024</div>' +
                    '<div class="publication-content"><h2 class="publication-title">The World is Yours</h2>' +
                    '<p class="publication-hook">On plans that feel too big, told through Shadrack, a formerly homeless engineer I built alongside.</p></div>' +
                '</a>' +
            '</div>' +
            '<p class="ring-viewall"><a href="https://medium.com/@abbawada_63188" target="_blank" rel="noopener noreferrer" class="publications-view-all">VIEW ALL →</a></p>',

        projects: () =>
            line('Skydiving, Posture Cue, robots, IoT') +
            grid(['posture-cue', 'visual-mapping', 'bluetooth-car', 'home-temp-monitor']) +
            '<p class="ring-panel-line ring-sky-line">Skydiving, in the making: a jump instrument with a barometer, LiDAR, GPS and haptics. ' +
                '<a href="' + REEL + '" target="_blank" rel="noopener noreferrer" class="ring-inline-link">The reel &rarr;</a></p>' +
            (dom.canJump && dom.canJump() ? '<p class="ring-lab-links"><button type="button" class="ring-pill" data-jump>Jump from the helicopter</button></p>' : ''),

        /* round 7: the lab, the drawn timeline of building Betta, at whatever stage the screen on the map is showing */
        journey: () =>
            line('building Betta, from a robot car to the sleeve') +
            '<div class="ring-lab" data-live="lab"></div>' +
            '<p class="ring-lab-links"><a href="https://betta.live" target="_blank" rel="noopener noreferrer" class="ring-pill">betta.live</a><a href="betta.html" class="ring-pill">The full case</a></p>',

        contact: () =>
            '<section class="about-section contact">' +
                '<h2 class="about-h">Contact</h2>' +
                '<p class="contact-sub">Let\'s build something together</p>' +
                '<div class="contact-info">' +
                    '<a href="mailto:abba.wada10@gmail.com" class="contact-link"><span class="contact-label">Email</span><span class="contact-value">abba.wada10@gmail.com</span></a>' +
                    '<button type="button" class="ring-copy" data-copy="abba.wada10@gmail.com" aria-live="polite">Copy email</button>' +
                    '<a href="https://www.linkedin.com/in/abba-wada-63b999266/" target="_blank" rel="noopener noreferrer" class="contact-link"><span class="contact-label">LinkedIn</span><span class="contact-value">linkedin.com/in/abba-wada-63b999266</span></a>' +
                '</div>' +
            '</section>'
    };

    function render(loc) {
        clear();
        const body = dom.panelBody;
        body.innerHTML = T[loc.id] ? T[loc.id]() : '';
        const g = body.querySelector('.ring-grid');
        if (g && window.CaseShelf) {
            const ids = g.dataset.cases.split(',');
            const cases = ids.map(id => window.CaseShelf.CASES.find(c => c.id === id)).filter(Boolean);
            engine = window.CaseShelf.mount({ shelf: g, stage: dom.stage, cases, layout: 'grid', onCase: dom.onCase });
        }
        const labEl = body.querySelector('[data-live="lab"]');
        if (labEl) {
            const token = ++renderToken;
            mountLive('lab.js', m => {
                if (token !== renderToken || !labEl.isConnected) return;
                const ctl = m.mountLab(labEl, { start: dom.labStart ? dom.labStart() : 0,
                    onInteract: () => { if (dom.onCase) dom.onCase('betta', 'row'); },
                    onStage: i => { if (dom.onLabStage) dom.onLabStage(i); } });   // a scrub here moves the screen on the map too
                if (ctl) live.push(ctl);
            });
        }
        const jumpBtn = body.querySelector('[data-jump]');
        if (jumpBtn) jumpBtn.addEventListener('click', () => { if (dom.onJump) dom.onJump(); });
        for (const b of body.querySelectorAll('[data-go]')) b.addEventListener('click', () => { if (dom.onGo) dom.onGo(b.dataset.go); });
        const copy = body.querySelector('.ring-copy');
        if (copy) copy.addEventListener('click', () => {
            const text = copy.dataset.copy;
            const done = () => { copy.textContent = 'Copied'; setTimeout(() => { copy.textContent = 'Copy email'; }, 1800); };
            if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, done);
            else done();
        });
    }
    let renderToken = 0;   // a mount that resolves after its panel closed must not land in the next one
    function clear() {
        renderToken++;
        while (live.length) { const ctl = live.pop(); try { ctl.destroy(); } catch (e) { /* already gone */ } }
        if (engine) { engine.destroy(); engine = null; }
        if (dom.onCase) dom.onCase(null, 'close');   // a live piece that was feeding a car stops feeding it
        dom.panelBody.innerHTML = '';
    }
    return { render, clear, engine: () => engine };
}
