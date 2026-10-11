/* The lab, variant A (cinematic and tight). A drawn, animated timeline of
   Abba building Betta: one cave, one lamp, one bench, six stages so far.
   Plain canvas 2D, no libraries, no network, no raster images.

   API: mountLab(el, { onInteract, autoplay, start })
        -> { destroy(), goTo(i), play(), pause(), stages }
   Extra, for the harness: opts.still (true, or seconds into the loop) renders
   one frozen frame per stage; the returned object also carries stats().

   The data lives in STAGES below. The choreography per stage lives in
   ACTIONS, keyed by the stage id, so a seventh stage is one object in
   STAGES plus one keyframe list in ACTIONS (or action: 'sleeve' to reuse). */

export const STAGES = [
    {
        id: 'car', date: 'Nov 2025', title: 'Bluetooth Car', number: '1', unit: 'phone',
        line: 'A robot car on a breadboard, driven from my phone.',
        hair: 'twists', outfit: 'navy', bench: 'car', shelf: [], laptop: null, cheque: 'none',
        action: 'car', loop: 7, still: 3.3,
    },
    {
        id: 'posture', date: 'Dec 2025', title: 'Posture Cue', number: '15 s', unit: 'of slouching',
        line: 'A posture board on my chest: slouch and it buzzes.',
        hair: 'twists', outfit: 'navy', bench: 'posture', shelf: ['car'], laptop: null, cheque: 'none',
        action: 'posture', loop: 7, still: 4.78,
    },
    {
        id: 'throws', date: 'Jan 2026', title: 'The first free throws', number: '100', unit: 'reads a second',
        line: 'Winter break: the posture board on my forearm, free throws.',
        hair: 'twists', outfit: 'track', bench: 'forearm', shelf: ['car'], laptop: 'curve', cheque: 'none',
        action: 'throws', loop: 7, still: 1.9,
    },
    {
        id: 'award', date: 'Apr 2026', title: 'Top 4 of 221', number: 'Top 4', unit: 'of 221',
        line: 'USC New Venture Seed Competition, pinned to the wall.',
        hair: 'twists', outfit: 'blazer', bench: 'award', shelf: ['car', 'posture'], laptop: 'idle', cheque: 'pin',
        action: 'award', loop: 7, still: 3.5,
    },
    {
        id: 'rig', date: 'Aug 2026', title: 'The rig', number: '6', unit: 'firmware versions',
        line: 'A protoboard I soldered, two IMUs, motors on my arm.',
        hair: 'curls', outfit: 'tank', bench: 'rig', shelf: ['car', 'posture'], laptop: 'two', cheque: 'wall',
        action: 'rig', loop: 7, still: 1.05,
    },
    {
        id: 'sleeve', date: 'Oct 2026', title: 'The Betta sleeve', number: '21 of 28', unit: 'reps buzzed',
        line: 'The sleeve, first court session, Oct 8.',
        hair: 'curls', outfit: 'hoodie', bench: 'sleeve', shelf: ['car', 'posture', 'rig'], laptop: 'coach', cheque: 'wall',
        action: 'sleeve', loop: 7, still: 4.9,
    },
    /* a seventh stage goes here: { id, date, title, number, unit, line,
       hair: 'twists' | 'curls', outfit: 'navy' | 'track' | 'blazer' | 'tank' | 'hoodie',
       bench: what sits on the bench, shelf: the ids already on the shelf,
       laptop: null | 'idle' | 'curve' | 'two' | 'coach', cheque: 'none' | 'pin' | 'wall',
       action: the ACTIONS key, loop: seconds per action loop, still: the second to freeze on } */
];

/* ------------------------------------------------------------------
   constants
   ------------------------------------------------------------------ */
const W = 600, H = 400;                       // the scene, 3:2
const DWELL = 7, DWELL_LAST = 14;             // autoplay seconds per stage
const CUT_OUT = 0.35, CUT_IN = 0.45;          // the fade to black between stages
const SCRUB_OUT = 0.14, SCRUB_IN = 0.26;      // the shorter dip on a visitor's scrub
const SEAM = 0.3;                             // the crossfade over a loop's wrap
const USER_PAUSE = 25000;                     // ms of autoplay pause after a scrub
const LAMP = [240, 36];                       // the one lamp, up-left of him so the throw clears it
const BENCH_BACK = 288, BENCH_FRONT = 300;
const CHEQUE_WALL = { x: 158, y: 104, w: 92, h: 56 };
const STAND = [200, BENCH_BACK + 6];          // the iron stand, left of the ball
const PAPER = '#f7f5f0';
const GOLD = '240, 182, 74', CYAN = '58, 215, 230', EMBER = '255, 120, 48';
const SKIN = { lit: '#62412e', mid: '#4a3226', shade: '#2d1c14', hot: '#7c5339' };
const HAIR = { base: '#120d0a', lit: '#271b14', catch: '#3b2a1f' };
const OUTFITS = {
    navy: { lit: '#2d3d63', mid: '#1f2b47', shade: '#121a2e', sleeve: 0.42, below: '#121317' },
    track: { lit: '#34363c', mid: '#232529', shade: '#141517', sleeve: 0.42, pants: { lit: '#6c6f78', mid: '#53565d', stripe: '#c3c6cd' } },
    blazer: { lit: '#2a2b30', mid: '#18191c', shade: '#0c0c0e', sleeve: 1, lapel: '#33343a', tee: '#1f2024', below: '#0e0e10' },
    tank: { lit: '#2c2d33', mid: '#1b1c20', shade: '#0f1012', sleeve: 0, pants: { lit: '#63666e', mid: '#4b4e55', stripe: '#cdd0d6' } },
    hoodie: { lit: '#5c3b92', mid: '#452b71', shade: '#2b1a49', sleeve: 0.5, hood: true, below: '#111114' },   // sleeves pushed up above the elbow
};
/* the rest pose: hands flat on the bench's far edge, each elbow bent */
const REST = { rh: [292, 280], fh: [356, 282], rw: -0.9, fw: 1.0 };
const DEFAULTS = {
    rh: REST.rh, fh: REST.fh, rw: REST.rw, fw: REST.fw, pitch: 0.65, yaw: 0.05, lean: 0, bob: 0, turn: 0, look: 0, mouth: 0, nod: 0, grip: 0,
    led: 0, spin: 0, carX: 0, stick: 0, wire: 0,
    board: 0, bar: 0.3, perfect: 0,
    ball: 0, fly: 0, chq: 0, iron: 0, smoke: 0, sleeve: 0, check: 0, coach: 0,
};

/* ------------------------------------------------------------------
   choreography: [time, values, ease]; the ease belongs to the segment
   that ends at that keyframe; 'hold' keeps the previous value until then.
   Before a track's first key the pose holds the DEFAULTS value.
   `again` is the settled loop a stage plays from its second pass on
   (the cheque stays pinned, the sleeve stays on); without one the main
   keys repeat.
   ------------------------------------------------------------------ */
const BALL_REST = [262, BENCH_BACK - 6];      // where the spare ball sits on the bench
const PICK = { rh: [256, 270], fh: [274, 264] };
const SET = { rh: [292, 198], fh: [322, 186] };
const DIP = { rh: [294, 208], fh: [324, 196] };
const RELEASE = { rh: [320, 58], fh: [356, 74] };   // the shooting wrist 44 units from the shade's corner; the guide hand beside the ball, its elbow out
const LAUNCH = [346, 45];                     // where the ball leaves the shooting hand's fingertips at RELEASE (its tip plus the ball's radius), above the brow and in front of it
const PARK = [206, 266];                      // the near hand parking the iron on the stand
const SLEEVE_FLAT = [362, BENCH_BACK - 2];    // where the sleeve lies on the bench before he pulls it on
/* the free throw as a reusable beat starting at t0: pick up, set, eyes up, dip, release, flight;
   `coach` adds the coach page's five words lighting in order (Pulses, Set, Shot, Held, Good rep) */
function freeThrow(t0, coach) {
    const k = [
        [t0 + 0.0, { rh: PICK.rh, fh: PICK.fh, pitch: 0.7, yaw: -0.25, bob: 0, rw: 0, fw: 0, turn: 0 }],
        [t0 + 0.02, { ball: 1 }, 'hold'],
        [t0 + 0.45, { rh: SET.rh, fh: SET.fh, pitch: 0.1, yaw: 0.1, turn: 0.35 }],
        [t0 + 0.75, { pitch: -0.35, yaw: 0.3 }],
        [t0 + 0.8, { bob: 0 }], [t0 + 1.1, { bob: 9, rh: DIP.rh, fh: DIP.fh }],
        [t0 + 1.4, { bob: -4, rh: RELEASE.rh, fh: RELEASE.fh, pitch: -0.5, yaw: 0.3, turn: 0.5 }, 'out'],
        [t0 + 1.4, { rw: 0 }], [t0 + 1.65, { rw: 1.0 }, 'out'],
        [t0 + 1.42, { ball: 2 }, 'hold'],
        [t0 + 1.4, { fly: 0 }], [t0 + 2.2, { fly: 1 }, 'lin'],
        [t0 + 2.2, { ball: 3 }, 'hold'],
        [t0 + 2.1, { rh: RELEASE.rh, fh: RELEASE.fh, bob: -4, turn: 0.5 }],
    ];
    if (coach) k.push([t0 + 0.05, { coach: 1 }, 'hold'], [t0 + 0.72, { coach: 2 }, 'hold'], [t0 + 1.4, { coach: 3 }, 'hold'], [t0 + 1.72, { coach: 4 }, 'hold'], [t0 + 1.9, { coach: 5 }, 'hold']);
    return k;
}
/* the sleeve's haptics through one throw: taps that speed up to the set point, ONE firm buzz at set,
   ONE long buzz after release for the good rep */
function haptics(t0) { return [[t0 + 0.18, 'tapn'], [t0 + 0.4, 'tapn'], [t0 + 0.56, 'tapn'], [t0 + 0.66, 'tapn'], [t0 + 0.72, 'set'], [t0 + 1.9, 'long']]; }
const ACTIONS = {
    car: {
        keys: [
            [0.0, { rh: [300, 272], fh: REST.fh, pitch: 0.7, yaw: 0.1, wire: 1, rw: -0.2 }],
            [0.9, { rh: [303, 277] }, 'out'],
            [1.0, { led: 1 }, 'hold'], [1.25, { led: 0 }, 'hold'], [1.5, { led: 1 }, 'hold'], [1.75, { led: 0 }, 'hold'], [2.0, { led: 1 }, 'hold'], [2.25, { led: 0 }, 'hold'],
            [1.3, { wire: 0 }, 'hold'],
            [1.1, { rh: [303, 277] }], [1.6, { rh: [290, 258], rw: -0.2 }],              // the hand lifts off the car
            [2.0, { rh: [290, 258] }], [2.6, { rh: REST.rh, rw: REST.rw }],
            [1.0, { fh: REST.fh, fw: REST.fw }], [1.9, { fh: [418, 266], fw: 0.2 }],     // the far hand to the phone
            [2.2, { fh: [418, 271] }, 'out'],
            [2.3, { spin: 0 }], [2.9, { spin: 1 }],
            [2.8, { stick: 1 }, 'hold'], [3.6, { stick: 0 }, 'hold'], [4.0, { stick: -1 }, 'hold'], [4.8, { stick: 0 }, 'hold'],
            [2.8, { carX: 0 }], [3.6, { carX: 60 }, 'out'], [4.0, { carX: 60 }], [4.8, { carX: 0 }],   // the car drives off and back
            [4.9, { spin: 1 }], [5.4, { spin: 0 }],
            [3.0, { pitch: 0.6, yaw: 0.1 }], [3.5, { pitch: 0.5, yaw: 0.3 }], [4.1, { pitch: 0.5, yaw: 0.3 }], [4.7, { pitch: 0.6, yaw: 0.1 }],
            [4.9, { fh: [418, 271] }], [5.5, { fh: REST.fh, fw: REST.fw }],
            [4.8, { look: 0 }], [5.1, { yaw: 0, pitch: 0, look: 1 }], [5.9, { yaw: 0, pitch: 0, look: 1 }], [6.4, { yaw: 0.1, pitch: 0.7, look: 0 }],
            [6.0, { rh: REST.rh, rw: REST.rw }], [6.8, { rh: [300, 272], rw: -0.2 }],
            [6.8, { wire: 1 }, 'hold'],
        ],
        events: [],
    },
    posture: {
        keys: [
            [0.0, { rh: [300, 272], fh: REST.fh, pitch: 0.7, yaw: 0.05, bar: 0.3, lean: 0.2, grip: 0, rw: -0.3 }],
            [0.3, { board: 1 }, 'hold'],
            [0.3, { rh: [300, 272] }], [1.2, { rh: [306, 198], pitch: 0.45 }],
            [1.25, { grip: 1 }, 'hold'],
            [1.2, { lean: 0.2, bar: 0.3 }], [2.3, { lean: -0.5, bar: 1, pitch: 0.25 }],
            [2.3, { perfect: 1 }, 'hold'], [3.5, { perfect: 0 }, 'hold'],
            [2.7, { lean: -0.5, bar: 1, pitch: 0.25 }], [4.7, { lean: 0.95, bar: 0.08, pitch: 0.85 }, 'lin'],
            [4.75, { lean: 0.95 }], [5.05, { lean: -0.35, pitch: 0.2 }, 'out'],
            [5.05, { bar: 0.08 }], [5.7, { bar: 0.9 }],
            [5.5, { yaw: 0.05, pitch: 0.2 }], [5.6, { look: 0 }], [5.9, { yaw: 0, pitch: 0, look: 1 }], [6.4, { look: 1, yaw: 0, pitch: 0 }], [6.8, { look: 0, pitch: 0.55, yaw: 0.05 }],
            [6.5, { rh: [306, 198], lean: -0.35 }], [7.0, { rh: [300, 272], lean: 0.2 }],
            [6.55, { grip: 0 }, 'hold'],
            [6.95, { board: 0 }, 'hold'],
        ],
        events: [[4.72, 'buzz'], [4.96, 'buzz']],
    },
    throws: {
        keys: [
            ...freeThrow(0.0),
            [2.9, { rh: RELEASE.rh, fh: RELEASE.fh, bob: -4, turn: 0.5 }], [3.6, { rh: REST.rh, fh: REST.fh, rw: REST.rw, fw: REST.fw, bob: 0, pitch: 0.15, yaw: 0.9, turn: 0.2 }],
            [4.3, { pitch: 0.15, yaw: 0.9, turn: 0.2 }], [4.5, { look: 0 }], [4.8, { pitch: 0, yaw: 0, look: 1, turn: 0 }], [5.5, { look: 1, pitch: 0, yaw: 0 }], [5.9, { look: 0, pitch: 0.7, yaw: -0.25 }],
            [6.0, { rh: REST.rh, fh: REST.fh, rw: REST.rw, fw: REST.fw }], [6.9, { rh: PICK.rh, fh: PICK.fh, rw: 0, fw: 0 }],
        ],
        events: [[1.7, 'plot']],
    },
    award: {
        keys: [
            [0.0, { rh: [300, 206], fh: [344, 202], pitch: 0.35, yaw: -0.05, chq: 0, grip: 1, lean: 0, bob: 0, rw: 0, fw: 0 }],
            [0.6, { rh: [300, 206], fh: [344, 202] }], [1.6, { rh: [182, 136], fh: [230, 130], pitch: -0.2, yaw: -0.6 }],
            [0.65, { grip: 0 }, 'hold'],
            [1.6, { fh: [230, 130] }], [1.9, { fh: [212, 108] }, 'out'],
            [1.95, { chq: 1 }, 'hold'],
            [2.1, { fh: [212, 108], rh: [182, 136] }], [2.9, { rh: REST.rh, fh: REST.fh, rw: REST.rw, fw: REST.fw, lean: -0.3, bob: 2, pitch: -0.3, yaw: -0.6 }],
            [3.3, { nod: 0 }], [3.55, { nod: 1 }], [3.8, { nod: 0 }], [4.05, { nod: 1 }], [4.3, { nod: 0 }],
            [4.5, { yaw: -0.6, pitch: -0.3, lean: -0.3 }], [4.7, { look: 0 }], [5.0, { yaw: 0, pitch: 0, lean: 0, look: 1 }], [5.7, { look: 1, yaw: 0, pitch: 0 }], [6.1, { look: 0, yaw: 0.05, pitch: 0.65, bob: 0 }],
        ],
        events: [[1.9, 'pin']],
        /* from the second pass the cheque stays on the wall: he looks up at it, nods, looks at the camera */
        again: [
            [0.0, { pitch: 0.65, yaw: 0.05, lean: 0, bob: 0 }],
            [0.0, { chq: 1 }, 'hold'],
            [0.6, { pitch: 0.65, yaw: 0.05 }], [1.4, { pitch: -0.3, yaw: -0.6, lean: -0.3, bob: 2 }],
            [1.9, { nod: 0 }], [2.15, { nod: 1 }], [2.4, { nod: 0 }], [2.65, { nod: 1 }], [2.9, { nod: 0 }],
            [3.3, { yaw: -0.6, pitch: -0.3, lean: -0.3 }], [3.5, { look: 0 }], [3.8, { yaw: 0, pitch: 0, lean: 0, bob: 0, look: 1 }], [4.8, { look: 1, yaw: 0, pitch: 0 }], [5.3, { look: 0, yaw: 0.05, pitch: 0.65 }],
        ],
        eventsAgain: [],
    },
    rig: {
        keys: [
            [0.0, { rh: [334, 256], fh: REST.fh, fw: REST.fw, pitch: 0.8, yaw: 0.05, iron: 1, rw: 0, mouth: 0 }],
            [0.8, { rh: [321, 276] }, 'out'],
            [0.9, { smoke: 1 }, 'hold'], [2.2, { smoke: 0 }, 'hold'],
            [1.0, { rh: [321, 276] }], [1.3, { rh: [323, 275] }], [1.6, { rh: [321, 276] }],
            [1.7, { rh: [321, 276] }], [2.3, { rh: PARK }],
            [2.35, { iron: 0 }, 'hold'],
            [2.4, { rh: PARK, rw: 0 }], [2.9, { rh: REST.rh, rw: REST.rw }],
            [2.3, { fh: REST.fh, fw: REST.fw }], [3.1, { fh: [430, 146], fw: -0.6, yaw: 0.6, pitch: -0.15 }],
            [3.9, { fh: [430, 146] }], [4.5, { yaw: 0.9, pitch: 0.1, mouth: 1 }],
            [5.0, { yaw: 0.9, pitch: 0.1, mouth: 1 }], [5.2, { look: 0 }], [5.5, { yaw: 0, pitch: 0, look: 1, mouth: 0.6 }], [6.1, { look: 1, yaw: 0, pitch: 0, mouth: 0.6 }],
            [6.5, { look: 0, yaw: 0.05, pitch: 0.8, mouth: 0, fh: REST.fh, fw: REST.fw }],
            [6.3, { rh: REST.rh, rw: REST.rw }], [6.7, { rh: PARK, rw: 0 }],
            [6.75, { iron: 1 }, 'hold'],
            [7.0, { rh: [334, 256] }],
        ],
        events: [[0.95, 'sparks'], [1.35, 'sparks'], [3.15, 'tap'], [3.4, 'plot']],
    },
    sleeve: {
        keys: [
            [0.0, { rh: [364, 254], fh: REST.fh, fw: REST.fw, pitch: 0.8, yaw: 0.2, iron: 1, sleeve: 0, ball: 0, check: 0, coach: 0, fly: 0, rw: 0, bob: 0, turn: 0 }],
            [0.35, { rh: [379, 270] }, 'out'],                                         // the iron tip at the sensor board in the open pocket
            [0.4, { smoke: 1 }, 'hold'], [1.2, { smoke: 0 }, 'hold'],
            [0.5, { rh: [379, 270] }], [0.8, { rh: [381, 269] }],
            [0.9, { rh: [381, 269] }], [1.3, { rh: PARK, yaw: 0.1 }],
            [1.35, { iron: 0 }, 'hold'],
            [1.4, { rh: PARK }], [1.8, { rh: [296, 234], pitch: 0.6, yaw: -0.1 }],
            [1.4, { fh: REST.fh, fw: REST.fw }], [1.75, { fh: [338, 279], fw: 0 }],
            [1.78, { sleeve: 0.01 }, 'hold'],
            [1.8, { sleeve: 0.01 }], [2.6, { sleeve: 1 }],
            [1.8, { fh: [338, 279] }], [2.6, { fh: [292, 226] }],
            [2.7, { rh: [296, 234], fh: [292, 226] }],
            ...freeThrow(3.3, true),
            [5.4, { check: 1 }, 'hold'],                                           // the big check lands on the long buzz, after Good rep has lit
            [5.5, { rh: RELEASE.rh, fh: RELEASE.fh, bob: -4, turn: 0.5 }], [6.1, { rh: REST.rh, fh: REST.fh, rw: REST.rw, fw: REST.fw, bob: 0, turn: 0, pitch: 0, yaw: 0, look: 1 }],
            [5.8, { look: 0 }],
            [6.5, { look: 1, pitch: 0, yaw: 0 }], [7.0, { look: 0, pitch: 0.8, yaw: 0.1 }],
        ],
        events: [[0.42, 'sparks'], [0.78, 'sparks'], ...haptics(3.3)],
        /* from the second pass the sleeve stays on and the iron stays parked: the rep is the beat */
        again: [
            [0.0, { pitch: 0.8, yaw: 0.1, ball: 0, check: 0, coach: 0 }],
            [0.0, { sleeve: 1 }, 'hold'],
            [0.3, { rh: REST.rh, fh: REST.fh, rw: REST.rw, fw: REST.fw }],
            ...freeThrow(0.9, true),
            [3.0, { check: 1 }, 'hold'],
            [3.1, { rh: RELEASE.rh, fh: RELEASE.fh, bob: -4, turn: 0.5 }], [3.7, { rh: REST.rh, fh: REST.fh, rw: REST.rw, fw: REST.fw, bob: 0, turn: 0.2, pitch: 0.15, yaw: 0.9 }],
            [4.3, { pitch: 0.15, yaw: 0.9, turn: 0.2 }], [4.5, { look: 0 }], [4.8, { pitch: 0, yaw: 0, look: 1, turn: 0 }], [5.6, { look: 1, pitch: 0, yaw: 0 }], [6.0, { look: 0, pitch: 0.8, yaw: 0.1 }],
        ],
        eventsAgain: haptics(0.9),
    },
};

/* ------------------------------------------------------------------
   small helpers
   ------------------------------------------------------------------ */
const EASE = {
    io: x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
    out: x => 1 - Math.pow(1 - x, 3),
    in: x => x * x * x,
    lin: x => x,
    hold: x => (x < 1 ? 0 : 1),
};
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, u) => a + (b - a) * u;
const lerpV = (a, b, u) => (Array.isArray(a) ? [lerp(a[0], b[0], u), lerp(a[1], b[1], u)] : lerp(a, b, u));
const TAU = Math.PI * 2;

function rng(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function compile(keys) {
    const tracks = {};
    for (const [t, vals, ease] of keys) {
        for (const k in vals) (tracks[k] || (tracks[k] = [])).push({ t, v: vals[k], e: EASE[ease || 'io'] });
    }
    for (const k in tracks) tracks[k].sort((a, b) => a.t - b.t);
    return tracks;
}
const COMPILED = {};
for (const k in ACTIONS) COMPILED[k] = { main: compile(ACTIONS[k].keys), again: ACTIONS[k].again ? compile(ACTIONS[k].again) : null };

function sample(tracks, t, out) {
    for (const k in DEFAULTS) out[k] = DEFAULTS[k];
    for (const k in tracks) {
        const tr = tracks[k];
        if (t < tr[0].t) continue;                       // before the first key: the default, a snap at the key
        let i = tr.length - 1;
        while (i > 0 && tr[i].t > t) i--;
        if (i === tr.length - 1) { out[k] = tr[i].v; continue; }
        const a = tr[i], b = tr[i + 1];
        const u = b.e(clamp((t - a.t) / (b.t - a.t), 0, 1));
        out[k] = lerpV(a.v, b.v, u);
    }
    return out;
}

/* two-bone IK: the elbow goes to the lower of the two solutions, nudged
   outward (side: -1 near arm, +1 far arm) */
function ik(S, T, a, b, side) {
    let dx = T[0] - S[0], dy = T[1] - S[1];
    let d = Math.hypot(dx, dy) || 0.001;
    const maxd = a + b - 0.6, mind = Math.abs(a - b) + 0.6;
    if (d > maxd) { dx *= maxd / d; dy *= maxd / d; d = maxd; }
    else if (d < mind) { dx *= mind / d; dy *= mind / d; d = mind; }
    const A = Math.acos(clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1));
    const base = Math.atan2(dy, dx);
    const e1 = [S[0] + a * Math.cos(base + A), S[1] + a * Math.sin(base + A)];
    const e2 = [S[0] + a * Math.cos(base - A), S[1] + a * Math.sin(base - A)];
    const s1 = e1[1] + side * e1[0] * 0.35, s2 = e2[1] + side * e2[0] * 0.35;
    return [s1 >= s2 ? e1 : e2, [S[0] + dx, S[1] + dy]];
}

function rr(ctx, x, y, w, h, r) {
    const q = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + q, y);
    ctx.arcTo(x + w, y, x + w, y + h, q);
    ctx.arcTo(x + w, y + h, x, y + h, q);
    ctx.arcTo(x, y + h, x, y, q);
    ctx.arcTo(x, y, x + w, y, q);
    ctx.closePath();
}
function poly(ctx, pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
}
function seg(ctx, A, B) { ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke(); }
function dot(ctx, x, y, r, fill) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = fill; ctx.fill(); }
function glow(ctx, x, y, r, rgb, a) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(' + rgb + ',' + a + ')');
    g.addColorStop(1, 'rgba(' + rgb + ',0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
}
/* the lamp cone's strength at a point, 0..1 */
function cone(x, y) {
    const dy = y - LAMP[1];
    if (dy < 0) return 0;
    const half = 0.9 * dy + 16;
    const across = 1 - Math.abs(x - LAMP[0]) / half;
    if (across <= 0) return 0;
    return Math.pow(across, 0.8) * clamp(1 - dy / 440, 0, 1);
}

/* a limb as one round-joined polyline in three tones, the lit edge toward
   the lamp; joins instead of caps, so no cylinder shows at an elbow */
function armStroke(ctx, pts, w, tones, litScale) {
    const norms = [];
    for (let i = 0; i < pts.length; i++) {
        const A = pts[Math.max(0, i - 1)], B = pts[Math.min(pts.length - 1, i + 1)];
        let nx = -(B[1] - A[1]), ny = B[0] - A[0];
        const n = Math.hypot(nx, ny) || 1; nx /= n; ny /= n;
        if (nx * -0.35 + ny * -1 < 0) { nx = -nx; ny = -ny; }
        norms.push([nx, ny]);
    }
    const path = k => {
        ctx.beginPath();
        for (let i = 0; i < pts.length; i++) {
            const x = pts[i][0] + norms[i][0] * k, y = pts[i][1] + norms[i][1] * k;
            if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        }
        ctx.stroke();
    };
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.lineWidth = w; ctx.strokeStyle = tones.shade; path(0);
    ctx.lineWidth = w - 3; ctx.strokeStyle = tones.mid; path(w * 0.16);
    ctx.lineWidth = Math.max(1.2, (w - 3) * (litScale || 0.42)); ctx.strokeStyle = tones.lit; path(w * 0.3);
}
/* one straight limb (the hand, a short cuff), same tones */
function limb(ctx, A, B, w, tones, litScale) { armStroke(ctx, [A, B], w, tones, litScale); }

/* ------------------------------------------------------------------
   the figure
   ------------------------------------------------------------------ */
const ARM = { upper: 76, fore: 70, w: 18 };

function geom(p, time) {
    const breath = Math.sin(time * TAU / 3.8) * 1.1;
    const bob = p.bob, lean = p.lean, t = p.turn;
    const sx = lean * 20, sy = lean * 13 - breath;
    const hip = [330, 300 + bob];
    const slump = Math.max(lean, 0);     // a slouch drops both shoulders, rounds the back and drops the head further
    return {
        hip, sx, sy, bob, turn: t,
        shN: [286 + sx * 0.9 + t * 22, 157 + sy + bob + slump * 7],
        shF: [368 + sx * 0.9 - t * 10, 150 + sy + bob + slump * 9],
        neck: [324 + sx * 1.3 + t * 4, 142 + sy + bob + slump * 6],
        head: [322 + sx * 1.5 + slump * 10 + t * 6, 99 + sy * 1.25 + bob + p.nod * 4 + slump * 16],
        waistN: [299 + sx * 0.4 + t * 12, 262 + bob + sy * 0.4],
        waistF: [363 + sx * 0.4 - t * 4, 262 + bob + sy * 0.4],
        hemY: 273 + bob,
    };
}

/* a soft crease on the inside of a bent elbow */
function elbowCrease(ctx, S, E, Hn, color) {
    const ax = S[0] - E[0], ay = S[1] - E[1], bx = Hn[0] - E[0], by = Hn[1] - E[1];
    const la = Math.hypot(ax, ay) || 1, lb = Math.hypot(bx, by) || 1;
    const cosA = (ax * bx + ay * by) / (la * lb);
    if (cosA < -0.87) return;                           // nearly straight: no crease
    let ix = ax / la + bx / lb, iy = ay / la + by / lb;
    const n = Math.hypot(ix, iy) || 1; ix /= n; iy /= n;
    const cx = E[0] + ix * 5.5, cy = E[1] + iy * 5.5;
    ctx.save(); ctx.globalAlpha = 0.45;
    ctx.lineCap = 'round'; ctx.lineWidth = 1.6; ctx.strokeStyle = color;
    seg(ctx, [cx - iy * 4, cy + ix * 4], [cx + iy * 4, cy - ix * 4]);
    ctx.restore();
}

/* a short garment sleeve: round over the shoulder, a flat hem across the arm (no cap at the hem,
   so it reads as cloth, not a joint), lit on the side that faces the lamp */
function shortSleeve(ctx, S, E, u, w, o) {
    const hx = lerp(S[0], E[0], u), hy = lerp(S[1], E[1], u);
    const dx = hx - S[0], dy = hy - S[1], L = Math.hypot(dx, dy) || 1;
    const ux = dx / L, uy = dy / L, ang = Math.atan2(uy, ux), r = w / 2;
    let nx = -uy, ny = ux;
    if (nx * -0.35 + ny * -1 < 0) { nx = -nx; ny = -ny; }     // n points toward the lamp
    const shape = () => {
        ctx.beginPath();
        ctx.arc(S[0], S[1], r, ang + Math.PI / 2, ang + Math.PI * 1.5);
        ctx.lineTo(hx + uy * r, hy - ux * r);
        ctx.lineTo(hx - uy * r, hy + ux * r);
        ctx.closePath();
    };
    shape(); ctx.fillStyle = o.mid; ctx.fill();
    ctx.save(); shape(); ctx.clip();
    ctx.fillStyle = o.lit;
    poly(ctx, [[S[0] + nx * r, S[1] + ny * r], [hx + nx * r, hy + ny * r], [hx + nx * r * 0.3, hy + ny * r * 0.3], [S[0] + nx * r * 0.3, S[1] + ny * r * 0.3]]); ctx.fill();
    ctx.fillStyle = o.shade;
    poly(ctx, [[S[0] - nx * r, S[1] - ny * r], [hx - nx * r, hy - ny * r], [hx - nx * r * 0.45, hy - ny * r * 0.45], [S[0] - nx * r * 0.45, S[1] - ny * r * 0.45]]); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = o.shade; ctx.lineWidth = 1.4; ctx.lineCap = 'butt';
    seg(ctx, [hx + uy * r, hy - ux * r], [hx - uy * r, hy + ux * r]);   // the hem
}

function drawArm(ctx, S, T, side, wrist, outfit, extra) {
    const [E, Hn] = ik(S, T, ARM.upper, ARM.fore, side);
    const o = OUTFITS[outfit];
    armStroke(ctx, [S, E, Hn], ARM.w, SKIN);
    if (o.sleeve < 1) elbowCrease(ctx, S, E, Hn, SKIN.shade);
    if (extra && extra.beforeSleeve) extra.beforeSleeve(E, Hn);
    // the garment sleeve over the arm; its hem or cuff is the only break
    if (o.sleeve > 0) {
        const tones = { lit: o.lit, mid: o.mid, shade: o.shade };
        if (o.sleeve >= 1) {
            const s0 = [lerp(S[0], E[0], 0.08), lerp(S[1], E[1], 0.08)];   // starts inside the shoulder, so no cap sticks out
            armStroke(ctx, [s0, E, [lerp(E[0], Hn[0], 0.86), lerp(E[1], Hn[1], 0.86)]], ARM.w + 2.5, tones, 0.36);
            elbowCrease(ctx, S, E, Hn, o.shade);
        } else {
            shortSleeve(ctx, S, E, Math.min(o.sleeve, 0.98), ARM.w + 2.5, o);
        }
        if (o.hood) {   // pushed-up sleeve: a bunched cuff where it stops
            const c0 = o.sleeve - 0.07, c1 = o.sleeve + 0.05;
            ctx.lineCap = 'round'; ctx.lineWidth = ARM.w + 6; ctx.strokeStyle = o.mid;
            seg(ctx, [lerp(S[0], E[0], c0), lerp(S[1], E[1], c0)], [lerp(S[0], E[0], c1), lerp(S[1], E[1], c1)]);
            ctx.lineWidth = 2.2; ctx.strokeStyle = o.lit;
            seg(ctx, [lerp(S[0], E[0], c0) - 6, lerp(S[1], E[1], c0) - 4], [lerp(S[0], E[0], c1) - 6, lerp(S[1], E[1], c1) - 4]);
        }
    }
    if (extra && extra.onForearm) extra.onForearm(E, Hn);
    // the hand: a short capsule from the wrist, turned by the wrist angle
    const fx = Hn[0] - E[0], fy = Hn[1] - E[1];
    const ang = Math.atan2(fy, fx) + wrist;
    const tip = [Hn[0] + Math.cos(ang) * 17, Hn[1] + Math.sin(ang) * 17];
    limb(ctx, Hn, tip, 12, SKIN, 0.4);
    drawThumb(ctx, Hn, ang, side);
    if (extra && extra.afterHand) extra.afterHand(S, E, Hn, tip, ang, side);
    return { E, H: Hn, tip, ang };
}
/* the thumb, a short stub to the lit side */
function drawThumb(ctx, Hn, ang, side) {
    const tx = Hn[0] + Math.cos(ang - 0.9 * (side < 0 ? 1 : -1)) * 8, ty = Hn[1] + Math.sin(ang - 0.9 * (side < 0 ? 1 : -1)) * 8;
    ctx.lineWidth = 5; ctx.strokeStyle = SKIN.mid; ctx.lineCap = 'round'; seg(ctx, [Hn[0] + Math.cos(ang) * 4, Hn[1] + Math.sin(ang) * 4], [tx, ty]);
}

function drawTorso(ctx, g, outfit) {
    const o = OUTFITS[outfit];
    const { shN, shF, waistN, waistF, hip, hemY, neck } = g;
    // what is below the hem, pants or dark trousers, drawn first
    if (o.pants) {
        poly(ctx, [[waistN[0] - 4, hemY - 6], [waistF[0] + 4, hemY - 6], [hip[0] + 46, hip[1] + 24], [hip[0] - 46, hip[1] + 24]]);
        ctx.fillStyle = o.pants.mid; ctx.fill();
        ctx.save(); ctx.clip();
        ctx.fillStyle = o.pants.lit; ctx.fillRect(waistN[0] - 8, hemY - 6, 34, 60);
        ctx.strokeStyle = o.pants.stripe; ctx.lineWidth = 2.2; ctx.lineCap = 'butt';
        seg(ctx, [waistN[0] - 1, hemY - 4], [waistN[0] - 5, hip[1] + 24]);
        ctx.restore();
    } else {
        poly(ctx, [[waistN[0] - 4, hemY - 6], [waistF[0] + 4, hemY - 6], [hip[0] + 46, hip[1] + 24], [hip[0] - 46, hip[1] + 24]]);
        ctx.fillStyle = o.below; ctx.fill();
    }
    // the body, with round shoulders and the trapezius rising to the neck
    const body = () => {
        ctx.beginPath();
        ctx.moveTo(shN[0] - 12, shN[1] + 14);
        ctx.quadraticCurveTo(shN[0] - 14, shN[1] - 11, shN[0] + 12, shN[1] - 11);
        ctx.quadraticCurveTo(neck[0], neck[1] - 9, shF[0] - 12, shF[1] - 11);
        ctx.quadraticCurveTo(shF[0] + 14, shF[1] - 11, shF[0] + 11, shF[1] + 14);
        ctx.lineTo(waistF[0] + 3, waistF[1]);
        ctx.lineTo(waistF[0] + 5, hemY);
        ctx.lineTo(waistN[0] - 5, hemY);
        ctx.lineTo(waistN[0] - 3, waistN[1]);
        ctx.closePath();
    };
    const drawBody = (lit, mid, shade) => {
        body(); ctx.fillStyle = mid; ctx.fill();
        ctx.save(); body(); ctx.clip();
        // lit: the near chest and the shoulder tops, where the lamp falls
        ctx.fillStyle = lit;
        poly(ctx, [[shN[0] - 16, shN[1] - 8], [shF[0] + 14, shF[1] - 12], [shF[0] + 2, shF[1] + 34], [shN[0] + 22, shN[1] + 74], [shN[0] - 16, shN[1] + 50]]);
        ctx.fill();
        // shade: the far flank, turned from the lamp, and under the chest
        ctx.fillStyle = shade;
        poly(ctx, [[shF[0] - 6, shF[1] + 40], [shF[0] + 16, shF[1] + 6], [waistF[0] + 8, hemY + 2], [waistF[0] - 22, hemY + 2]]);
        ctx.fill();
        ctx.restore();
    };
    if (outfit === 'tank') {
        // the tank: skin on the shoulders, straps sitting on them, the top of the chest open
        body(); ctx.fillStyle = SKIN.mid; ctx.fill();
        ctx.save(); body(); ctx.clip();
        ctx.fillStyle = SKIN.lit; poly(ctx, [[shN[0] - 16, shN[1] - 8], [shF[0] + 14, shF[1] - 12], [shF[0] - 4, shF[1] + 20], [shN[0] + 8, shN[1] + 26]]); ctx.fill();
        ctx.fillStyle = SKIN.shade; poly(ctx, [[shF[0] - 10, shF[1] + 2], [shF[0] + 16, shF[1] + 4], [shF[0] + 10, shF[1] + 40], [shF[0] - 6, shF[1] + 36]]); ctx.fill();
        ctx.restore();
        const tank = [
            [shN[0] - 8, shN[1] - 10], [shN[0] + 4, shN[1] - 11], [shN[0] + 15, shN[1] + 22], [shF[0] - 12, shF[1] + 20], [shF[0] - 6, shF[1] - 11], [shF[0] + 6, shF[1] - 9],
            [shF[0] + 2, shF[1] + 34], [waistF[0] + 3, waistF[1]], [waistF[0] + 5, hemY], [waistN[0] - 5, hemY], [waistN[0] - 3, waistN[1]], [shN[0] - 8, shN[1] + 36],
        ];
        poly(ctx, tank); ctx.fillStyle = o.mid; ctx.fill();
        ctx.save(); poly(ctx, tank); ctx.clip();
        ctx.fillStyle = o.lit; poly(ctx, [[shN[0] - 10, shN[1] + 20], [shF[0] - 20, shF[1] + 18], [shF[0] - 24, shF[1] + 60], [shN[0] - 2, shN[1] + 70]]); ctx.fill();
        ctx.fillStyle = o.shade; poly(ctx, [[shF[0] - 14, shF[1] + 30], [shF[0] + 6, shF[1] + 30], [waistF[0] + 8, hemY + 2], [waistF[0] - 20, hemY + 2]]); ctx.fill();
        ctx.restore();
        return;
    }
    if (outfit === 'blazer') {
        drawBody(o.lit, o.mid, o.shade);
        // the tee under it, a dark V, and the lapels
        poly(ctx, [[shN[0] + 18, shN[1] - 10], [shF[0] - 18, shF[1] - 10], [shF[0] - 36, shF[1] + 66], [shN[0] + 30, shN[1] + 72]]);
        ctx.fillStyle = o.tee; ctx.fill();
        ctx.fillStyle = o.lapel;
        poly(ctx, [[shN[0] + 12, shN[1] - 10], [shN[0] + 26, shN[1] - 10], [shN[0] + 28, shN[1] + 70], [shN[0] + 10, shN[1] + 40]]); ctx.fill();
        ctx.fillStyle = o.shade;
        poly(ctx, [[shF[0] - 24, shF[1] - 10], [shF[0] - 10, shF[1] - 10], [shF[0] - 12, shF[1] + 40], [shF[0] - 34, shF[1] + 68]]); ctx.fill();
        return;
    }
    drawBody(o.lit, o.mid, o.shade);
    const n = g.neck;
    if (o.hood) {
        // the hood, bunched behind the neck
        ctx.beginPath(); ctx.moveTo(n[0] - 30, n[1] + 2); ctx.quadraticCurveTo(n[0] - 24, n[1] - 26, n[0] + 2, n[1] - 24);
        ctx.quadraticCurveTo(n[0] + 30, n[1] - 24, n[0] + 36, n[1] + 4); ctx.closePath();
        ctx.fillStyle = o.shade; ctx.fill();
        ctx.beginPath(); ctx.moveTo(n[0] - 26, n[1] + 4); ctx.quadraticCurveTo(n[0] - 18, n[1] - 14, n[0] + 4, n[1] - 13);
        ctx.quadraticCurveTo(n[0] + 24, n[1] - 13, n[0] + 32, n[1] + 6); ctx.closePath();
        ctx.fillStyle = o.mid; ctx.fill();
        ctx.strokeStyle = o.lit; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(n[0] - 22, n[1] - 2); ctx.quadraticCurveTo(n[0] - 14, n[1] - 15, n[0] + 4, n[1] - 14); ctx.stroke();
    }
    // the collar
    ctx.beginPath(); ctx.moveTo(n[0] - 15, n[1] + 2); ctx.quadraticCurveTo(n[0], n[1] + 12, n[0] + 16, n[1] + 1);
    ctx.lineWidth = 3; ctx.strokeStyle = o.shade; ctx.lineCap = 'round'; ctx.stroke();
    if (o.hood) {
        // two drawstrings from the hood down the chest, a small human detail that also says hoodie
        ctx.strokeStyle = 'rgba(247,245,240,0.6)'; ctx.lineWidth = 1.3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(n[0] - 7, n[1] + 9); ctx.quadraticCurveTo(n[0] - 10, n[1] + 22, n[0] - 9, n[1] + 36); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(n[0] + 6, n[1] + 9); ctx.quadraticCurveTo(n[0] + 9, n[1] + 22, n[0] + 10, n[1] + 34); ctx.stroke();
        dot(ctx, n[0] - 9, n[1] + 37, 1.4, 'rgba(247,245,240,0.75)'); dot(ctx, n[0] + 10, n[1] + 35, 1.4, 'rgba(247,245,240,0.75)');
    }
}

function drawNeck(ctx, g) {
    const n = g.neck, h = g.head;
    // short and wide: from under the jaw to the trapezius
    poly(ctx, [[h[0] - 12, h[1] + 16], [h[0] + 14, h[1] + 15], [n[0] + 13, n[1] + 2], [n[0] - 12, n[1] + 2]]);
    ctx.fillStyle = SKIN.mid; ctx.fill();
    poly(ctx, [[h[0] - 12, h[1] + 16], [h[0] + 14, h[1] + 15], [h[0] + 15, h[1] + 26], [h[0] - 11, h[1] + 28]]);
    ctx.fillStyle = SKIN.shade; ctx.fill();
}

function headPath(ctx, c) {
    const x = c[0], y = c[1];
    ctx.beginPath();
    ctx.moveTo(x - 2, y - 30);
    ctx.bezierCurveTo(x + 14, y - 31, x + 24, y - 18, x + 23, y - 2);
    ctx.bezierCurveTo(x + 22, y + 12, x + 16, y + 24, x + 4, y + 30);
    ctx.bezierCurveTo(x - 10, y + 30, x - 20, y + 20, x - 23, y + 6);
    ctx.bezierCurveTo(x - 25, y - 10, x - 18, y - 30, x - 2, y - 30);
    ctx.closePath();
}

function drawHead(ctx, g, p, hair, blink, time, stageIndex) {
    const c = g.head;
    const yaw = p.yaw, pitch = p.pitch, look = p.look;
    const fx = c[0] + yaw * 7, fy = c[1] + pitch * 6.5;
    // the skull in mid, the lamp on the forehead and near cheek, shade on the far side and under the jaw
    headPath(ctx, c); ctx.fillStyle = SKIN.mid; ctx.fill();
    ctx.save(); headPath(ctx, c); ctx.clip();
    ctx.fillStyle = SKIN.lit;
    poly(ctx, [[c[0] - 24, c[1] - 32], [c[0] + 26, c[1] - 32], [c[0] + 12, c[1] - 2], [c[0] + 2, c[1] + 18], [c[0] - 12, c[1] + 10], [c[0] - 26, c[1] - 4]]);
    ctx.fill();
    ctx.fillStyle = SKIN.hot;
    ctx.beginPath(); ctx.ellipse(fx - 4, c[1] - 16, 11, 5, -0.2, 0, TAU); ctx.fill();    // the forehead catch
    ctx.fillStyle = SKIN.shade;
    poly(ctx, [[c[0] + 12, c[1] - 6], [c[0] + 26, c[1] - 10], [c[0] + 26, c[1] + 34], [c[0] - 2, c[1] + 34], [c[0] + 10, c[1] + 16]]);
    ctx.fill();
    ctx.beginPath(); ctx.ellipse(c[0] - 2, c[1] + 30, 20, 7, 0, 0, TAU); ctx.fill();       // under the jaw
    ctx.restore();
    // the near ear
    ctx.beginPath(); ctx.ellipse(c[0] - 23, c[1] + 4 + pitch * 2, 4, 6.5, -0.1, 0, TAU); ctx.fillStyle = SKIN.mid; ctx.fill();
    ctx.beginPath(); ctx.ellipse(c[0] - 23, c[1] + 5 + pitch * 2, 2, 3.5, -0.1, 0, TAU); ctx.fillStyle = SKIN.shade; ctx.fill();
    // hair
    if (hair === 'curls') drawCurls(ctx, c, yaw, pitch); else drawTwists(ctx, c, yaw, pitch, stageIndex);
    // the brow: two deliberate strokes, strong
    ctx.lineCap = 'round'; ctx.strokeStyle = HAIR.base;
    ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(fx - 15, fy - 7); ctx.quadraticCurveTo(fx - 9, fy - 10.5, fx - 3, fy - 8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(fx + 3, fy - 8); ctx.quadraticCurveTo(fx + 9, fy - 10.5, fx + 13, fy - 7.5); ctx.stroke();
    // the eyes
    const open = look * (blink ? 0 : 1);
    if (open > 0.5) {
        // to the camera: almonds, a glint
        for (const s of [-1, 1]) {
            const ex = fx + s * 8 - 1, ey = fy - 1;
            ctx.beginPath(); ctx.moveTo(ex - 5, ey); ctx.quadraticCurveTo(ex, ey - 4.2, ex + 5, ey); ctx.quadraticCurveTo(ex, ey + 3.2, ex - 5, ey); ctx.closePath();
            ctx.fillStyle = 'rgba(247,245,240,0.86)'; ctx.fill();
            dot(ctx, ex + 0.5, ey, 2.2, '#1a110c');
            dot(ctx, ex + 1.3, ey - 0.8, 0.7, PAPER);
            ctx.lineWidth = 1.4; ctx.strokeStyle = HAIR.base;
            ctx.beginPath(); ctx.moveTo(ex - 5, ey); ctx.quadraticCurveTo(ex, ey - 4.4, ex + 5, ey); ctx.stroke();
        }
    } else {
        // calm, down at the work: two short lids that lower as he looks down, a lit edge under each
        ctx.lineWidth = blink ? 1.2 : 1.9; ctx.strokeStyle = '#1a110c';
        const bow = blink ? 1.6 : -1.8 + clamp(pitch, -0.6, 1) * 3.4;
        ctx.beginPath(); ctx.moveTo(fx - 13, fy); ctx.quadraticCurveTo(fx - 9, fy + bow, fx - 4, fy + 0.4); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(fx + 3, fy + 0.4); ctx.quadraticCurveTo(fx + 8, fy + bow, fx + 12, fy); ctx.stroke();
        ctx.lineWidth = 1; ctx.strokeStyle = SKIN.lit;
        ctx.beginPath(); ctx.moveTo(fx - 12, fy + 2.2); ctx.lineTo(fx - 5, fy + 2.4); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(fx + 4, fy + 2.4); ctx.lineTo(fx + 11, fy + 2.2); ctx.stroke();
    }
    // the nose, three-quarter: a bridge line and the base
    ctx.lineWidth = 1.6; ctx.strokeStyle = SKIN.shade;
    ctx.beginPath(); ctx.moveTo(fx - 1, fy - 3); ctx.lineTo(fx - 4, fy + 9); ctx.quadraticCurveTo(fx - 2, fy + 12, fx + 3, fy + 10.5); ctx.stroke();
    ctx.lineWidth = 1; ctx.strokeStyle = SKIN.hot;
    ctx.beginPath(); ctx.moveTo(fx + 1, fy - 2); ctx.lineTo(fx - 1, fy + 6); ctx.stroke();
    // the mouth: calm, or the grin
    const m = p.mouth;
    ctx.lineWidth = 1.8; ctx.strokeStyle = SKIN.shade; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(fx - 7, fy + 19 - m * 1.5); ctx.quadraticCurveTo(fx - 1, fy + 20.5 + m * 3.5, fx + 6, fy + 19 - m * 1.5); ctx.stroke();
    if (m > 0.3) {
        ctx.beginPath(); ctx.moveTo(fx - 5, fy + 19.5); ctx.quadraticCurveTo(fx - 1, fy + 21 + m * 2, fx + 4, fy + 19.5); ctx.closePath();
        ctx.fillStyle = 'rgba(247,245,240,' + (0.75 * m) + ')'; ctx.fill();
    }
    ctx.lineWidth = 1; ctx.strokeStyle = SKIN.lit;
    ctx.beginPath(); ctx.moveTo(fx - 5, fy + 23 + m); ctx.quadraticCurveTo(fx - 1, fy + 24 + m, fx + 4, fy + 23 + m); ctx.stroke();
}

/* nine thick twists with gaps between them: five fall onto the brow,
   two at each temple fall over the ears */
const TWISTS = (() => {
    const r = rng(11), out = [];
    for (let i = 0; i < 9; i++) {
        const a = -2.95 + i * (2.7 / 8);               // around the cap from the left temple to the right
        const temple = i < 2 || i > 6;
        out.push({ a, temple, drop: temple ? 12 + r() * 6 : 7 + r() * 7, bend: (r() - 0.5) * 6, w: 3.1 + r() * 0.7, tone: r() });
    }
    return out;
})();
function drawTwists(ctx, c, yaw, pitch) {
    const hx = c[0] - yaw * 3, hy = c[1] + pitch * 2;
    // the cap, high, with a straight hairline in to sharp temples
    ctx.beginPath();
    ctx.moveTo(hx - 26, hy + 2);
    ctx.bezierCurveTo(hx - 28, hy - 20, hx - 16, hy - 35, hx, hy - 35);
    ctx.bezierCurveTo(hx + 16, hy - 35, hx + 28, hy - 20, hx + 26, hy + 2);
    ctx.lineTo(hx + 21, hy - 11);
    ctx.quadraticCurveTo(hx + 10, hy - 17, hx, hy - 17);
    ctx.quadraticCurveTo(hx - 10, hy - 17, hx - 21, hy - 11);
    ctx.closePath();
    ctx.fillStyle = HAIR.base; ctx.fill();
    // the twists
    ctx.lineCap = 'round';
    for (const s of TWISTS) {
        const sx = hx + Math.cos(s.a) * 22, sy = hy - 13 + Math.sin(s.a) * 21;
        const ex = s.temple ? sx + Math.cos(s.a) * 3 : sx + s.bend * 0.5;
        const ey = s.temple ? sy + s.drop : hy - 16 + s.drop;
        ctx.lineWidth = s.w;
        ctx.strokeStyle = s.tone > 0.72 ? HAIR.catch : s.tone > 0.4 ? HAIR.lit : HAIR.base;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx + s.bend * 0.6, (sy + ey) / 2, ex, ey); ctx.stroke();
    }
    // the part, a thin lit line off centre, and a lamp catch on the crown
    ctx.strokeStyle = HAIR.catch; ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.moveTo(hx - 9, hy - 17); ctx.quadraticCurveTo(hx - 11, hy - 27, hx - 4, hy - 34); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(hx - 2, hy - 29, 9, 2.6, -0.15, 0, TAU); ctx.fillStyle = HAIR.catch; ctx.fill();
}
function drawCurls(ctx, c, yaw, pitch) {
    const hx = c[0] - yaw * 3, hy = c[1] + pitch * 2;
    ctx.save();
    headPath(ctx, c);
    ctx.clip();
    // the fade: the sides go from hair to skin under the cap line
    const gr = ctx.createLinearGradient(0, hy - 16, 0, hy + 6);
    gr.addColorStop(0, HAIR.base); gr.addColorStop(1, 'rgba(18,13,10,0)');
    ctx.fillStyle = gr; ctx.fillRect(hx - 30, hy - 20, 60, 28);
    ctx.restore();
    // the cap, bumpy on top: tight curls
    ctx.beginPath();
    ctx.moveTo(hx - 26, hy - 10);
    ctx.bezierCurveTo(hx - 26, hy - 26, hx - 14, hy - 35, hx + 1, hy - 35);
    ctx.bezierCurveTo(hx + 16, hy - 35, hx + 27, hy - 26, hx + 26, hy - 10);
    ctx.bezierCurveTo(hx + 16, hy - 16, hx + 6, hy - 18, hx - 2, hy - 18);
    ctx.bezierCurveTo(hx - 12, hy - 18, hx - 20, hy - 16, hx - 26, hy - 10);
    ctx.closePath();
    ctx.fillStyle = HAIR.base; ctx.fill();
    for (let i = 0; i < 11; i++) {
        const a = -2.9 + i * 0.26;
        const bx = hx + 1 + Math.cos(a) * 25, by = hy - 12 + Math.sin(a) * 23;
        dot(ctx, bx, by, 3.4, i % 3 === 1 ? HAIR.lit : HAIR.base);
    }
    for (let i = 0; i < 5; i++) {
        const a = -2.3 + i * 0.3;
        dot(ctx, hx + 1 + Math.cos(a) * 22, hy - 12 + Math.sin(a) * 20, 2.6, HAIR.catch);
    }
}

/* ------------------------------------------------------------------
   props
   ------------------------------------------------------------------ */
function drawCar(ctx, cx, cy, spin, led, time) {
    // tyres, fat and knobby
    const tyre = (x, y, r) => {
        dot(ctx, x, y, r, '#0c0c0e');
        ctx.strokeStyle = '#2a2b2f'; ctx.lineWidth = 2;
        for (let i = 0; i < 7; i++) {
            const a = spin * time * 14 + i * TAU / 7;
            ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * (r - 1), y + Math.sin(a) * (r - 1)); ctx.lineTo(x + Math.cos(a) * (r - 4), y + Math.sin(a) * (r - 4)); ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(' + GOLD + ',0.35)'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(x, y, r - 0.6, -2.6, -0.8); ctx.stroke();
        dot(ctx, x, y, 2.4, '#3a3b40');
    };
    tyre(cx - 34, cy + 2, 9); tyre(cx + 30, cy + 2, 9);
    // chassis: a black octagon with one lit edge
    const o = [[cx - 44, cy - 6], [cx - 36, cy - 14], [cx + 36, cy - 14], [cx + 44, cy - 6], [cx + 44, cy + 2], [cx + 36, cy + 9], [cx - 36, cy + 9], [cx - 44, cy + 2]];
    poly(ctx, o); ctx.fillStyle = '#101013'; ctx.fill();
    ctx.strokeStyle = '#3c3d44'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(o[0][0], o[0][1]); ctx.lineTo(o[1][0], o[1][1]); ctx.lineTo(o[2][0], o[2][1]); ctx.lineTo(o[3][0], o[3][1]); ctx.stroke();
    tyre(cx - 26, cy + 10, 9); tyre(cx + 24, cy + 10, 9);
    // the breadboard on top, white with its rows of holes
    rr(ctx, cx - 30, cy - 30, 62, 18, 2); ctx.fillStyle = '#e9e6df'; ctx.fill();
    ctx.fillStyle = '#b9b5ac';
    for (let i = 0; i < 12; i++) for (let j = 0; j < 3; j++) ctx.fillRect(cx - 26 + i * 5, cy - 26 + j * 5, 1.3, 1.3);
    // the red motor driver, the tiny dev board with its blue LED, the pouch LiPo
    rr(ctx, cx - 26, cy - 44, 16, 11, 1.5); ctx.fillStyle = '#b0322a'; ctx.fill();
    ctx.fillStyle = '#d9574e'; ctx.fillRect(cx - 26, cy - 44, 16, 1.5);
    rr(ctx, cx + 2, cy - 42, 20, 9, 1.5); ctx.fillStyle = '#1e4d3a'; ctx.fill();
    ctx.fillStyle = '#2f6e55'; ctx.fillRect(cx + 2, cy - 42, 20, 1.2);
    if (led > 0.5) { dot(ctx, cx + 17, cy - 37.5, 3, '#9fd4ff'); ctx.globalCompositeOperation = 'lighter'; glow(ctx, cx + 17, cy - 37.5, 16, '80,160,255', 0.8); ctx.globalCompositeOperation = 'source-over'; }
    else dot(ctx, cx + 17, cy - 37.5, 1.6, '#2a4a6a');
    rr(ctx, cx - 44, cy - 38, 14, 20, 2); ctx.fillStyle = '#8f9199'; ctx.fill();
    ctx.fillStyle = '#c4c6cc'; ctx.fillRect(cx - 44, cy - 38, 14, 1.5);
    // the jumper tangle: yellow, red, black
    ctx.lineWidth = 1.5; ctx.lineCap = 'round';
    const wires = [['#e8c547', -18, -30, -8, -46, 6, -36], ['#d84a3a', 4, -30, 14, -48, 24, -38], ['#1a1a1e', -8, -30, 2, -50, 20, -42], ['#e8c547', 20, -30, 30, -44, 36, -34], ['#d84a3a', -30, -30, -34, -44, -40, -36]];
    for (const w of wires) { ctx.strokeStyle = w[0]; ctx.beginPath(); ctx.moveTo(cx + w[1], cy + w[2]); ctx.quadraticCurveTo(cx + w[3], cy + w[4], cx + w[5], cy + w[6]); ctx.stroke(); }
}
function drawJar(ctx, x, y, s) {
    // a jar, glass: a lit rim and a faint body
    ctx.save(); ctx.translate(x, y); ctx.scale(s || 1, s || 1);
    rr(ctx, -12, -34, 24, 36, 4); ctx.fillStyle = 'rgba(247,245,240,0.06)'; ctx.fill();
    ctx.strokeStyle = 'rgba(247,245,240,0.28)'; ctx.lineWidth = 1 / (s || 1); ctx.stroke();
    ctx.fillStyle = 'rgba(' + GOLD + ',0.45)'; ctx.fillRect(-12, -36, 24, 2);
    ctx.fillStyle = 'rgba(247,245,240,0.12)'; ctx.fillRect(-8, -28, 2, 22);
    ctx.restore();
}
function drawPhone(ctx, x, y, stick) {
    // the phone leaning on the jar, its screen lit, the lower joystick ring nudged while he drives
    ctx.save(); ctx.translate(x - 16, y - 2); ctx.rotate(-0.28);
    rr(ctx, -8, -30, 16, 32, 2.5); ctx.fillStyle = '#0d0d10'; ctx.fill();
    rr(ctx, -6.5, -28, 13, 27, 1.5); ctx.fillStyle = '#1a2c33'; ctx.fill();
    ctx.strokeStyle = 'rgba(' + CYAN + ',0.7)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(-2.5, -18, 3, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.arc(2.5, -8, 3, 0, TAU); ctx.stroke();
    dot(ctx, 2.5 + stick * 3, -8, 1.4, 'rgba(' + CYAN + ',0.9)');
    ctx.restore();
}
function drawCoil(ctx, x, y) {
    // a coil of wire on the shelf
    ctx.strokeStyle = '#4a4c54'; ctx.lineWidth = 2;
    for (let r = 3.5; r <= 9; r += 2.6) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(' + GOLD + ',0.3)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x, y, 9.6, -2.4, -0.9); ctx.stroke();
}
function drawPostureBoard(ctx, x, y, ang, p, time) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    rr(ctx, -26, -8, 52, 16, 2); ctx.fillStyle = '#e9e6df'; ctx.fill();
    ctx.fillStyle = '#b9b5ac';
    for (let i = 0; i < 10; i++) for (let j = 0; j < 2; j++) ctx.fillRect(-22 + i * 5, -5 + j * 6, 1.3, 1.3);
    // Photon 2, breathing cyan; the BNO055 beside it
    rr(ctx, -20, -5, 18, 9, 1); ctx.fillStyle = '#17181c'; ctx.fill();
    const br = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(time * 2.4));
    dot(ctx, -13, -0.5, 1.5, 'rgba(' + CYAN + ',' + (0.4 + 0.6 * br) + ')');
    ctx.globalCompositeOperation = 'lighter'; glow(ctx, -13, -0.5, 8, CYAN, 0.6 * br); ctx.globalCompositeOperation = 'source-over';
    rr(ctx, 2, -5, 9, 9, 1); ctx.fillStyle = '#2b5fb8'; ctx.fill();
    dot(ctx, 6.5, -0.5, 1.6, '#0d1a33');
    // the round buzzer, the tactile button, the yellow LiPo
    dot(ctx, 18, -1, 5, '#0c0c0e'); dot(ctx, 18, -1, 1.2, '#2a2b2f');
    ctx.fillStyle = '#2a2b30'; ctx.fillRect(12, 3, 4, 3);
    rr(ctx, -30, 9, 22, 8, 1.5); ctx.fillStyle = '#e3c43b'; ctx.fill(); ctx.fillStyle = '#f0da6e'; ctx.fillRect(-30, 9, 22, 1.2);
    // the OLED on its red carrier, held up on a flying lead: the cyan bar only, full and bright when he sits up
    ctx.strokeStyle = '#d8d6cf'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-6, -8); ctx.quadraticCurveTo(-4, -20, -2, -24); ctx.stroke();
    ctx.strokeStyle = '#1a1a1e'; ctx.beginPath(); ctx.moveTo(-4, -8); ctx.quadraticCurveTo(-1, -20, 1, -24); ctx.stroke();
    rr(ctx, -16, -42, 32, 20, 2); ctx.fillStyle = '#b0322a'; ctx.fill();
    ctx.fillStyle = '#060607'; ctx.fillRect(-13, -39, 26, 14);
    ctx.fillStyle = 'rgba(' + CYAN + ',0.25)'; ctx.fillRect(-11, -35, 22, 6);
    ctx.fillStyle = p.perfect > 0.5 ? '#b9f6ff' : 'rgb(' + CYAN + ')'; ctx.fillRect(-11, -35, 22 * clamp(p.bar, 0, 1), 6);
    ctx.globalCompositeOperation = 'lighter'; glow(ctx, 0, -32, 22, CYAN, p.perfect > 0.5 ? 0.3 : 0.16); ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
}
function drawBall(ctx, x, y, r) {
    dot(ctx, x, y, r, '#8a4322');
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip();
    dot(ctx, x - r * 0.25, y - r * 0.3, r * 0.95, '#b85c2e');
    dot(ctx, x - r * 0.4, y - r * 0.5, r * 0.5, '#d4793d');
    ctx.strokeStyle = '#2a1a10'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(x - r, y + 1); ctx.quadraticCurveTo(x, y - 3, x + r, y + 1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 2, y - r); ctx.quadraticCurveTo(x + 4, y, x - 2, y + r); ctx.stroke();
    ctx.restore();
}
const LAPTOP = { body: [[448, 210], [556, 206], [548, 287], [440, 290]], screen: [[453, 214], [551, 210], [544, 283], [446, 286]] };
const COACH_WORDS = ['PULSES', 'SET', 'SHOT', 'HELD', 'GOOD REP'];
function drawLaptopScreen(ctx, mode, plot, check, coach, time) {
    // the screen face, a parallelogram leaning back on the right end of the bench
    ctx.save(); poly(ctx, LAPTOP.screen); ctx.clip();
    const dark = mode === 'coach';
    ctx.fillStyle = dark ? '#0a0a0d' : '#0b1d22'; ctx.fillRect(436, 203, 125, 90);
    if (!dark) {
        const g = ctx.createLinearGradient(0, 210, 0, 286); g.addColorStop(0, 'rgba(' + CYAN + ',' + (mode === 'idle' ? 0.1 : 0.18) + ')'); g.addColorStop(1, 'rgba(' + CYAN + ',0.02)');
        ctx.fillStyle = g; ctx.fillRect(436, 203, 125, 90);
    }
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (mode === 'idle') {
        // asleep on the bench: a dim window and three faint lines, nothing moving
        ctx.fillStyle = 'rgba(' + CYAN + ',0.08)'; ctx.fillRect(464, 224, 72, 50);
        ctx.fillStyle = 'rgba(' + CYAN + ',0.28)'; ctx.fillRect(470, 233, 28, 2); ctx.fillRect(470, 240, 46, 2); ctx.fillRect(470, 247, 36, 2);
    } else if (mode === 'coach') {
        // the coach page: five words that light in order as he shoots, paper on near-black, the current one gold;
        // then one big gold check when the long buzz fires
        const lit = check > 0.5, step = Math.round(coach || 0);
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.font = 'italic 600 10px "Chakra Petch", sans-serif';
        try { ctx.letterSpacing = '0.9px'; } catch (_) { /* older engines */ }
        for (let i = 0; i < COACH_WORDS.length; i++) {
            const y = 222 + i * 13, now = step === i + 1;
            ctx.fillStyle = lit ? 'rgba(247,245,240,0.14)' : now ? 'rgb(' + GOLD + ')' : 'rgba(247,245,240,' + (i + 1 < step ? 0.55 : 0.3) + ')';
            ctx.fillText(COACH_WORDS[i], 464, y);
            if (now && !lit) { ctx.fillStyle = 'rgb(' + GOLD + ')'; ctx.fillRect(457, y - 1.2, 3, 2.4); }
        }
        try { ctx.letterSpacing = '0px'; } catch (_) { /* older engines */ }
        if (lit) {
            ctx.strokeStyle = 'rgb(' + GOLD + ')'; ctx.lineWidth = 6;
            ctx.beginPath(); ctx.moveTo(470, 248); ctx.lineTo(490, 268); ctx.lineTo(530, 226); ctx.stroke();
            ctx.globalCompositeOperation = 'lighter'; glow(ctx, 499, 248, 44, GOLD, 0.45); ctx.globalCompositeOperation = 'source-over';
        }
    } else {
        const traces = mode === 'two' ? 2 : 1;
        for (let k = 0; k < traces; k++) {
            ctx.strokeStyle = k === 0 ? 'rgb(' + CYAN + ')' : 'rgb(' + GOLD + ')'; ctx.lineWidth = 1.4;
            ctx.beginPath();
            const n = plot.length, base = 264 - k * 18;
            for (let i = 0; i < n; i++) {
                const x = 460 + (i / (n - 1)) * 80, v = plot[i] * (k === 0 ? 1 : 0.6);
                const y = base - v * 34 - (k === 1 ? Math.sin(i * 0.9 + time) * 1.2 : 0);
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(247,245,240,0.16)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(460, 272); ctx.lineTo(540, 271); ctx.stroke();
    }
    ctx.restore();
}
function drawProtoboard(ctx, x, y) {
    rr(ctx, x - 36, y - 12, 72, 24, 2); ctx.fillStyle = '#1e5a3a'; ctx.fill();
    ctx.fillStyle = '#2f7a50'; ctx.fillRect(x - 36, y - 12, 72, 1.5);
    ctx.fillStyle = '#9aa0a8';
    for (let i = 0; i < 12; i++) for (let j = 0; j < 3; j++) dot(ctx, x - 30 + i * 5.5, y - 7 + j * 7, 1.1, j === 1 && i % 3 === 0 ? '#d9dde3' : '#7d838c');
    ctx.lineWidth = 1.4; ctx.lineCap = 'round';
    const wires = [['#d84a3a', -28, -10, -16, -22, -4, -12], ['#1a1a1e', -8, -10, 4, -22, 14, -11], ['#e8c547', 10, -9, 20, -20, 30, -10], ['#3a8cff', -20, 8, -10, 16, 2, 9]];
    for (const w of wires) { ctx.strokeStyle = w[0]; ctx.beginPath(); ctx.moveTo(x + w[1], y + w[2]); ctx.quadraticCurveTo(x + w[3], y + w[4], x + w[5], y + w[6]); ctx.stroke(); }
    // the two coin motors, flat discs
    dot(ctx, x + 44, y - 4, 5, '#2a2b30'); dot(ctx, x + 44, y - 4, 3.2, '#8f9199'); dot(ctx, x + 44, y - 4, 1, '#3a3b40');
    dot(ctx, x + 54, y + 4, 5, '#2a2b30'); dot(ctx, x + 54, y + 4, 3.2, '#8f9199'); dot(ctx, x + 54, y + 4, 1, '#3a3b40');
}
function drawIronStand(ctx, x, y) {
    rr(ctx, x - 12, y - 4, 24, 8, 2); ctx.fillStyle = '#1b1c20'; ctx.fill();
    ctx.strokeStyle = '#4a4c54'; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(x - 6 + i * 4, y - 9, 3.5, Math.PI, 0); ctx.stroke(); }
    ctx.fillStyle = 'rgba(' + GOLD + ',0.35)'; ctx.fillRect(x - 12, y - 4, 24, 1.2);
}
function drawIron(ctx, H, ang, hot) {
    // from the hand: the handle back, the shaft forward to the tip
    const dx = Math.cos(ang), dy = Math.sin(ang);
    const handleA = [H[0] - dx * 22, H[1] - dy * 22], handleB = [H[0] + dx * 6, H[1] + dy * 6];
    const tip = [H[0] + dx * 30, H[1] + dy * 30];
    ctx.lineCap = 'round';
    ctx.lineWidth = 7; ctx.strokeStyle = '#17181c'; seg(ctx, handleA, handleB);
    ctx.lineWidth = 2; ctx.strokeStyle = '#3c3d44'; seg(ctx, [handleA[0] - 1, handleA[1] - 2.5], [handleB[0] - 1, handleB[1] - 2.5]);
    ctx.lineWidth = 3; ctx.strokeStyle = '#8f9199'; seg(ctx, handleB, [tip[0] - dx * 4, tip[1] - dy * 4]);
    ctx.lineWidth = 1.8; ctx.strokeStyle = hot ? '#ffe9b0' : '#c4c6cc'; seg(ctx, [tip[0] - dx * 6, tip[1] - dy * 6], tip);
    if (hot) { ctx.globalCompositeOperation = 'lighter'; glow(ctx, tip[0], tip[1], 9, GOLD, 0.7); ctx.globalCompositeOperation = 'source-over'; }
    // the cord trailing off the handle
    ctx.lineWidth = 1.4; ctx.strokeStyle = '#0f0f11';
    ctx.beginPath(); ctx.moveTo(handleA[0], handleA[1]); ctx.quadraticCurveTo(handleA[0] - 18, handleA[1] + 10, handleA[0] - 30, handleA[1] + 34); ctx.stroke();
    return tip;
}
/* the sleeve's materials: matte black cloth with the faintest lit edge, and the one gold mark */
const CLOTH = { lit: '#1f1f23', mid: '#101013', shade: '#060607' };
const MARK_GOLD = '#e6c15c';
/* the Betta mark: a black patch with a small gold crest (a shield, a figure reaching up) and the word Betta
   in simple gold type; the only mark on the sleeve. Drawn at (x, y) along angle a, at scale s. */
function drawBettaMark(ctx, x, y, a, s) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.scale(s, s);
    rr(ctx, -22, -7, 44, 14, 1.5); ctx.fillStyle = '#040405'; ctx.fill();
    ctx.strokeStyle = 'rgba(247,245,240,0.12)'; ctx.lineWidth = 0.6; ctx.stroke();
    ctx.strokeStyle = MARK_GOLD; ctx.lineWidth = 1; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-17.5, -4.5); ctx.lineTo(-9.5, -4.5); ctx.lineTo(-9.5, 0.5);
    ctx.quadraticCurveTo(-9.5, 3.8, -13.5, 5.6); ctx.quadraticCurveTo(-17.5, 3.8, -17.5, 0.5); ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-13.5, 3.2); ctx.lineTo(-13.5, -0.6); ctx.lineTo(-11, -3.2); ctx.stroke();   // the figure, one arm up
    dot(ctx, -13.5, -1.9, 1, MARK_GOLD);
    ctx.fillStyle = MARK_GOLD; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = '700 9.5px "Schibsted Grotesk", sans-serif'; ctx.fillText('Betta', -5.5, 0.6);
    ctx.restore();
}
/* the sleeve laid flat along the bench: a plain matte black compression sleeve from above the elbow to the hand,
   the thumbhole cuff at the left end, the flap pocket on the upper-arm end (right), the gold mark across the
   forearm. `open` lifts the flap and shows the sensor board in the pocket, while he solders its lead. */
function drawSleeveFlat(ctx, x, y, open) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(-0.04);
    const body = () => {
        ctx.beginPath(); ctx.moveTo(-70, -8); ctx.lineTo(56, -12); ctx.quadraticCurveTo(70, -12, 70, 0);
        ctx.quadraticCurveTo(70, 12, 56, 12); ctx.lineTo(-70, 8); ctx.quadraticCurveTo(-75, 0, -70, -8); ctx.closePath();
    };
    body(); ctx.fillStyle = CLOTH.mid; ctx.fill();
    ctx.save(); body(); ctx.clip();
    ctx.fillStyle = CLOTH.lit; ctx.fillRect(-76, -13, 150, 4);       // the lamp along the top edge
    ctx.fillStyle = CLOTH.shade; ctx.fillRect(-76, 7, 150, 8);        // the underside
    ctx.restore();
    ctx.strokeStyle = 'rgba(247,245,240,0.12)'; ctx.lineWidth = 0.8; body(); ctx.stroke();
    // the thumbhole cuff: a short loop off the left end, and the cuff seam
    ctx.lineCap = 'round'; ctx.lineWidth = 3.4; ctx.strokeStyle = CLOTH.mid;
    ctx.beginPath(); ctx.moveTo(-70, -5); ctx.quadraticCurveTo(-85, -10, -81, 1); ctx.stroke();
    ctx.lineWidth = 0.8; ctx.strokeStyle = 'rgba(247,245,240,0.14)';
    ctx.beginPath(); ctx.moveTo(-70, -6.5); ctx.quadraticCurveTo(-86, -11, -82, 1.5); ctx.stroke();
    ctx.strokeStyle = 'rgba(247,245,240,0.08)'; seg(ctx, [-62, -7.6], [-62, 7.6]);
    // the gold Betta mark across the forearm
    drawBettaMark(ctx, -20, 0, 0, 1);
    // the flap pocket on the upper arm
    rr(ctx, 28, -8, 30, 16, 1.5); ctx.fillStyle = '#141417'; ctx.fill();
    ctx.strokeStyle = 'rgba(247,245,240,0.16)'; ctx.lineWidth = 0.8; ctx.stroke();
    if (open) {
        rr(ctx, 31, -6, 24, 10, 1); ctx.fillStyle = '#1e5a3a'; ctx.fill();                      // the sensor board in the mouth of the pocket
        for (let i = 0; i < 5; i++) dot(ctx, 35 + i * 4.2, -1, 0.8, '#7d838c');
        dot(ctx, 52, -2.5, 1.2, 'rgb(' + GOLD + ')');
        rr(ctx, 28, -16, 30, 8, 1.5); ctx.fillStyle = '#18181c'; ctx.fill(); ctx.strokeStyle = 'rgba(247,245,240,0.16)'; ctx.stroke();   // the flap, lifted
    } else {
        rr(ctx, 28, -8, 30, 7, 1.5); ctx.fillStyle = '#18181c'; ctx.fill(); ctx.strokeStyle = 'rgba(247,245,240,0.16)'; ctx.stroke();    // the flap, down
    }
    ctx.restore();
}
/* the sleeve on his right arm: matte black from mid-bicep to the knuckles, the thumb through the cuff, the flap
   pocket on the upper arm, the gold mark on the forearm. Drawn after the hand. progress 0..1 is how far it has
   been pulled up from the hand. */
function drawSleeveOnArm(ctx, S, E, Hn, tip, ang, side, progress) {
    const u = clamp(progress, 0, 1);
    const top = [lerp(S[0], E[0], 0.5), lerp(S[1], E[1], 0.5)];                 // mid-bicep
    const knuckle = [lerp(Hn[0], tip[0], 0.62), lerp(Hn[1], tip[1], 0.62)];     // the cuff ends at the knuckles
    const pts = [knuckle, Hn, E, top], lens = [0];
    for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const on = lerp(26, lens[3], u);
    // how far up the arm the cloth has reached, as a point on the arm's path
    const at = d => {
        for (let i = 1; i < pts.length; i++) {
            if (d <= lens[i]) { const k = (d - lens[i - 1]) / ((lens[i] - lens[i - 1]) || 1); return [lerp(pts[i - 1][0], pts[i][0], k), lerp(pts[i - 1][1], pts[i][1], k)]; }
        }
        return pts[3];
    };
    const end = at(on);
    // the hand part, narrower; then the arm part over the wrist and up
    armStroke(ctx, [knuckle, on < lens[1] ? end : Hn], 14, CLOTH, 0.3);
    if (on > lens[1]) {
        const arm = [Hn];
        if (on > lens[2]) { arm.push(E); arm.push(end); } else arm.push(end);
        armStroke(ctx, arm, ARM.w + 3, CLOTH, 0.3);
        if (on > lens[2]) elbowCrease(ctx, S, E, Hn, '#000');
    }
    // the thumb comes through the cuff: skin again
    drawThumb(ctx, Hn, ang, side);
    // the cuff's edge at the wrist, the faintest line
    const wx = Math.cos(ang), wy = Math.sin(ang);
    ctx.strokeStyle = 'rgba(247,245,240,0.16)'; ctx.lineWidth = 0.9; ctx.lineCap = 'round';
    seg(ctx, [Hn[0] + wx * 2 - wy * 7, Hn[1] + wy * 2 + wx * 7], [Hn[0] + wx * 2 + wy * 7, Hn[1] + wy * 2 - wx * 7]);
    // the gold mark on the forearm, once the cloth has covered it
    const dm = lens[1] + (lens[2] - lens[1]) * 0.5;
    if (on >= dm + 10) {
        const m = at(dm), a = Math.atan2(E[1] - Hn[1], E[0] - Hn[0]);
        drawBettaMark(ctx, m[0], m[1], a + (Math.cos(a) < 0 ? Math.PI : 0), 0.55);
    }
    // the flap pocket on the upper arm, once covered
    const dp = lens[2] + (lens[3] - lens[2]) * 0.55;
    if (on >= dp + 6) {
        const p = at(dp), a = Math.atan2(S[1] - E[1], S[0] - E[0]);
        ctx.save(); ctx.translate(p[0], p[1]); ctx.rotate(a);
        rr(ctx, -9, -7, 18, 13, 1.2); ctx.fillStyle = '#141417'; ctx.fill(); ctx.strokeStyle = 'rgba(247,245,240,0.14)'; ctx.lineWidth = 0.7; ctx.stroke();
        rr(ctx, -9, -7, 18, 5.5, 1.2); ctx.fillStyle = '#18181c'; ctx.fill(); ctx.stroke();
        ctx.restore();
    }
}
function drawCheque(ctx, cx, cy, ang, scale, pinned) {
    // the award board: cream, a thin ink rule, the word Betta and the signature rule; the number stays in the corner
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang); ctx.scale(scale, scale);
    const w = CHEQUE_WALL.w, h = CHEQUE_WALL.h;
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(-w / 2 + 2, -h / 2 + 3, w, h);
    ctx.fillStyle = '#efe6cf'; ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.strokeStyle = '#141414'; ctx.lineWidth = 1; ctx.strokeRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6);
    ctx.fillStyle = '#141414'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.font = '700 10px "Schibsted Grotesk", sans-serif'; ctx.fillText('Betta', -w / 2 + 8, -h / 2 + 18);
    ctx.fillStyle = '#8a8a86'; ctx.fillRect(-w / 2 + 8, 2, w - 36, 0.8);
    ctx.fillRect(-w / 2 + 8, h / 2 - 9, w - 16, 0.8);
    ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 1; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-w / 2 + 10, h / 2 - 12); ctx.bezierCurveTo(-w / 2 + 18, h / 2 - 22, -w / 2 + 26, h / 2 - 8, -w / 2 + 38, h / 2 - 14); ctx.stroke();
    if (pinned) { dot(ctx, 0, -h / 2 + 4, 2.4, '#c6a15b'); dot(ctx, -0.6, -h / 2 + 3.4, 0.9, PAPER); }
    ctx.restore();
}
function drawDumbbell(ctx, x, y) {
    ctx.lineCap = 'round';
    ctx.lineWidth = 3; ctx.strokeStyle = '#3c3d44'; seg(ctx, [x - 14, y], [x + 14, y]);
    for (const dx of [-14, 14]) { rr(ctx, x + dx - 4, y - 9, 8, 18, 2); ctx.fillStyle = '#17181c'; ctx.fill(); ctx.fillStyle = 'rgba(' + GOLD + ',0.3)'; ctx.fillRect(x + dx - 4, y - 9, 8, 1.4); }
}
function drawShelfItem(ctx, kind, x, y) {
    if (kind === 'car') {
        poly(ctx, [[x - 18, y - 3], [x - 14, y - 7], [x + 14, y - 7], [x + 18, y - 3], [x + 14, y + 1], [x - 14, y + 1]]); ctx.fillStyle = '#101013'; ctx.fill();
        for (const dx of [-13, 12]) dot(ctx, x + dx, y + 2, 4, '#0c0c0e');
        rr(ctx, x - 12, y - 14, 24, 7, 1); ctx.fillStyle = '#d9d6cf'; ctx.fill();
        ctx.fillStyle = '#b0322a'; ctx.fillRect(x - 10, y - 19, 7, 5);
        ctx.fillStyle = 'rgba(' + GOLD + ',0.35)'; ctx.fillRect(x - 14, y - 7, 28, 1);
    } else if (kind === 'posture') {
        rr(ctx, x - 14, y - 4, 28, 9, 1); ctx.fillStyle = '#d9d6cf'; ctx.fill();
        ctx.fillStyle = '#17181c'; ctx.fillRect(x - 11, y - 2, 9, 5);
        dot(ctx, x - 7, y + 0.5, 1, 'rgba(' + CYAN + ',0.8)');
        ctx.fillStyle = '#b0322a'; ctx.fillRect(x + 2, y - 12, 12, 8);
        ctx.fillStyle = '#e3c43b'; ctx.fillRect(x - 16, y + 5, 12, 4);
    } else if (kind === 'rig') {
        rr(ctx, x - 16, y - 5, 32, 11, 1); ctx.fillStyle = '#1e5a3a'; ctx.fill();
        ctx.fillStyle = '#2f7a50'; ctx.fillRect(x - 16, y - 5, 32, 1);
        ctx.strokeStyle = '#d84a3a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - 10, y - 5); ctx.quadraticCurveTo(x - 4, y - 14, x + 4, y - 5); ctx.stroke();
        dot(ctx, x + 20, y + 2, 3, '#8f9199');
    }
}

/* ------------------------------------------------------------------
   the cave, cached: the back (wall, lamp, shelves, heater, laptop body,
   the cheque once it is on the wall) and the front (the bench)
   ------------------------------------------------------------------ */
function paintBack(ctx, stage, stageIndex) {
    ctx.fillStyle = '#08080a'; ctx.fillRect(0, 0, W, H);
    // the rock: a jittered grid of facets in neutral near-black; the lamp's colour is light laid over it, never paint
    const r = rng(7), cell = 44;
    const cols = Math.ceil(W / cell) + 2, rows = Math.ceil(310 / cell) + 2;
    const pts = [];
    for (let j = 0; j <= rows; j++) {
        pts[j] = [];
        for (let i = 0; i <= cols; i++) pts[j][i] = [i * cell - cell / 2 + (r() - 0.5) * cell * 0.9, j * cell - cell / 2 + (r() - 0.5) * cell * 0.9];
    }
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const q = [pts[j][i], pts[j][i + 1], pts[j + 1][i + 1], pts[j + 1][i]];
        const cx = (q[0][0] + q[2][0]) / 2, cy = (q[0][1] + q[2][1]) / 2;
        const k = cone(cx, cy);
        const t = Math.round(14 + r() * 12 + k * 24);
        poly(ctx, q);
        ctx.fillStyle = 'rgb(' + t + ',' + t + ',' + (t + 4) + ')';
        ctx.fill();
        // a warm rim on the facet edges the lamp reaches
        if (k > 0.05) {
            ctx.strokeStyle = 'rgba(' + GOLD + ',' + (k * 0.16) + ')'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(q[0][0], q[0][1]); ctx.lineTo(q[1][0], q[1][1]); ctx.stroke();
        } else {
            ctx.strokeStyle = 'rgba(255,255,255,0.025)'; ctx.lineWidth = 1; poly(ctx, q); ctx.stroke();
        }
    }
    // the cone of lamp light: four nested cones in lighter, so the edges feather
    ctx.globalCompositeOperation = 'lighter';
    for (const k of [1, 0.85, 0.7, 0.55]) {
        const cg = ctx.createLinearGradient(0, LAMP[1], 0, 330);
        cg.addColorStop(0, 'rgba(' + GOLD + ',0.05)'); cg.addColorStop(0.5, 'rgba(' + GOLD + ',0.022)'); cg.addColorStop(1, 'rgba(' + GOLD + ',0.004)');
        poly(ctx, [[LAMP[0] - 30 * k, LAMP[1]], [LAMP[0] + 30 * k, LAMP[1]], [LAMP[0] + 262 * k, 330], [LAMP[0] - 262 * k, 330]]);
        ctx.fillStyle = cg; ctx.fill();
    }
    glow(ctx, LAMP[0], LAMP[1] + 6, 64, '255,236,190', 0.26);
    ctx.globalCompositeOperation = 'source-over';
    // the shelves, back left, filling with what he has already built; a jar and a coil of wire from the start
    for (const sy of [172, 228]) {
        ctx.fillStyle = '#1a1b1f'; ctx.fillRect(22, sy, 108, 5);
        ctx.fillStyle = '#0d0d10'; ctx.fillRect(22, sy + 5, 108, 3);
        ctx.fillStyle = 'rgba(' + GOLD + ',' + (0.18 + cone(76, sy) * 0.3) + ')'; ctx.fillRect(22, sy, 108, 1.2);
    }
    drawJar(ctx, 98, 228, 0.55);
    drawCoil(ctx, 118, 218);
    const slots = [[50, 170], [100, 170], [60, 226]];
    stage.shelf.forEach((kind, i) => { if (slots[i]) drawShelfItem(ctx, kind, slots[i][0], slots[i][1]); });
    // the cheque on the wall, once it is pinned for good
    if (stage.cheque === 'wall') drawCheque(ctx, CHEQUE_WALL.x + CHEQUE_WALL.w / 2, CHEQUE_WALL.y + CHEQUE_WALL.h / 2, -0.03, 1, true);
    // the heater, far right: a brick box with a flue and a low wide mouth; the embers behind its grate breathe per frame
    ctx.fillStyle = '#131316'; ctx.fillRect(572, 118, 10, 68);
    ctx.fillStyle = '#17171a'; ctx.fillRect(556, 184, 44, 88);
    ctx.fillStyle = '#222226'; ctx.fillRect(556, 184, 44, 3); ctx.fillRect(556, 184, 3, 88);
    ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = 1;
    for (let yy = 196; yy < 272; yy += 10) seg(ctx, [556, yy], [600, yy]);
    rr(ctx, 559, 212, 38, 20, 2); ctx.fillStyle = '#050506'; ctx.fill();
    // the laptop body and bezel, from the first court days on
    if (stage.laptop) {
        if (stage.laptop !== 'idle' && stage.laptop !== 'coach') { ctx.globalCompositeOperation = 'lighter'; glow(ctx, 498, 250, 90, CYAN, 0.12); ctx.globalCompositeOperation = 'source-over'; }
        poly(ctx, LAPTOP.body); ctx.fillStyle = '#121317'; ctx.fill();
        ctx.strokeStyle = '#3c3d44'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(LAPTOP.body[0][0], LAPTOP.body[0][1]); ctx.lineTo(LAPTOP.body[1][0], LAPTOP.body[1][1]); ctx.stroke();
    }
    // the lamp: its cord, its shade, the bulb under the rim
    const top = LAMP[1] - 32;
    ctx.strokeStyle = '#0c0c0e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(LAMP[0], 0); ctx.lineTo(LAMP[0], top); ctx.stroke();
    poly(ctx, [[LAMP[0] - 13, top], [LAMP[0] + 13, top], [LAMP[0] + 42, LAMP[1]], [LAMP[0] - 42, LAMP[1]]]);
    ctx.fillStyle = '#17181b'; ctx.fill();
    ctx.strokeStyle = 'rgba(' + GOLD + ',0.55)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(LAMP[0] - 42, LAMP[1]); ctx.lineTo(LAMP[0] + 42, LAMP[1]); ctx.stroke();
    ctx.fillStyle = '#26272b'; ctx.fillRect(LAMP[0] - 13, top, 26, 2);
    ctx.beginPath(); ctx.ellipse(LAMP[0], LAMP[1] + 1, 12, 5, 0, 0, Math.PI); ctx.fillStyle = '#fff1c8'; ctx.fill();
    ctx.globalCompositeOperation = 'lighter'; glow(ctx, LAMP[0], LAMP[1] + 2, 26, '255,236,190', 0.8); ctx.globalCompositeOperation = 'source-over';
}
function paintFront(ctx, stage) {
    // the bench: a graphite slab, the lamp pooling on it, a worn lit front edge, near-black below
    ctx.fillStyle = '#26272b'; ctx.fillRect(40, BENCH_BACK, W - 40, BENCH_FRONT - BENCH_BACK);
    ctx.save(); ctx.beginPath(); ctx.rect(40, BENCH_BACK, W - 40, BENCH_FRONT - BENCH_BACK); ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    const pg = ctx.createRadialGradient(LAMP[0], BENCH_BACK + 6, 0, LAMP[0], BENCH_BACK + 6, 230);
    pg.addColorStop(0, 'rgba(' + GOLD + ',0.3)'); pg.addColorStop(1, 'rgba(' + GOLD + ',0)');
    ctx.fillStyle = pg; ctx.fillRect(0, BENCH_BACK, W, 20);
    if (stage.laptop && stage.laptop !== 'idle' && stage.laptop !== 'coach') glow(ctx, 496, BENCH_BACK + 4, 70, CYAN, 0.2);
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
    const eg = ctx.createLinearGradient(60, 0, 560, 0);
    eg.addColorStop(0, 'rgba(' + GOLD + ',0.08)'); eg.addColorStop(0.4, 'rgba(' + GOLD + ',0.75)'); eg.addColorStop(1, 'rgba(' + GOLD + ',0.1)');
    ctx.fillStyle = eg; ctx.fillRect(40, BENCH_FRONT - 1.5, W - 40, 2);
    ctx.fillStyle = '#141518'; ctx.fillRect(40, BENCH_FRONT, W - 40, H - BENCH_FRONT);
    ctx.fillStyle = '#1d1e22'; ctx.fillRect(40, BENCH_FRONT, 6, H - BENCH_FRONT);   // the end face
    const fg = ctx.createLinearGradient(0, BENCH_FRONT, 0, H); fg.addColorStop(0, 'rgba(0,0,0,0)'); fg.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = fg; ctx.fillRect(40, BENCH_FRONT, W - 40, H - BENCH_FRONT);
    // the floor at the left end, and the cables along the bench front
    ctx.fillStyle = '#0d0d10'; ctx.fillRect(0, BENCH_FRONT + 40, 40, H);
    ctx.lineCap = 'round';
    const cables = [[60, 302, 150, 360, 250, 304, '#0b0b0d', 3], [230, 302, 330, 340, 470, 303, '#0e0e11', 2.2], [380, 302, 520, 372, 600, 330, '#0b0b0d', 3]];
    for (const c of cables) {
        ctx.strokeStyle = c[6]; ctx.lineWidth = c[7];
        ctx.beginPath(); ctx.moveTo(c[0], c[1]); ctx.quadraticCurveTo(c[2], c[3], c[4], c[5]); ctx.stroke();
        ctx.strokeStyle = 'rgba(' + GOLD + ',0.14)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(c[0], c[1] - 1); ctx.quadraticCurveTo(c[2], c[3] - 1, c[4], c[5] - 1); ctx.stroke();
    }
    // the still props that belong to the stage
    if (stage.bench === 'car') drawJar(ctx, 424, BENCH_BACK + 8, 1);
    if (stage.bench === 'rig' || stage.bench === 'sleeve') { drawIronStand(ctx, STAND[0], STAND[1]); drawDumbbell(ctx, 20, 372); }
    if (stage.bench === 'rig') drawProtoboard(ctx, 322, BENCH_BACK - 2);
}

/* ------------------------------------------------------------------
   mount
   ------------------------------------------------------------------ */
/* The stylesheet: index.html may not link this module's css (lab.css beside lab.js), so the module links
   it once itself, named after its own URL and with the same build query, unless the page already has it. */
let stylesChecked = false;
function ensureStyles() {
    if (stylesChecked) return;
    stylesChecked = true;
    try {
        const me = new URL(import.meta.url);
        const cssPath = me.pathname.replace(/\.m?js$/, '.css');
        const base = cssPath.slice(cssPath.lastIndexOf('/') + 1);
        for (const link of document.querySelectorAll('link[rel="stylesheet"]')) {
            const href = (link.getAttribute('href') || '').split('?')[0];
            if (href === base || href.endsWith('/' + base)) return;
        }
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = new URL(cssPath + me.search, me).href;
        document.head.appendChild(link);
    } catch (err) { /* no document.head or no import.meta: the inline sizing rules below still hold */ }
}
let uid = 0;
export function mountLab(el, opts = {}) {
    ensureStyles();
    const onInteract = typeof opts.onInteract === 'function' ? opts.onInteract : () => {};
    const autoplayWanted = opts.autoplay !== false;
    const stillOpt = opts.still;
    const stillMode = stillOpt === true || typeof stillOpt === 'number';
    const stages = STAGES;
    const doc = el.ownerDocument, win = doc.defaultView || window;
    const id = 'lab-' + (++uid);

    // DOM: figure > [tabpanel: stage (canvas + number), caption] + the timeline of tabs
    const fig = doc.createElement('figure');
    fig.className = 'lab';
    fig.setAttribute('aria-roledescription', 'timeline');
    fig.setAttribute('aria-label', 'The lab: building Betta, ' + stages.length + ' stages');
    const panel = doc.createElement('div'); panel.className = 'lab-panel'; panel.id = id + '-panel';
    panel.setAttribute('role', 'tabpanel'); panel.setAttribute('aria-atomic', 'true');
    const stageEl = doc.createElement('div'); stageEl.className = 'lab-stage';
    const canvas = doc.createElement('canvas'); canvas.setAttribute('aria-hidden', 'true');
    /* the load-bearing sizing rules, inline, so a page whose stylesheet has not arrived yet cannot be inflated by the canvas */
    stageEl.style.position = 'relative'; stageEl.style.overflow = 'hidden'; stageEl.style.aspectRatio = '3 / 2';
    canvas.style.display = 'block'; canvas.style.width = '100%'; canvas.style.height = '100%';
    const numberEl = doc.createElement('div'); numberEl.className = 'lab-number';
    const numB = doc.createElement('b'), numS = doc.createElement('small');
    numberEl.append(numB, numS);
    stageEl.append(canvas, numberEl);
    const cap = doc.createElement('figcaption'); cap.className = 'lab-cap';
    const dateEl = doc.createElement('span'); dateEl.className = 'lab-date';
    const dateText = doc.createTextNode('');
    const titleEl = doc.createElement('span'); titleEl.className = 'lab-title';
    dateEl.append(dateText, doc.createTextNode(' '), titleEl);   // the space keeps 'Nov 2025' and 'Bluetooth Car' apart for a screen reader
    const lineEl = doc.createElement('span'); lineEl.className = 'lab-line';
    cap.append(dateEl, lineEl);
    panel.append(stageEl, cap);
    const time_ = doc.createElement('div'); time_.className = 'lab-time';
    const tabs = doc.createElement('div'); tabs.className = 'lab-tabs'; tabs.setAttribute('role', 'tablist'); tabs.setAttribute('aria-label', 'Stage');
    tabs.style.setProperty('--n', String(stages.length));
    const tabEls = stages.map((s, i) => {
        const b = doc.createElement('button');
        b.type = 'button'; b.className = 'lab-tab'; b.id = id + '-tab-' + i;
        b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', 'false'); b.setAttribute('aria-controls', panel.id);
        b.setAttribute('aria-label', s.date + ', ' + s.title);
        b.tabIndex = -1; b.dataset.index = String(i);
        const parts = s.date.split(' ');
        const m = doc.createElement('span'); m.className = 'lab-tab-m'; m.textContent = parts[0];
        const y = doc.createElement('span'); y.className = 'lab-tab-y'; y.textContent = parts[1] || '';
        b.append(m, y);
        return b;
    });
    tabs.append(...tabEls);
    time_.append(tabs);
    fig.append(panel, time_);
    el.replaceChildren(fig);

    // state
    const mq = win.matchMedia ? win.matchMedia('(prefers-reduced-motion: reduce)') : null;
    let reduced = !!(mq && mq.matches);
    let index = opts.start === 'last' ? stages.length - 1 : 0;
    let destroyed = false, rafId = 0, running = false, inView = true, hovered = false, focused = false, keyboardLast = false;
    let playing = autoplayWanted && !stillMode;
    let userPauseUntil = 0;
    let time = 0, loopT = 0, prevLoopT = 0, dwellT = 0, lastNow = 0, pass = 0;
    let cut = null;    // { phase: 'out' | 'in', t, outDur, inDur, next }
    let fade = 0;
    let seam = -1;     // seconds into the crossfade over a loop's wrap, -1 when none
    let blinkNext = 2.4, blinkUntil = -1;
    let dpr = 1, cssW = 0, cssH = 0;
    const ctx = canvas.getContext('2d');
    const backC = doc.createElement('canvas'), frontC = doc.createElement('canvas'), figC = doc.createElement('canvas'), seamC = doc.createElement('canvas');
    const backX = backC.getContext('2d'), frontX = frontC.getContext('2d'), figX = figC.getContext('2d'), seamX = seamC.getContext('2d');
    const sparks = [], rings = [], puffs = [], dust = [];
    const plot = new Array(40).fill(0);
    let plotKick = 0, smokeAcc = 0, plotAcc = 0;
    const pose = {};
    let rand = rng(1);
    const stats = { frames: 0, total: 0, max: 0 };
    let lastHand = null;

    (function seedDust() {
        const r = rng(3);
        for (let i = 0; i < 42; i++) dust.push({ u: r(), v: r(), sway: r() * TAU, speed: 0.012 + r() * 0.02, size: 0.7 + r() * 0.9 });
    })();

    const current = () => stages[index];
    const dwellFor = i => (i === stages.length - 1 ? DWELL_LAST : DWELL);
    const tracksNow = () => { const c = COMPILED[current().action]; return (pass > 0 && c.again) || c.main; };
    const eventsNow = () => { const a = ACTIONS[current().action]; return (pass > 0 && a.again) ? (a.eventsAgain || []) : a.events; };

    function setText() {
        const s = current();
        numB.textContent = s.number;
        numS.textContent = s.unit || '';
        numberEl.classList.toggle('is-long', s.number.length > 6);
        dateText.nodeValue = s.date;
        titleEl.textContent = s.title;
        lineEl.textContent = s.line;
    }
    /* the tabs' state follows a selection at once, the canvas follows after the cut */
    function markTabs(i) {
        tabEls.forEach((b, k) => {
            b.setAttribute('aria-selected', k === i ? 'true' : 'false');
            b.tabIndex = k === i ? 0 : -1;
            b.classList.toggle('is-past', k < i);
        });
        panel.setAttribute('aria-labelledby', tabEls[i].id);
    }

    function resize() {
        const w = Math.max(320, stageEl.clientWidth || 0);
        const h = Math.round(w * 2 / 3);
        const d = Math.min(3, win.devicePixelRatio || 1);
        if (w === cssW && h === cssH && d === dpr) return;
        cssW = w; cssH = h; dpr = d;
        for (const c of [canvas, backC, frontC, figC, seamC]) { c.width = Math.round(w * d); c.height = Math.round(h * d); }
        seam = -1;
        rebuildStatic();
        drawFrame();
    }
    function setTransform(c) { c.setTransform(dpr * cssW / W, 0, 0, dpr * cssH / H, 0, 0); }
    function rebuildStatic() {
        const t0 = performance.now();
        setTransform(backX); setTransform(frontX);
        backX.clearRect(0, 0, W, H); frontX.clearRect(0, 0, W, H);
        paintBack(backX, current(), index);
        paintFront(frontX, current());
        stats.rebuildMs = performance.now() - t0;
    }

    /* the simulation step: advances the loop clock, fires events, moves particles */
    function step(dt) {
        const s = current();
        time += dt;
        prevLoopT = loopT;
        loopT += dt;
        let wrapped = false;
        if (loopT >= s.loop) {
            loopT -= s.loop; wrapped = true;
            // the wrap: keep the last frame and crossfade it over the next pass, so a prop going back reads as a dissolve, not a pop
            if (running && !reduced && cssW) {
                seamX.setTransform(1, 0, 0, 1, 0, 0); seamX.clearRect(0, 0, seamC.width, seamC.height); seamX.drawImage(canvas, 0, 0);
                seam = 0;
            }
            pass++;
        }
        sample(tracksNow(), loopT, pose);
        for (const [t, name] of eventsNow()) {
            const hit = wrapped ? (t > prevLoopT || t <= loopT) : (t > prevLoopT && t <= loopT);
            if (hit) fire(name);
        }
        if (seam >= 0) { seam += dt; if (seam >= SEAM) seam = -1; }
        if (!reduced) {
            for (let i = sparks.length - 1; i >= 0; i--) {
                const p = sparks[i];
                p.age += dt; if (p.age >= p.life) { sparks.splice(i, 1); continue; }
                p.vy += 520 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
            }
            for (let i = rings.length - 1; i >= 0; i--) { rings[i].age += dt; if (rings[i].age >= rings[i].dur) rings.splice(i, 1); }
            for (let i = puffs.length - 1; i >= 0; i--) { const p = puffs[i]; p.age += dt; if (p.age >= p.life) { puffs.splice(i, 1); continue; } p.y -= 14 * dt; p.x += Math.sin(p.age * 3 + p.ph) * 6 * dt; }
            if (pose.smoke > 0.5 && lastHand) {
                smokeAcc += dt;
                if (smokeAcc > 0.22) { smokeAcc = 0; puffs.push({ x: lastHand.tip[0], y: lastHand.tip[1], age: 0, life: 1.6, ph: rand() * TAU }); }
            }
            for (const d of dust) { d.v += d.speed * dt; if (d.v > 1) d.v -= 1; d.sway += dt * 0.6; }
        }
        // the live plot scrolls
        plotKick *= Math.exp(-dt * 2.2);
        const sampleRate = 18;
        plotAcc += dt;
        while (plotAcc > 1 / sampleRate) {
            plotAcc -= 1 / sampleRate;
            plot.shift();
            plot.push(0.08 + (rand() - 0.5) * 0.06 + plotKick * (0.7 + rand() * 0.3));
        }
        // blinks
        if (time >= blinkNext) { blinkUntil = time + 0.12; blinkNext = time + 2.4 + rand() * 2.8; }
    }

    function fire(name) {
        if (name === 'plot') { plotKick = 1; return; }
        if (reduced) return;
        if (name === 'sparks' && lastHand) {
            const [x, y] = lastHand.tip;
            for (let i = 0; i < 46; i++) {
                const a = -Math.PI / 2 + (rand() - 0.5) * 2.4, sp = 60 + rand() * 190;
                sparks.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.4 + rand() * 0.5, age: 0, w: 0.8 + rand() * 1.2 });
            }
        } else if (name === 'tap') rings.push({ at: 'farWrist', r0: 4, r1: 16, dur: 0.38, age: 0, w: 2 });
        else if (name === 'tapn') rings.push({ at: 'nearWrist', r0: 4, r1: 14, dur: 0.28, age: 0, w: 1.6 });     // a tap on the sleeve's wrist
        else if (name === 'set') rings.push({ at: 'nearWrist', r0: 5, r1: 24, dur: 0.5, age: 0, w: 2.6 });       // ONE firm buzz: set
        else if (name === 'long') rings.push({ at: 'nearWrist', r0: 6, r1: 34, dur: 0.95, age: 0, w: 3 });     // ONE long buzz: good rep; r1 34 clears the shade's corner from the release wrist
        else if (name === 'buzz') rings.push({ at: 'buzzer', r0: 5, r1: 22, dur: 0.45, age: 0, w: 2 });
    }

    /* one frame of drawing, from the current pose */
    function drawFrame() {
        if (!cssW) return;
        const t0 = performance.now();
        const s = current();
        setTransform(ctx);
        ctx.clearRect(0, 0, W, H);
        ctx.drawImage(backC, 0, 0, W, H);
        // dust in the cone
        if (!reduced) {
            ctx.globalCompositeOperation = 'lighter';
            for (const d of dust) {
                const y = LAMP[1] + 20 + d.v * 260;
                const half = 0.8 * (y - LAMP[1]) + 8;
                const x = LAMP[0] + (d.u - 0.5) * 2 * half + Math.sin(d.sway) * 6;
                const k = cone(x, y);
                if (k <= 0.02) continue;
                ctx.fillStyle = 'rgba(' + GOLD + ',' + (k * 0.5) + ')';
                ctx.fillRect(x, y, d.size, d.size);
            }
            ctx.globalCompositeOperation = 'source-over';
        }
        const g = geom(pose, time);
        const grip = pose.grip > 0.5;
        const rh = grip ? [pose.rh[0] + g.sx, pose.rh[1] + g.sy] : pose.rh;
        const fh = grip ? [pose.fh[0] + g.sx, pose.fh[1] + g.sy] : pose.fh;
        const blink = time < blinkUntil;
        const farWrist = { at: null };
        // pass 1: the far arm, the torso, the neck, the head
        setTransform(figX); figX.clearRect(0, 0, W, H);
        if (s.bench === 'forearm') {
            // the lead from the forearm board runs behind him to the laptop: drawn first, under the torso
            const [E, Hn] = ik(g.shN, rh, ARM.upper, ARM.fore, -1);
            const px = lerp(E[0], Hn[0], 0.5), py = lerp(E[1], Hn[1], 0.5);
            figX.lineCap = 'round';
            figX.strokeStyle = '#2a2b2e'; figX.lineWidth = 1.8;
            figX.beginPath(); figX.moveTo(px, py); figX.quadraticCurveTo(px + 40, py + 70, 456, BENCH_BACK - 2); figX.stroke();
            figX.strokeStyle = 'rgba(247,245,240,0.18)'; figX.lineWidth = 1;
            figX.beginPath(); figX.moveTo(px, py - 1); figX.quadraticCurveTo(px + 40, py + 69, 456, BENCH_BACK - 3); figX.stroke();
        }
        const farExtra = s.bench === 'rig' ? {
            onForearm: (E, Hn) => {
                // the two IMU breakouts taped to the far arm; the ribbon runs down the inside of the arm to the wrist, then to the board
                const tape = (A, B, u) => {
                    const px = lerp(A[0], B[0], u), py = lerp(A[1], B[1], u);
                    const ang = Math.atan2(B[1] - A[1], B[0] - A[0]);
                    figX.save(); figX.translate(px, py); figX.rotate(ang);
                    figX.fillStyle = '#6f727a'; figX.fillRect(-7, -10, 14, 20);
                    rr(figX, -5, -4, 10, 8, 1); figX.fillStyle = '#2b5fb8'; figX.fill(); dot(figX, 0, 0, 1, '#0d1a33');
                    figX.restore();
                    return [px, py];
                };
                const S = g.shF;
                const a1 = tape(S, E, 0.55), a2 = tape(E, Hn, 0.5);
                figX.strokeStyle = '#5a5d66'; figX.lineWidth = 1.2; figX.lineCap = 'round'; figX.lineJoin = 'round';
                figX.beginPath(); figX.moveTo(a1[0], a1[1]); figX.lineTo(E[0] - 2, E[1] + 3); figX.lineTo(a2[0], a2[1]); figX.lineTo(Hn[0], Hn[1]);
                figX.quadraticCurveTo(Hn[0] - 10, Hn[1] + 60, 340, BENCH_BACK - 4); figX.stroke();
            },
        } : null;
        const far = drawArm(figX, g.shF, fh, 1, pose.fw, s.outfit, farExtra);
        farWrist.at = far.H;
        drawTorso(figX, g, s.outfit);
        drawNeck(figX, g);
        drawHead(figX, g, pose, s.hair, blink, time, index);
        lightPass(figX, s, [120, 30, 380, 280]);
        ctx.drawImage(figC, 0, 0, W, H);
        // the bench in front of him
        ctx.drawImage(frontC, 0, 0, W, H);
        // the props on the bench
        drawBenchProps(ctx, s);
        // pass 2: the near arm and what it holds
        setTransform(figX); figX.clearRect(0, 0, W, H);
        const nearExtra = (s.bench === 'forearm') ? {
            onForearm: (E, Hn) => {
                // the posture board strapped to the forearm with a black band
                const u = 0.5, px = lerp(E[0], Hn[0], u), py = lerp(E[1], Hn[1], u), ang = Math.atan2(Hn[1] - E[1], Hn[0] - E[0]);
                figX.save(); figX.translate(px, py); figX.rotate(ang);
                figX.fillStyle = '#0f0f12'; figX.fillRect(-16, -12, 6, 24); figX.fillRect(10, -12, 6, 24);
                rr(figX, -14, -8, 28, 12, 1.5); figX.fillStyle = '#e9e6df'; figX.fill();
                figX.fillStyle = '#17181c'; figX.fillRect(-11, -5, 10, 6); dot(figX, -6, -2, 1.2, 'rgb(' + CYAN + ')');
                figX.fillStyle = '#2b5fb8'; figX.fillRect(2, -5, 7, 6);
                figX.restore();
            },
        } : (s.bench === 'sleeve' && pose.sleeve > 0) ? {
            afterHand: (S, E, Hn, tip, ang, side) => { drawSleeveOnArm(figX, S, E, Hn, tip, ang, side, pose.sleeve); },
        } : null;
        const near = drawArm(figX, g.shN, rh, -1, pose.rw, s.outfit, nearExtra);
        lastHand = near;
        // held things
        if (s.bench === 'car' && pose.wire > 0.5) {
            figX.strokeStyle = '#e8c547'; figX.lineWidth = 1.6; figX.lineCap = 'round';
            figX.beginPath(); figX.moveTo(near.tip[0], near.tip[1]); figX.lineTo(near.tip[0] + 3, near.tip[1] + 9); figX.stroke();
        }
        if (s.bench === 'posture' && pose.board > 0.5) drawPostureBoard(figX, near.tip[0] + 6, near.tip[1] - 4, -0.15, pose, time);
        if ((s.bench === 'rig' || s.bench === 'sleeve') && pose.iron > 0.5) {
            const tip = drawIron(figX, near.H, near.ang + 0.55, pose.smoke > 0.5);
            lastHand = { tip, H: near.H, ang: near.ang };
        }
        lightPass(figX, s, [120, 30, 380, 280]);
        ctx.drawImage(figC, 0, 0, W, H);
        // the ball, in his hands or in the air: it leaves the release hand and arcs out of the right edge
        if (s.bench === 'forearm' || s.bench === 'sleeve') {
            if (pose.ball === 1) {
                // between the hands at the pick-up and the set; as the hands pass the shoulders it rides up onto the
                // shooting hand's fingertips, so at release it sits above the brow and in front of it, not on the crown
                const midY = (rh[1] + fh[1]) / 2, up = clamp((150 - midY) / 80, 0, 1);
                const bx = lerp((rh[0] + fh[0]) / 2 + 2, near.tip[0] + Math.cos(near.ang) * 12, up);
                const by = lerp(midY - 12, near.tip[1] + Math.sin(near.ang) * 12, up);
                drawBall(ctx, bx, by, 13);
            } else if (pose.ball === 2) {
                // from the fingertips, over an apex at y 30, out of the right edge at y 112, never over the lamp
                const u = pose.fly, P0 = LAUNCH, P1 = [440, -4], P2 = [612, 112];
                const x = (1 - u) * (1 - u) * P0[0] + 2 * (1 - u) * u * P1[0] + u * u * P2[0];
                const y = (1 - u) * (1 - u) * P0[1] + 2 * (1 - u) * u * P1[1] + u * u * P2[1];
                drawBall(ctx, x, y, 13);
            }
        }
        if (s.bench === 'award' && pose.chq < 0.5) drawCheque(ctx, (rh[0] + fh[0]) / 2, (rh[1] + fh[1]) / 2 - 4, -0.12, 0.92, false);
        if (s.bench === 'award' && pose.chq >= 0.5) drawCheque(ctx, CHEQUE_WALL.x + CHEQUE_WALL.w / 2, CHEQUE_WALL.y + CHEQUE_WALL.h / 2, -0.03, 1, true);
        // the laptop's screen
        if (s.laptop) drawLaptopScreen(ctx, s.laptop, plot, pose.check, pose.coach, time);
        // smoke, rings, sparks
        if (!reduced) {
            for (const p of puffs) {
                const u = p.age / p.life;
                ctx.fillStyle = 'rgba(154,156,163,' + (0.16 * (1 - u)) + ')';
                ctx.beginPath(); ctx.arc(p.x, p.y - u * 28, 2 + u * 9, 0, TAU); ctx.fill();
            }
            for (const r of rings) {
                const u = r.age / r.dur;
                let at = null;
                if (r.at === 'farWrist') at = farWrist.at;
                else if (r.at === 'nearWrist') at = near.H;
                else if (r.at === 'buzzer') at = [near.tip[0] + 6 + 18, near.tip[1] - 4 - 1];
                if (!at) continue;
                ctx.strokeStyle = 'rgba(' + GOLD + ',' + (0.9 * (1 - u)) + ')'; ctx.lineWidth = r.w * (1 - u * 0.6);
                ctx.beginPath(); ctx.arc(at[0], at[1], lerp(r.r0, r.r1, EASE.out(u)), 0, TAU); ctx.stroke();
            }
            if (sparks.length) {
                ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
                for (const p of sparks) {
                    const u = p.age / p.life, a = 1 - u;
                    const cr = Math.round(lerp(255, 240, u)), cg = Math.round(lerp(248, 182, u)), cb = Math.round(lerp(220, 74, u));
                    ctx.strokeStyle = 'rgba(' + cr + ',' + cg + ',' + cb + ',' + a + ')'; ctx.lineWidth = p.w;
                    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.022, p.y - p.vy * 0.022); ctx.stroke();
                }
                ctx.globalCompositeOperation = 'source-over';
            }
        }
        // the heater's embers breathe low in its mouth, behind a grate of five thin bars
        const fl = reduced ? 0.5 : 0.5 + 0.5 * Math.sin(time * 5.1) * Math.sin(time * 2.1);
        ctx.save(); rr(ctx, 559, 212, 38, 20, 2); ctx.clip();
        ctx.globalCompositeOperation = 'lighter';
        glow(ctx, 578, 233, 24, EMBER, 0.55 + fl * 0.3);
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = '#08080a'; ctx.lineWidth = 2.4; ctx.lineCap = 'butt';
        for (let i = 0; i < 5; i++) seg(ctx, [564 + i * 7, 212], [564 + i * 7, 232]);
        ctx.restore();
        ctx.globalCompositeOperation = 'lighter';
        glow(ctx, 578, 226, 30, EMBER, 0.08 + fl * 0.07);   // the spill onto the bricks
        ctx.globalCompositeOperation = 'source-over';
        // the crossfade over a loop's wrap
        if (seam >= 0) {
            ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.globalAlpha = 1 - EASE.io(clamp(seam / SEAM, 0, 1));
            ctx.drawImage(seamC, 0, 0);
            ctx.restore();
            setTransform(ctx);
        }
        if (fade > 0) { ctx.fillStyle = 'rgba(0,0,0,' + fade + ')'; ctx.fillRect(0, 0, W, H); }
        numberEl.style.opacity = String(1 - fade);
        const cost = performance.now() - t0;
        stats.frames++; stats.total += cost; if (cost > stats.max) stats.max = cost;
    }
    /* the light on him: warm from the lamp above, cyan from the laptop, dark toward the bench */
    function lightPass(c, s, box) {
        c.globalCompositeOperation = 'source-atop';
        const warm = c.createRadialGradient(LAMP[0], LAMP[1], 10, LAMP[0], LAMP[1], 320);
        warm.addColorStop(0, 'rgba(' + GOLD + ',0.3)'); warm.addColorStop(0.5, 'rgba(' + GOLD + ',0.12)'); warm.addColorStop(1, 'rgba(' + GOLD + ',0)');
        c.fillStyle = warm; c.fillRect(box[0], box[1], box[2] - box[0], box[3] - box[1]);
        if (s.laptop && s.laptop !== 'idle') {
            const cool = c.createRadialGradient(500, 240, 10, 500, 240, 230);
            cool.addColorStop(0, 'rgba(' + CYAN + ',0.32)'); cool.addColorStop(1, 'rgba(' + CYAN + ',0)');
            c.fillStyle = cool; c.fillRect(box[0], box[1], box[2] - box[0], box[3] - box[1]);
        }
        const dark = c.createLinearGradient(0, 190, 0, 300);
        dark.addColorStop(0, 'rgba(6,6,8,0)'); dark.addColorStop(1, 'rgba(6,6,8,0.5)');
        c.fillStyle = dark; c.fillRect(box[0], 190, box[2] - box[0], 120);
        c.globalCompositeOperation = 'source-over';
    }
    function drawBenchProps(c, s) {
        if (s.bench === 'car') { drawPhone(c, 424, BENCH_BACK + 8, pose.stick); drawCar(c, 300 + pose.carX, BENCH_BACK + 4, pose.spin, pose.led, time); }
        if (s.bench === 'posture' && pose.board < 0.5) drawPostureBoard(c, 306, BENCH_BACK - 4, 0, pose, time);
        if ((s.bench === 'forearm' || s.bench === 'sleeve') && pose.ball === 0) drawBall(c, BALL_REST[0], BALL_REST[1], 13);
        if (s.bench === 'award') drawBall(c, BALL_REST[0], BALL_REST[1], 13);
        if ((s.bench === 'rig' || s.bench === 'sleeve') && pose.iron < 0.5) drawIron(c, [STAND[0] + 14, BENCH_BACK - 10], -0.25, false);
        if (s.bench === 'sleeve' && pose.sleeve <= 0) drawSleeveFlat(c, SLEEVE_FLAT[0], SLEEVE_FLAT[1], pose.iron > 0.5);
    }

    /* the loop */
    function frame(now) {
        rafId = 0;
        if (destroyed || !running) return;
        const dt = lastNow ? Math.min((now - lastNow) / 1000, 0.1) : 1 / 60;
        lastNow = now;
        step(dt);
        advance(dt, now);
        drawFrame();
        rafId = win.requestAnimationFrame(frame);
    }
    function advance(dt, now) {
        if (cut) {
            cut.t += dt;
            if (cut.phase === 'out') {
                fade = clamp(cut.t / cut.outDur, 0, 1);
                if (cut.t >= cut.outDur) { swap(cut.next); cut.phase = 'in'; cut.t = 0; }
            } else {
                fade = 1 - clamp(cut.t / cut.inDur, 0, 1);
                if (cut.t >= cut.inDur) { fade = 0; cut = null; dwellT = 0; }
            }
            return;
        }
        if (!playing || reduced || stillMode) return;
        if (hovered || focused || now < userPauseUntil) return;
        dwellT += dt;
        if (dwellT >= dwellFor(index)) {
            panel.setAttribute('aria-live', 'off');     // autoplay's own cuts stay quiet for screen readers
            cut = { phase: 'out', t: 0, outDur: CUT_OUT, inDur: CUT_IN, next: (index + 1) % stages.length };
        }
    }
    function swap(i) {
        index = i;
        loopT = 0; prevLoopT = 0; dwellT = 0; pass = 0; seam = -1;
        sparks.length = 0; rings.length = 0; puffs.length = 0; plotKick = 0; plot.fill(0.08);
        rand = rng(100 + i);
        sample(tracksNow(), 0, pose);
        setText();
        markTabs(i);
        rebuildStatic();
    }
    function renderStill() {
        // deterministic: run the loop from zero to the chosen second, then draw once
        const t0 = performance.now();
        const s = current();
        const at = reduced || stillOpt === true || typeof stillOpt !== 'number' ? s.still : stillOpt;
        loopT = 0; prevLoopT = 0; time = 0; blinkUntil = -1; blinkNext = 1e9; pass = 0; seam = -1;
        sparks.length = 0; rings.length = 0; puffs.length = 0; plot.fill(0.08); plotKick = 0; plotAcc = 0;
        rand = rng(100 + index);
        sample(tracksNow(), 0, pose);
        drawFrame();   // once, so lastHand (the spark source) is known
        const dt = 1 / 60;
        for (let t = 0; t < at; t += dt) { step(Math.min(dt, at - t)); if (sparks.length || puffs.length) drawFrame(); }
        fade = 0;
        drawFrame();
        blinkNext = time + 2.4 + rand() * 2.8;   // the blink track lives on if motion resumes
        stats.stillMs = performance.now() - t0;
    }
    function start() {
        if (destroyed || running || reduced || stillMode) return;
        running = true; lastNow = 0;
        if (!rafId) rafId = win.requestAnimationFrame(frame);
    }
    function stop() {
        running = false;
        if (rafId) { win.cancelAnimationFrame(rafId); rafId = 0; }
    }
    function sync() {
        const active = inView && doc.visibilityState !== 'hidden';
        if (active) start(); else stop();
    }

    /* selection */
    function select(i, byUser) {
        i = ((i % stages.length) + stages.length) % stages.length;
        if (byUser) {
            onInteract('scrub');
            userPauseUntil = performance.now() + USER_PAUSE;
            panel.setAttribute('aria-live', 'polite');   // a visitor's own scrub is announced, number and caption together
        }
        if (i === index && !cut) { if (byUser) tabEls[i].focus(); return; }
        markTabs(i);
        if (reduced || stillMode || !running) {
            cut = null; fade = 0; swap(i);
            if (stillMode || reduced) renderStill(); else drawFrame();
        } else {
            cut = { phase: 'out', t: 0, outDur: SCRUB_OUT, inDur: SCRUB_IN, next: i };
        }
        if (byUser) tabEls[i].focus();
    }

    // listeners
    const onTabClick = e => { const b = e.currentTarget; select(parseInt(b.dataset.index, 10), true); };
    const onTabKey = e => {
        const i = parseInt(e.currentTarget.dataset.index, 10);
        let to = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') to = i + 1;
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') to = i - 1;
        else if (e.key === 'Home') to = 0;
        else if (e.key === 'End') to = stages.length - 1;
        else if (e.key === 'Enter' || e.key === ' ') to = i;
        if (to === null) return;
        e.preventDefault();
        select(to, true);
    };
    tabEls.forEach(b => { b.addEventListener('click', onTabClick); b.addEventListener('keydown', onTabKey); });
    const onEnter = e => { if (e.pointerType !== 'touch') hovered = true; };
    const onLeave = () => { hovered = false; };
    // focus holds autoplay only when it came from the keyboard; a mouse click gets the 25 s pause like any scrub
    const onKeyAny = () => { keyboardLast = true; };
    const onPointerAny = () => { keyboardLast = false; };
    const onFocusIn = e => {
        let fv = keyboardLast;
        try { fv = e.target.matches(':focus-visible'); } catch (_) { /* older engines: the last input kind decides */ }
        focused = fv;
    };
    const onFocusOut = e => { if (!fig.contains(e.relatedTarget)) focused = false; };
    fig.addEventListener('pointerenter', onEnter); fig.addEventListener('pointerleave', onLeave);
    fig.addEventListener('keydown', onKeyAny, true); fig.addEventListener('pointerdown', onPointerAny, true);
    fig.addEventListener('focusin', onFocusIn); fig.addEventListener('focusout', onFocusOut);
    const onVis = () => sync();
    doc.addEventListener('visibilitychange', onVis);
    const onMq = () => {
        reduced = !!(mq && mq.matches);
        if (reduced) { stop(); cut = null; fade = 0; sparks.length = 0; rings.length = 0; puffs.length = 0; renderStill(); }
        else { blinkNext = time + 2.4 + rand() * 2.8; sync(); if (!running) drawFrame(); }
    };
    if (mq) { if (mq.addEventListener) mq.addEventListener('change', onMq); else if (mq.addListener) mq.addListener(onMq); }
    // a devicePixelRatio change with no layout change (a move between displays) re-rasters too
    let dprMq = null;
    const onDpr = () => { armDpr(); resize(); };
    function armDpr() {
        if (!win.matchMedia) return;
        if (dprMq) { if (dprMq.removeEventListener) dprMq.removeEventListener('change', onDpr); else if (dprMq.removeListener) dprMq.removeListener(onDpr); }
        dprMq = win.matchMedia('(resolution: ' + (win.devicePixelRatio || 1) + 'dppx)');
        if (dprMq.addEventListener) dprMq.addEventListener('change', onDpr); else if (dprMq.addListener) dprMq.addListener(onDpr);
    }
    armDpr();
    let io = null;
    if (typeof win.IntersectionObserver === 'function') {
        io = new win.IntersectionObserver(entries => { for (const en of entries) inView = en.isIntersecting; sync(); }, { threshold: 0.05 });
        io.observe(stageEl);
    }
    let ro = null;
    const onWinResize = () => resize();
    if (typeof win.ResizeObserver === 'function') { ro = new win.ResizeObserver(() => resize()); ro.observe(stageEl); }
    else win.addEventListener('resize', onWinResize);

    // first paint
    swap(index);
    resize();
    if (reduced || stillMode) renderStill(); else sync();

    const api = {
        destroy() {
            if (destroyed) return;
            destroyed = true;
            stop();
            if (io) io.disconnect();
            if (ro) ro.disconnect(); else win.removeEventListener('resize', onWinResize);
            doc.removeEventListener('visibilitychange', onVis);
            if (mq) { if (mq.removeEventListener) mq.removeEventListener('change', onMq); else if (mq.removeListener) mq.removeListener(onMq); }
            if (dprMq) { if (dprMq.removeEventListener) dprMq.removeEventListener('change', onDpr); else if (dprMq.removeListener) dprMq.removeListener(onDpr); dprMq = null; }
            fig.removeEventListener('pointerenter', onEnter); fig.removeEventListener('pointerleave', onLeave);
            fig.removeEventListener('keydown', onKeyAny, true); fig.removeEventListener('pointerdown', onPointerAny, true);
            fig.removeEventListener('focusin', onFocusIn); fig.removeEventListener('focusout', onFocusOut);
            tabEls.forEach(b => { b.removeEventListener('click', onTabClick); b.removeEventListener('keydown', onTabKey); });
            fig.remove();   // only this instance's figure, never whatever else the container holds
        },
        goTo(i) { select(i, false); },
        play() { playing = true; },
        pause() { playing = false; },
        stats() {
            return { frames: stats.frames, avgMs: stats.frames ? stats.total / stats.frames : 0, maxMs: stats.max,
                rebuildMs: stats.rebuildMs || 0, stillMs: stats.stillMs || 0, reduced, running, pass };
        },
        get index() { return index; },
        stages,
    };
    return api;
}
