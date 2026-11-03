// Mount the hand-drawn heroine rig (docs/research2/art/mambo_rig.mjs) in the Atomic Lounge palette, with the proposed eye design.
// The page must declare this import map BEFORE any module script, so the rig loads the eye-variant art module:
//   <script type="importmap">{"imports":{"/docs/research2/art/mambo_art.mjs":"/docs/v2/art_direction/B_atomic_lounge/eyes/mambo_art_eyes.mjs"}}</script>
// (add ?eyes=old to the page URL to drop the map and see the current eyes for comparison; done in the page itself).
export const LOUNGE_PAL = {
  // inspectrice uniform: navy family -> petrol teal family, so she belongs to the teal stage; trims stay mustard
  navy: '#123B41', navyJ: '#1F5F66', navyLight: '#2E8C8C', navyDeep: '#0C2A2F',
  gold: '#F8D46A', goldDeep: '#C98A1E', lips: '#B8352A', lipsDeep: '#7E1E16',
  eyeshadow: '#F8EDCB',   // was a lemon #EDC45A band on the lid: now the skin tone itself, so a lowered or winking lid reads as skin, not as a yellow visor
  turq: '#2E8C8C',
};
export async function mountHeroine(el, o = {}) {
  globalThis.MAMBO_PAL = LOUNGE_PAL;
  const { createHeroine } = await import('../../../research2/art/mambo_rig.mjs');
  const M = createHeroine(el, { outfit: 'inspectrice', raf: false, idle: false, limited: 0, seed: 7, mirror: !!o.mirror, crop: o.crop || 'full' });
  M.setPose(o.pose || 'idle', { snap: true }); M.setMood(o.mood || 'sly');
  if (o.set) M.set(o.set);
  M.snap(); for (let i = 0; i < 60; i++) M.step(1 / 60);
  return M;
}
