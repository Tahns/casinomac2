// mambo_compat.mjs - drop-in adapter for the existing frontend_mambo mascot hook (createMascot / setPose / say).
// The old mascot (src/render/mascot.js) exposes POSES idle, think, happy, bigwin, shock, plunger, shrug, dance, celebrate.
// This adapter maps those names onto the new rig's procedural clips, so src/render/index.js can switch module with one import.
//
//   import { createMascot } from './mambo_compat.mjs';
//   const m = createMascot(document.getElementById('mascot-slot'), { size: 360, bubble: 'right' });
//   m.setPose('bigwin'); m.say('BIG WIN!', 2200); m.heroine.setLook('grid'); m.destroy();
//
// Nothing here touches the DOM outside `hostEl`. Text goes through textContent only.
import { createHeroine } from './mambo_rig.mjs';

const POSE_TO_CLIP = {
  idle: null, think: 'spinStart', happy: 'winSmall', bigwin: 'winBig', celebrate: 'megaWin', shock: 'shock', shrug: 'lose',
  plunger: 'freeSpinStart', dance: 'laugh',
};
export const COMPAT_POSES = Object.keys(POSE_TO_CLIP);

export function createMascot(hostEl, opts = {}) {
  hostEl.style.position = hostEl.style.position || 'relative';
  const wrap = document.createElement('div');
  wrap.className = 'mambo-wrap';
  wrap.style.cssText = 'position:relative;width:100%;height:100%;display:flex;align-items:flex-end;justify-content:flex-start;pointer-events:none';
  const stage = document.createElement('div');
  stage.style.cssText = `position:relative;height:${opts.size ? opts.size + 'px' : '100%'};aspect-ratio:2/3;overflow:visible`;
  wrap.appendChild(stage); hostEl.appendChild(wrap);
  const heroine = createHeroine(stage, { outfit: opts.outfit || 'inspectrice', reduced: opts.reduced, lookTargets: opts.lookTargets || {}, onCue: opts.onCue });
  let current = 'idle', bubble = null, bubbleTimer = 0;
  function setPose(name, holdMs) {
    const n = POSE_TO_CLIP[name] === undefined ? 'idle' : name; current = n;
    const clip = POSE_TO_CLIP[n];
    if (!clip) heroine.stop(true); else heroine.play(clip);
  }
  function hideSay() { if (bubble) { bubble.remove(); bubble = null; } clearTimeout(bubbleTimer); }
  function say(text, ms = 2200) {
    hideSay();
    bubble = document.createElement('div'); bubble.className = 'mambo-bubble';
    bubble.textContent = String(text);
    const side = opts.bubble === 'left' ? 'right' : 'left';
    bubble.style.cssText = `position:absolute;${side}:${opts.bubble === 'top' ? '10%' : '78%'};top:${opts.bubble === 'top' ? '-4%' : '8%'};max-width:46vw;padding:6px 10px;background:#F4E8C8;color:#2B1A12;border:3px solid #2B1A12;border-radius:12px;font:700 clamp(10px,1.6vw,15px) "Trebuchet MS",Arial,sans-serif;box-shadow:3px 3px 0 #2B1A12;z-index:4`;
    stage.appendChild(bubble); bubbleTimer = setTimeout(hideSay, ms);
  }
  function destroy() { hideSay(); heroine.destroy(); wrap.remove(); }
  return { setPose, getPose: () => current, say, hideSay, destroy, heroine, wrap };
}
export const POSES = COMPAT_POSES;
