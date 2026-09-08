/* Wada Ring: the circuit in plan units. One file feeds the flat map
   (tools/circuit/map.js) and, from Phase 2, the world itself.

   Plan axes: u and v, 0 to 210. On screen u runs right and down, v runs
   left and down, so the near corner of the plate is (210,210) at the
   bottom and the far corner (0,0) at the top. z is up. One unit is about
   a car length. Direction of travel follows the TRACK point order. */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.CircuitLayout = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var NAME = 'Wada Ring';
    var PLACE = 'Los Angeles, CA';
    var SIZE = 210;

    /* Closed loop, control points for a Catmull-Rom spline. */
    var TRACK = [
        [38, 178], [100, 178], [162, 178],     // pit straight, start line at u=100
        [182, 170], [189, 150],                 // T1, a long right-hander up the right side
        [178, 128], [188, 106],                 // the esses: Campus Corner
        [180, 82], [162, 62],                   // fast sweep at the top right
        [124, 46], [84, 40],                    // back straight, gently bowed
        [48, 44], [24, 58], [22, 82],           // the hairpin around The Exchange
        [40, 104], [28, 124],                   // return-leg chicane past the Press Room
        [20, 150], [26, 170]                    // the last corner onto the straight
    ];
    var TRACK_WIDTH = 9;
    var START = { u: 100, v: 178 };             // the start and finish line

    /* Open, inside the straight. */
    var PIT = [[30, 154], [42, 166], [156, 166], [172, 162]];
    var PIT_WIDTH = 4;

    /* Sector starts, nearest spline sample to each point. S1 starts at the
       start line. Sectors follow the biography: origins, building, now. */
    var SECTORS = [
        { id: 1, at: [100, 178] },
        { id: 2, at: [162, 62] },
        { id: 3, at: [38, 102] }
    ];

    /* The seven stops. anchor is where the label pin and the camera go;
       labelZ lifts the pin; labelSide 'left' or 'below' hangs the chip
       that side of the dot; boxes are blocked-in geometry:
       [u, v, w, d, h, z0, tone]. */
    var LOCATIONS = [
        /* V1.2: the tower moves up the infield with clear grass to the
           garage roof; the signage stack hangs on its front-left. The world
           builds the internals, boards, details and Rep relative to boxes[0]. */
        { id: 'about', num: '01', name: 'About', section: 'Media tower', sector: 3,
          anchor: [100.5, 122.5], labelZ: 55,
          boxes: [[98, 120, 5, 5, 34, 0, 'wall'], [96.5, 118.5, 8, 8, 4, 34, 'roof'], [100, 122, 1.2, 1.2, 7, 38, 'roof']] },
        /* V1.2: the court owns the upper infield, in front of the back
           straight, with a lit apron, stands, floodlights and the pylon.
           Largest footprint and tallest silhouette on the plate. */
        { id: 'betta', num: '02', name: 'Betta', section: 'The court', sector: 1,
          anchor: [120, 87], labelZ: 16,
          boxes: [[106, 79, 28, 16, 0.6, 0, 'wood'], [106.6, 86.2, 1, 1.6, 4, 0, 'roof'], [132.4, 86.2, 1, 1.6, 4, 0, 'roof']],
          arena: { apron: [96, 70, 48, 34],
                   stands: [[100, 70, 36, 6, 'back'], [100, 98, 40, 6, 'front'], [96, 76, 4, 22, 'end']],
                   pylon: [138, 70, 6, 6, 50], head: [135, 69, 12, 4, 6, 50],
                   lights: [[97, 71], [97, 103], [143, 103]], lightH: 26,
                   rep: [150, 99] } },
        { id: 'education', num: '03', name: 'Education', section: 'Campus corner', sector: 1,
          anchor: [199, 112], labelZ: 16,
          boxes: [[192, 96, 14, 32, 1, 0, 'wall'],
                  [198, 100, 1.8, 1.8, 6, 1, 'wall'], [198, 105, 1.8, 1.8, 6, 1, 'wall'], [198, 110, 1.8, 1.8, 6, 1, 'wall'],
                  [198, 115, 1.8, 1.8, 6, 1, 'wall'], [198, 120, 1.8, 1.8, 6, 1, 'wall'], [198, 125, 1.8, 1.8, 6, 1, 'wall'],
                  [196, 98, 6, 30, 1.6, 7, 'wall'], [203, 100, 5, 28, 8, 0, 'wall']] },
        { id: 'economics', num: '04', name: 'Economics', section: 'The exchange', sector: 2,
          anchor: [10, 44], labelZ: 20,
          boxes: [[2, 36, 16, 16, 12, 0, 'wall'], [4, 38, 12, 12, 3, 12, 'roof']],
          ticker: { face: 'v', text: 'PLUME TOKEN YIELD VAULTS  ·  ETHEREUM VALIDATORS  ·  THE MEDICI NETWORK' } },
        { id: 'writing', num: '05', name: 'Writing', section: 'Press room', sector: 3,
          anchor: [7, 103], labelZ: 12,
          boxes: [[2, 96, 10, 14, 5, 0, 'wall'], [1, 95, 12, 16, 0.8, 5, 'roof']] },
        { id: 'projects', num: '06', name: 'Projects', section: 'Pit garage', sector: 3,
          anchor: [118, 150], labelZ: 12, labelSide: 'below',
          boxes: [[72, 150, 56, 12, 7, 0, 'wall'], [70, 148, 60, 15, 0.8, 7, 'roof']] },
        { id: 'contact', num: '07', name: 'Contact', section: 'Pit wall', sector: 3,
          anchor: [144, 171], labelZ: 1.5,
          boxes: [[64, 171, 80, 1.4, 1.8, 0, 'wall'], [96, 170.2, 6, 0.8, 3.6, 0, 'roof'], [106, 170.2, 3, 0.8, 2.6, 0, 'roof']],
          board: { text: 'ABBA.WADA10@GMAIL.COM' } },
        /* V1.2: the blimp is a stop. It drifts over the top-right corner
           with a screen that cycles the Board's images; clicking it opens
           the Board. sky: the world places its pin from the blimp itself. */
        { id: 'board', num: '08', name: 'The Board', section: 'The blimp', sector: 2, sky: true,
          anchor: [140, 30], labelZ: 80, boxes: [] }
    ];

    /* The hoardings (V1.2): big trackside boards carrying the Board's
       images and the three lines of type, readable at the default zoom.
       img panels take their width from the image; text panels give w.
       face 'v' looks toward +v, face 'u' toward +u; both face the camera. */
    var HOARDINGS = [
        /* the top-right wall, behind the sweep, facing the track */
        { at: [138, 12], face: 'v', gap: 1.2, panels: [{ img: 'monaco', h: 11 }, { img: 'osaka', h: 11 }, { img: 'ferrari', h: 13 }, { text: 'AWUS  ·  RATED W', w: 20, h: 7, z0: 5 }] },
        /* the top-left wall, behind the hairpin entry */
        { at: [30, 8], face: 'v', gap: 1.2, panels: [{ img: 'palace', h: 12 }, { img: 'lbp', h: 12 }, { text: 'C++  ·  PYTHON  ·  SQL', w: 22, h: 7, z0: 5 }] },
        /* the left wall, outside the return leg, facing the track */
        { at: [10, 116], face: 'u', gap: 1.2, panels: [{ img: 'senna', h: 12 }, { img: 'helmet', h: 12 }, { img: 'porsche', h: 12 }, { img: 'nigo', h: 12 }] },
        /* the bottom-right wall, behind the car park */
        { at: [150, 198], face: 'v', gap: 1.2, panels: [{ img: 'jeffhardy', h: 9.5 }, { img: 'imac', h: 9.5 }, { text: 'IMU  ·  HAPTICS  ·  FIRMWARE', w: 18, h: 6.5, z0: 2.5 }] },
        /* the grandstand roof, the way Monaco stacks its rooftops */
        { at: [84.5, 24.6], face: 'v', z0: 9.8, gap: 1, panels: [{ img: 'moreira', h: 6 }, { img: 'moreira-site', h: 6 }, { img: 'trio', h: 6 }, { img: 'fisheye', h: 6 }, { img: 'gta4', h: 6 }] },
        /* posters on the faces: the Exchange under its ticker, the garage either side of the bay */
        { at: [3, 52], face: 'v', z0: 1, gap: 1, flat: true, panels: [{ img: 'mouse', h: 6.5 }, { img: 'jordan', h: 6.5 }] },
        { at: [76, 162], face: 'v', z0: 0.5, gap: 1.4, flat: true, panels: [{ img: 'sleeve', h: 5.5 }, { img: 'spiderman', h: 6 }] }
    ];

    /* The lap guide drives past the stops in this order. */
    var LAP = ['about', 'betta', 'education', 'economics', 'writing', 'projects', 'contact'];

    /* What moves on its own: the four cars, the start flag, the sleeve
       shimmer, one board flicker, the drifting blimp. Eight, the ceiling. */
    var AMBIENT = ['grid-cars', 'start-flag', 'sleeve-shimmer', 'board-flicker', 'blimp'];

    /* Scenery, blocked in. */
    var GRANDSTAND = [[84, 30, 48, 6, 5, 0, 'wall'], [84, 26, 48, 5, 9, 0, 'wall'], [82, 24, 52, 13, 0.8, 9, 'roof']];
    var PADDOCK = { slab: [64, 138, 80, 12], haulers: [[76, 140, 7, 3, 3, 0, 'wall'], [86, 140, 7, 3, 3, 0, 'wall'], [112, 140, 7, 3, 3, 0, 'wall'], [122, 140, 7, 3, 3, 0, 'wall']] };
    var BILLBOARDS = [];   // V1.2: replaced by HOARDINGS
    var GRAVEL = [
        [[186, 178], [198, 172], [203, 152], [195, 146], [190, 162], [184, 173]],
        [[14, 54], [6, 62], [6, 84], [14, 86], [17, 70]]
    ];
    var CARPARK = { slab: [170, 178, 26, 16], cars: [[173, 181, 2.2, 1.2], [176.5, 181, 2.2, 1.2], [180, 181, 2.2, 1.2], [187, 181, 2.2, 1.2], [190.5, 181, 2.2, 1.2],
                                                     [173, 188, 2.2, 1.2], [180, 188, 2.2, 1.2], [183.5, 188, 2.2, 1.2], [190.5, 188, 2.2, 1.2]] };
    var TREES = [
        [60, 30, 6], [52, 34, 5], [150, 30, 6], [160, 34, 5], [170, 42, 6], [190, 70, 6], [196, 60, 5],
        [200, 84, 6], [8, 70, 5], [6, 84, 6],
        [40, 192, 5], [50, 196, 6], [120, 192, 5], [130, 196, 6], [150, 190, 5],
        [196, 150, 6], [200, 160, 5], [188, 182, 6], [180, 192, 5],
        [60, 80, 5], [70, 74, 6], [158, 84, 6], [156, 66, 5], [60, 130, 5], [150, 132, 6], [80, 60, 5], [120, 58, 6], [84, 90, 5], [78, 104, 6], [160, 108, 5], [72, 118, 5], [130, 124, 6], [120, 112, 5],
        [36, 32, 6], [184, 30, 6], [204, 40, 5], [206, 30, 6],
        [4, 176, 5], [10, 184, 6], [4, 192, 4], [20, 198, 5], [60, 200, 4], [90, 198, 6], [100, 204, 4],
        [204, 176, 5], [206, 190, 6], [200, 202, 4], [166, 150, 5], [160, 144, 6], [46, 120, 4], [50, 150, 5], [150, 118, 4]
    ];
    var BLIMP = { at: [140, 30, 70], banner: 'BETTA' };
    var FLAG = { at: [100, 184] };

    /* The grid (V1.2). One car per shelf project, in that project's
       livery, lapping from the moment the world is built. The order is
       curated here and nowhere else; nothing on the page reads a feed. */
    var GRID = [
        { id: 'betta', project: 'betta', name: 'Betta', code: 'BET', number: '10', livery: 'gold', stop: 'betta' },
        { id: 'posture', project: 'posture-cue', name: 'Posture Cue', code: 'POS', number: '23', livery: 'white', stop: 'projects' },
        { id: 'vaults', project: 'yield-vaults', name: 'Yield Vaults', code: 'YLD', number: '4', livery: 'green', stop: 'economics' },
        { id: 'bluetooth', project: 'bluetooth-car', name: 'Bluetooth Car', code: 'BLU', number: '12', livery: 'red', stop: 'projects' }
    ];

    var PALETTE = {
        plate: '#e6e0d3', grass: '#b7bfa3', asphalt: '#3b3b3d', paper: '#f7f5f0',
        wall: '#efece5', wallShade: '#c9c3b7', roof: '#6b675f', wood: '#d8bc93',
        accent: '#c6a15b', ink: '#141414', cardinal: '#990000', campusGold: '#ffcc00'
    };

    /* Catmull-Rom sampling. */
    function cr(p0, p1, p2, p3, t) {
        var t2 = t * t, t3 = t2 * t;
        return [
            0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
            0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)
        ];
    }

    function sample(pts, steps, closed) {
        var out = [], n = pts.length, segs = closed ? n : n - 1, i, k;
        for (i = 0; i < segs; i++) {
            var p0 = pts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)];
            var p1 = pts[i];
            var p2 = pts[closed ? (i + 1) % n : i + 1];
            var p3 = pts[closed ? (i + 2) % n : Math.min(n - 1, i + 2)];
            for (k = 0; k < steps; k++) out.push(cr(p0, p1, p2, p3, k / steps));
        }
        if (!closed) out.push(pts[n - 1].slice());
        return out;
    }

    /* Per-sample frames: tangent, left normal (in plan, v down), arc
       length s, signed curvature k. */
    function frames(pts, closed) {
        var n = pts.length, out = [], s = 0, i;
        for (i = 0; i < n; i++) {
            var a = pts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)];
            var b = pts[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
            var tx = b[0] - a[0], ty = b[1] - a[1], L = Math.hypot(tx, ty) || 1;
            tx /= L; ty /= L;
            if (i > 0) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
            out.push({ p: pts[i], t: [tx, ty], n: [ty, -tx], s: s, k: 0 });
        }
        for (i = 0; i < n; i++) {
            var f0 = out[closed ? (i - 1 + n) % n : Math.max(0, i - 1)];
            var f1 = out[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
            var cross = f0.t[0] * f1.t[1] - f0.t[1] * f1.t[0];
            var dot = f0.t[0] * f1.t[0] + f0.t[1] * f1.t[1];
            var ds = Math.abs(f1.s - f0.s) || 1;
            if (closed && i === 0) ds = f1.s + (s - f0.s);
            out[i].k = Math.atan2(cross, dot) / ds;
        }
        var total = s;
        if (closed) total += Math.hypot(pts[0][0] - pts[n - 1][0], pts[0][1] - pts[n - 1][1]);
        out.length_ = total;
        return out;
    }

    function ribbon(fr, w) {
        var L = [], R = [], i;
        for (i = 0; i < fr.length; i++) {
            var f = fr[i];
            L.push([f.p[0] + f.n[0] * w / 2, f.p[1] + f.n[1] * w / 2]);
            R.push([f.p[0] - f.n[0] * w / 2, f.p[1] - f.n[1] * w / 2]);
        }
        return { left: L, right: R };
    }

    function nearest(fr, pt) {
        var best = 0, bd = Infinity, i;
        for (i = 0; i < fr.length; i++) {
            var d = Math.hypot(fr[i].p[0] - pt[0], fr[i].p[1] - pt[1]);
            if (d < bd) { bd = d; best = i; }
        }
        return best;
    }

    return {
        NAME: NAME, PLACE: PLACE, SIZE: SIZE,
        TRACK: TRACK, TRACK_WIDTH: TRACK_WIDTH, START: START,
        PIT: PIT, PIT_WIDTH: PIT_WIDTH, SECTORS: SECTORS,
        LOCATIONS: LOCATIONS, LAP: LAP, AMBIENT: AMBIENT, HOARDINGS: HOARDINGS,
        GRANDSTAND: GRANDSTAND, PADDOCK: PADDOCK, CARPARK: CARPARK, BILLBOARDS: BILLBOARDS,
        GRAVEL: GRAVEL, TREES: TREES, BLIMP: BLIMP, FLAG: FLAG, GRID: GRID,
        PALETTE: PALETTE,
        sample: sample, frames: frames, ribbon: ribbon, nearest: nearest
    };
}));
