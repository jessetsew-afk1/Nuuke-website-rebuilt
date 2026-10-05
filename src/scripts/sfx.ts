// NUUKE sound effects for the homepage journey (rocket rumble, whooshes, warp).
// Stub API: the implementation lands here; every call is a safe no-op until then
// and whenever the visitor has sound off.

/** Ignition: engine catches and rumbles up over `seconds`; music ducks underneath. */
export function ignition(_seconds = 2.2): void {}
/** The moment the rocket leaves the pad: a roar that tails off as it climbs. */
export function liftoff(): void {}
/** Continuous engine bed while flying, 0 = idle/silent, 1 = full thrust. Safe to call every frame. */
export function setThrust(_v: number): void {}
/** Soft air whoosh between sections, strength 0..1. */
export function whoosh(_strength = 0.5): void {}
/** Breaking through the cloud layer after lift-off. */
export function cloudPunch(): void {}
/** Warp jump before the finale: riser, then a deep boom on `drop()`. */
export function warp(): void {}
export function warpDrop(): void {}
/** The rocket settles into the logo: low thump and shimmer. */
export function land(): void {}
