# V1.1, Part 2: the sleeve monument

A large translucent Betta sleeve on a display stand at the pit-lane end of
the garage, matching betta-sleeve-render.png: a bent arm, three flattened
pods along the outer face, a cuff. The shell is graphite candy in the iMac
sense (transmission 0.94, roughness 0.12, a smoky attenuation), so the
electronics read faintly inside: a cable harness the length of the arm, a
battery at the shoulder, two IMU modules with a gold LED each at the elbow
and the wrist, the haptic motor at the wrist, three gold pads on the
harness. The stand is a graphite disc and post on a matte plinth with a
baked shadow. It belongs to the Projects stop, so it lifts and opens with
the garage.

Geometry: a tapering low-poly tube (30 rings of 12 sides) swept along a
Catmull-Rom curve with parallel-transported frames, radius 4.0 at the
shoulder to 2.5 at the cuff with a slight elbow. Pods are capsules
flattened against the surface on the side that faces the camera.

Ambient: one slow shimmer, a soft additive band riding the surface from
base to cuff every eight seconds, fading at both ends. Still under reduced
motion. Count: car, flag, shimmer, 3 of 8 (4 with Part 3's flicker).

Measured after Part 2: 60 fps desktop and phone proxy. Internals of every
stop are now folded into one mesh per material (mergeStatic), which took
draw calls from 126 back to 94 with Part 3 included.

Screenshots: part-2/before-1-pits, after-1-pits, before-2-closeup,
after-2-closeup, sidebyside-*.png; part-2.png is the close-up.
