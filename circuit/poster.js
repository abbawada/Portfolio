/* Wada Ring without WebGL: the rendered poster with the seven stops as
   clickable regions. Same panels, same content, no camera. */
export function mountPoster(L, dom, stops) {
    'use strict';
    const P = window.CircuitPoster;
    if (!P || !dom.poster) return null;
    const SVG = 'http://www.w3.org/2000/svg';
    const byId = {}; L.LOCATIONS.forEach(l => { byId[l.id] = l; });
    let open = null, returnTo = null;

    const box = document.createElement('div'); box.className = 'ring-poster-box';
    const img = document.createElement('img');
    img.src = P.image; img.width = P.width; img.height = P.height; img.decoding = 'async';
    img.alt = 'Wada Ring, an isometric circuit. Each stop opens a section of the portfolio.';
    box.appendChild(img);
    const svg = document.createElementNS(SVG, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100'); svg.setAttribute('preserveAspectRatio', 'none');
    svg.classList.add('ring-poster-areas'); svg.setAttribute('aria-label', 'Stops on the lap'); svg.setAttribute('role', 'group');
    for (const a of P.areas) {
        const loc = byId[a.id]; if (!loc) continue;
        const poly = document.createElementNS(SVG, 'polygon');
        poly.setAttribute('points', a.points.map(p => p[0].toFixed(2) + ',' + p[1].toFixed(2)).join(' '));
        poly.setAttribute('role', 'button'); poly.setAttribute('tabindex', '0');
        poly.setAttribute('aria-label', 'Stop ' + loc.num + ', ' + loc.name + ', ' + loc.section);
        poly.addEventListener('click', () => go(loc, poly));
        poly.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(loc, poly); } });
        svg.appendChild(poly);
        const pin = document.createElement('span'); pin.className = 'ring-pin is-live'; pin.setAttribute('aria-hidden', 'true');
        pin.style.left = a.label[0] + '%'; pin.style.top = a.label[1] + '%';
        pin.innerHTML = '<span class="ring-pin-dot"></span><span class="ring-pin-text"><span class="ring-pin-name">' + loc.num + '&nbsp;&nbsp;' + loc.name +
            '</span><span class="ring-pin-sub">' + loc.section + '</span></span>';
        box.appendChild(pin);
    }
    box.appendChild(svg);
    dom.poster.appendChild(box);
    dom.poster.hidden = false;

    function go(loc, from) {
        open = loc.id; returnTo = from;
        dom.panelKicker.textContent = loc.num + ' ' + loc.section;
        dom.panelTitle.textContent = loc.name;
        dom.panel.dataset.id = loc.id;
        stops.render(loc);
        dom.panel.hidden = false; dom.panel.classList.add('is-open');
        document.body.classList.add('ring-open');
        dom.panelClose.focus({ preventScroll: true });
    }
    function close() {
        if (!open) return;
        open = null;
        dom.panel.classList.remove('is-open'); dom.panel.hidden = true;
        document.body.classList.remove('ring-open');
        stops.clear();
        if (returnTo) { returnTo.focus({ preventScroll: true }); returnTo = null; }
    }
    dom.panelClose.addEventListener('click', close);
    window.addEventListener('keydown', e => {
        if (e.key === 'Escape' && !document.body.classList.contains('stage-open')) close();
    });
    return { go: id => { const loc = byId[id]; if (loc) go(loc, svg.querySelector('[aria-label*="' + loc.name + '"]')); }, close, state: () => ({ open }) };
}
