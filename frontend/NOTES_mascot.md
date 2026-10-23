# Old Gus (mascot)
Files: `src/render/mascot.js`, `src/render/mascot.css` (auto-injected by the JS via a <link>; may also be linked in index.html), `mascot-dev.html` (all poses; `?pose=bigwin&size=300&say=HI`), shots `tests/shots/mascot_*.png`.

## API
```js
import { createMascot } from './render/mascot.js';
const gus = createMascot(hostEl, { size: 200, variant: 'auto', bubble: 'top', pose: 'idle' });
gus.setPose('bigwin'); gus.say('BIG WIN!', 2200); gus.hideSay(); gus.getPose(); gus.destroy();
```
- `size` = height in px (width = size*6/7). `variant` full|small|auto (small if size<=140: no halftone/detail, thicker outlines). `bubble` top|left|right.
- `say(text, ms)` uses textContent only; the caller supplies the text. ms=0 keeps it until hideSay().
- Poses: idle, think, happy, bigwin, shock, plunger, shrug, dance, celebrate. Unknown name -> idle. Re-setting the same pose restarts its animation. Looping poses loop until changed; the caller returns to 'idle'.
- Reduced motion: keyframes off, poses stay as static drawings.
- Host element needs overflow visible (stars/bubble/hat toss exceed the box by ~10%).

## Size and mounting
- Full detail from 160 px tall; 100-140 px uses the small variant (still readable: hat, moustache, red overalls).
- Desktop 16:9: stand him in the side gutter beside the grid, bottom-aligned with the reel frame (~30-40% of grid height, bubble 'top' or toward the grid). Plunger pose needs ~20% extra width for the TNT box.
- Portrait: bottom corner above the control bar or beside the logo, 110-130 px, bubble 'left'/'top'.
- 400x225: 80-90 px, bottom-right corner overlapping the frame edge, small variant, bubbles 'left'; skip celebrate burst overlap by letting him hide on spin.
- Pose use: idle at rest, think while spinning, shock on near-miss/feature trigger, happy small win, bigwin/celebrate big wins, plunger for bonus buy/trigger, shrug on loss, dance in free spins.
