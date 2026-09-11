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

    /* Closed loop, control points for a Catmull-Rom spline. V1.3: the loop
       fills the plate, longer straights, wider corners, every district
       inside it with grass between neighbours. */
    var TRACK = [
        [30, 190], [100, 190], [170, 190],     // pit straight, start line at u=100
        [190, 182], [199, 160],                 // T1, a long right-hander up the right side
        [186, 134], [198, 108],                 // the esses: Campus Corner
        [190, 80], [168, 54],                   // fast sweep at the top right
        [128, 36], [84, 32],                    // back straight, gently bowed
        [40, 38], [14, 58], [12, 86],           // the hairpin round The Exchange
        [34, 110], [18, 136],                   // return-leg chicane past the Press Room
        [10, 164], [18, 186]                    // the last corner onto the straight
    ];
    var TRACK_WIDTH = 9;
    var START = { u: 100, v: 190 };             // the start and finish line

    /* Open, inside the straight. */
    var PIT = [[26, 168], [40, 178], [160, 178], [176, 174]];
    var PIT_WIDTH = 4;

    /* Sector starts, nearest spline sample to each point. S1 starts at the
       start line. Sectors follow the biography: origins, building, now. */
    var SECTORS = [
        { id: 1, at: [100, 190] },
        { id: 2, at: [168, 54] },
        { id: 3, at: [34, 110] }
    ];

    /* The seven stops. anchor is where the label pin and the camera go;
       labelZ lifts the pin; labelSide 'left' or 'below' hangs the chip
       that side of the dot; boxes are blocked-in geometry:
       [u, v, w, d, h, z0, tone]. The world places each stop's internals,
       details and signs relative to boxes[0], so a stop moves as one. */
    var LOCATIONS = [
        /* V1.3 Session 2: every stop carries one saturated signature colour
           (on its mark and its accents, nowhere else) and one dimensional
           mark in Chakra Petch Bold on a shared graphite mount: text, the
           mount's plan centre and base height, cap height h, the face it
           looks at. The massings below are the blocked-in silhouettes; the
           world adds the sculpture relative to boxes[0]. */
        { id: 'about', num: '01', name: 'About', section: 'Media tower', sector: 3,
          anchor: [50, 120], labelZ: 70, signature: '#22c6e0',
          mark: { text: 'ABOUT', at: [36.5, 120, 49.2], h: 6, face: 'v' },   // slid left along its mount so the deck sits under the T; Rep stands past the T on the deck's back-right corner
          boxes: [[45, 115, 10, 10, 2, 0, 'wall'], [48, 118, 4, 4, 46, 2, 'roof'], [46.5, 116.5, 7, 7, 1, 26, 'roof'],
                  [46, 116, 8, 8, 1.2, 48, 'roof'], [20, 119.5, 1, 1, 12, 49.2, 'roof']] },
        /* the court owns the upper infield, in front of the back straight,
           with a lit apron, stands, floodlights and the pylon. Largest
           footprint and tallest silhouette on the plate. Locked as built. */
        { id: 'betta', num: '02', name: 'Betta', section: 'The court', sector: 1,
          anchor: [120, 87], labelZ: 22, signature: '#f2b632',
          mark: { text: 'BETTA', at: [141, 71, 56], h: 7, face: 'v' },
          boxes: [[106, 79, 28, 16, 0.6, 0, 'wood'], [106.6, 86.2, 1, 1.6, 4, 0, 'roof'], [132.4, 86.2, 1, 1.6, 4, 0, 'roof']],
          arena: { apron: [96, 70, 48, 34],
                   stands: [[100, 70, 36, 6, 'back'], [100, 98, 40, 6, 'front'], [96, 76, 4, 22, 'end']],
                   pylon: [138, 70, 6, 6, 50], head: [135, 69, 12, 4, 6, 50],
                   lights: [[97, 71], [97, 103], [143, 103]], lightH: 26,
                   rep: [150, 99] } },
        { id: 'education', num: '03', name: 'Education', section: 'Campus corner', sector: 1,
          anchor: [180, 152], labelZ: 1, labelSide: 'below', signature: '#c8102e',
          mark: { text: 'EDUCATION', at: [165, 142, 9], h: 4.6, face: 'v' },
          boxes: [[158, 116, 18, 30, 0.6, 0, 'wall'], [158, 138, 18, 8, 9, 0, 'wall'], [170, 116, 6, 22, 7, 0, 'wall'],
                  [158, 116, 12, 8, 9, 0, 'wall'], [163, 145.4, 7, 1.2, 5, 0, 'wall']] },
        { id: 'economics', num: '04', name: 'Economics', section: 'The exchange', sector: 2,
          anchor: [37, 58], labelZ: 30, signature: '#1fb46a',
          mark: { text: 'ECONOMICS', at: [37, 58, 14], h: 4.6, face: 'v' },
          boxes: [[22, 50, 30, 18, 10, 0, 'wall'], [31, 52, 12, 12, 14, 0, 'wall'], [22, 49, 31, 20, 0.4, 10, 'roof']],
          ticker: { face: 'v', text: 'PLUME TOKEN YIELD VAULTS  ·  ETHEREUM VALIDATORS  ·  THE MEDICI NETWORK' } },
        { id: 'writing', num: '05', name: 'Writing', section: 'Press room', sector: 3,
          anchor: [78, 109], labelZ: 1, labelSide: 'below', signature: '#ff3d8a',
          mark: { text: 'WRITING', at: [79, 104, 11.6], h: 4.8, face: 'v' },
          boxes: [[73, 98, 12, 12, 11, 0, 'wall'], [72, 97, 14, 14, 0.6, 11, 'roof'], [74, 111, 10, 4, 1, 0, 'wall']] },
        { id: 'projects', num: '06', name: 'Projects', section: 'Pit garage', sector: 3,
          anchor: [128, 168], labelZ: 9, labelSide: 'below', signature: '#ff6a1f',
          mark: { text: 'PROJECTS', at: [100, 168, 11], h: 6, face: 'v' },
          boxes: [[72, 162, 60, 12, 8, 0, 'wall'], [70, 160, 64, 15, 0.6, 8, 'roof']] },
        { id: 'contact', num: '07', name: 'Contact', section: 'Pit wall', sector: 3,
          anchor: [150, 183], labelZ: 1.5, signature: '#2f5bff',
          mark: { text: 'CONTACT', at: [52, 183.7, 1.8], h: 4.4, face: 'v' },
          boxes: [[37, 183, 113, 1.4, 1.8, 0, 'wall'], [96, 182.2, 6, 0.8, 3.6, 0, 'roof'], [106, 182.2, 3, 0.8, 2.6, 0, 'roof'],
                  [75, 181, 2.4, 1.6, 3.2, 0, 'wall'], [83, 181, 2.4, 1.6, 3.2, 0, 'wall'], [111, 181, 2.4, 1.6, 3.2, 0, 'wall'], [125, 181, 2.4, 1.6, 3.2, 0, 'wall'], [139, 181, 2.4, 1.6, 3.2, 0, 'wall']],
          board: { text: 'ABBA.WADA10@GMAIL.COM' } }
    ];

    /* The hoardings: three lines of type on trackside boards, big enough
       to read at the default zoom (V1.3 Session 1: the photographs are
       gone; the world is modeled geometry, type and emissive signage).
       face 'v' looks toward +v, face 'u' toward +u; both face the camera. */
    var HOARDINGS = [
        { at: [42, 12], face: 'v', panels: [{ text: 'C++  ·  PYTHON  ·  SQL', w: 22, h: 7, z0: 4 }] },
        { at: [140, 12], face: 'v', panels: [{ text: 'ARSENAL  ·  FORMULA ONE', w: 20, h: 7, z0: 4 }] },
        { at: [203, 126], face: 'u', panels: [{ text: 'IMU  ·  HAPTICS  ·  FIRMWARE', w: 18, h: 6.5, z0: 3 }] }
    ];

    /* The lap guide drives past the stops in this order. */
    var LAP = ['about', 'betta', 'education', 'economics', 'writing', 'projects', 'contact'];

    /* What moves on its own: the seven cars (one system, not seven), the
       start flag, the sleeve shimmer, one board flicker, and the blimp,
       which now shadows the race leader instead of drifting in a corner. */
    var AMBIENT = ['grid-cars', 'start-flag', 'sleeve-shimmer', 'board-flicker', 'blimp'];

    /* Scenery, blocked in. */
    var GRANDSTAND = [[84, 14, 48, 6, 5, 0, 'wall'], [84, 10, 48, 5, 9, 0, 'wall'], [82, 8, 52, 13, 0.8, 9, 'roof']];
    var PADDOCK = { slab: [64, 146, 80, 12], haulers: [[76, 148, 7, 3, 3, 0, 'wall'], [86, 148, 7, 3, 3, 0, 'wall'], [112, 148, 7, 3, 3, 0, 'wall'], [122, 148, 7, 3, 3, 0, 'wall']] };
    var BILLBOARDS = [];   // replaced by HOARDINGS
    var GRAVEL = [
        [[195, 188], [206, 186], [207, 162], [203, 158], [202, 174], [196, 184]],
        [[9, 50], [4, 58], [4, 84], [9, 90], [7, 70]]
    ];
    var CARPARK = { slab: [150, 152, 26, 14], cars: [[153, 155, 2.2, 1.2], [156.5, 155, 2.2, 1.2], [160, 155, 2.2, 1.2], [167, 155, 2.2, 1.2], [170.5, 155, 2.2, 1.2],
                                                     [153, 161, 2.2, 1.2], [160, 161, 2.2, 1.2], [163.5, 161, 2.2, 1.2], [170.5, 161, 2.2, 1.2]] };
    /* low barrier walls with his marks in type: the pit straight, the hairpin, the back straight */
    var BARRIERS = [
        { box: [52, 197, 44, 0.6, 2.2, 0], face: 'v', text: 'WADA RING   ·   BETTA   ·   WADA RING' },
        { box: [104, 197, 46, 0.6, 2.2, 0], face: 'v', text: 'FEEL EVERY REP   ·   USC   ·   TOP 4 OF 221' },
        { box: [3, 48, 0.6, 28, 2.2, 0], face: 'u', text: 'BETTA   ·   BETTA' },
        { box: [50, 22, 30, 0.6, 2.2, 0], face: 'v', text: 'LOS ANGELES   ·   WADA RING' }
    ];
    var CAMPUS_CURBS = [[196, 150], [192, 88]];   // cardinal and gold curbs from the T1 exit to the sweep
    var RUNOFF = { at: [182, 168] };                // BETTA painted inside T1, along the track
    var TREES = [   // seeded by tools/circuit/trees.js
        [17, 8, 4], [33, 9, 5], [52, 6, 4], [71, 11, 4], [138, 8, 4], [153, 7, 4], [165, 6, 5], [171, 9, 6],
        [7, 20, 6], [18, 19, 5], [32, 19, 5], [150, 20, 4], [165, 19, 5], [173, 16, 6], [196, 20, 6], [30, 32, 4],
        [128, 27, 5], [142, 29, 5], [152, 28, 4], [185, 30, 5], [198, 30, 4], [11, 42, 6], [77, 42, 5], [82, 44, 5],
        [95, 43, 5], [107, 44, 4], [183, 39, 4], [197, 40, 5], [61, 51, 5], [71, 49, 5], [95, 50, 4], [104, 54, 4],
        [118, 50, 4], [141, 55, 5], [186, 53, 5], [62, 62, 5], [71, 62, 5], [85, 63, 5], [93, 60, 6], [109, 66, 6],
        [118, 60, 5], [139, 62, 6], [195, 61, 5], [49, 73, 5], [71, 76, 6], [87, 74, 4], [171, 74, 5], [29, 82, 5],
        [43, 85, 6], [53, 84, 5], [75, 85, 6], [82, 85, 4], [148, 85, 5], [159, 85, 5], [170, 87, 5], [44, 95, 6],
        [50, 98, 5], [175, 99, 4], [181, 94, 6], [6, 107, 4], [53, 110, 6], [150, 105, 6], [165, 104, 5], [175, 110, 4],
        [183, 108, 6], [10, 120, 5], [62, 116, 5], [137, 119, 5], [148, 119, 6], [5, 126, 5], [40, 130, 6], [55, 131, 6],
        [65, 130, 4], [71, 130, 6], [83, 126, 5], [115, 131, 6], [129, 129, 4], [27, 138, 5], [55, 139, 5], [77, 137, 4],
        [84, 137, 5], [105, 140, 6], [120, 142, 4], [131, 138, 5], [143, 141, 4], [153, 137, 5], [27, 153, 6], [54, 150, 5],
        [60, 153, 5], [183, 154, 4], [41, 160, 5], [39, 172, 6], [55, 170, 5], [152, 170, 5], [7, 186, 4], [186, 197, 5]
    ];
    var BLIMP = { at: [150, 22, 70], banner: 'BETTA', height: 62, lead: 16, ease: 0.55 };   // it flies over the race leader: height above the plate, how far ahead of the leader's nose it sits, how fast it closes
    var FLAG = { at: [100, 196] };

    /* The grid. One car per shelf project, lapping from the moment the
       world is built. The race is simulated live: this list is the field,
       not the order. The order and the gaps come from the cars' distance
       along the track, and the visitor's own tour of the page feeds the
       car of whatever they open (see circuit/pulse.js). Nothing on the
       page reads a feed.
       number is the plate; stop is where the project lives, and opening
       that stop feeds this car; accent is the car's own colour, a candy
       flavour set so seven cars stay apart from each other on the road.
       project matches an id in cases.js, so opening a case feeds its car. */
    var GRID = [
        { id: 'betta', project: 'betta', name: 'Betta', code: 'BET', number: '10', accent: '#f2b632', stop: 'betta' },
        { id: 'posture', project: 'posture-cue', name: 'Posture Cue', code: 'POS', number: '23', accent: '#ff8a00', stop: 'projects' },
        { id: 'vaults', project: 'yield-vaults', name: 'Yield Vaults', code: 'YLD', number: '4', accent: '#a8e02a', stop: 'economics' },
        { id: 'bluetooth', project: 'bluetooth-car', name: 'Bluetooth Car', code: 'BLU', number: '12', accent: '#ff3d6e', stop: 'projects' },
        { id: 'mapping', project: 'visual-mapping', name: 'Visual Mapping', code: 'MAP', number: '7', accent: '#00b8d4', stop: 'projects' },
        { id: 'validators', project: 'ethereum-validators', name: 'Validators', code: 'ETH', number: '32', accent: '#8a63ff', stop: 'economics' },
        { id: 'temp', project: 'home-temp-monitor', name: 'Temp Monitor', code: 'TMP', number: '21', accent: '#00d6a1', stop: 'projects' }
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
        GRAVEL: GRAVEL, TREES: TREES, BLIMP: BLIMP, FLAG: FLAG, GRID: GRID, BARRIERS: BARRIERS, CAMPUS_CURBS: CAMPUS_CURBS, RUNOFF: RUNOFF,
        PALETTE: PALETTE,
        sample: sample, frames: frames, ribbon: ribbon, nearest: nearest
    };
}));
