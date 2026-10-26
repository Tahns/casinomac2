// MISSION METER: global multiplier meter (vibraphone ladder + starburst badge). Free spins only.
// createMeter(hostEl, ctx) -> { set(value,{animate,from}), pulse(), max(), show(bool), destroy() }
// hostEl: position:relative element with the same box as the symbol grid. ctx (all optional):
//   { audio, reduced, t(key), cap (MAX threshold, default none), bars (default 20), layout ('ladder'|'strip'|'badge' to force) }
const NS = 'http://www.w3.org/2000/svg';
let cssDone = false;
function ensureCss() {
  if (cssDone || typeof document === 'undefined') return;
  cssDone = true;
  try {
    if (document.querySelector('link[data-meter-css]')) return;
    const l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = new URL('./meter.css', import.meta.url).href; l.setAttribute('data-meter-css', '1');
    document.head.appendChild(l);
  } catch (e) { /* optional */ }
}
const tierOf = (v) => (v >= 50 ? 4 : v >= 20 ? 3 : v >= 10 ? 2 : v >= 5 ? 1 : 0);

export function createMeter(hostEl, ctx = {}) {
  ensureCss();
  const reduced = !!ctx.reduced || (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const tr = (k, d) => { try { const v = ctx.t ? ctx.t(k) : ''; return v && v !== k ? v : d; } catch (e) { return d; } };
  const NB = Math.max(4, ctx.bars | 0 || 20);
  const root = document.createElement('div');
  root.className = 'mm'; root.hidden = true; root.setAttribute('role', 'img');
  const badge = document.createElement('div'); badge.className = 'mm-badge';
  const sv = document.createElementNS(NS, 'svg'); sv.setAttribute('class', 'mm-burst'); sv.setAttribute('viewBox', '-50 -50 100 100');
  const pts = (r, i0, n = 12) => { let d = ''; for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * Math.PI * 2; const rr = i % 2 ? r * i0 : r; d += `${(Math.cos(a) * rr).toFixed(1)},${(Math.sin(a) * rr).toFixed(1)} `; } return d.trim(); };
  const mk = (tag, a) => { const e = document.createElementNS(NS, tag); for (const k in a) e.setAttribute(k, a[k]); sv.appendChild(e); return e; };
  mk('circle', { class: 'mm-ring', cx: 0, cy: 0, r: 52 });
  mk('polygon', { class: 'mm-burst-out', points: pts(50, .72) });
  mk('polygon', { class: 'mm-burst-fill', points: pts(44, .74) });
  mk('polygon', { class: 'mm-burst-hue', points: pts(35, .8), opacity: '.35' });
  badge.appendChild(sv);
  const digits = document.createElement('div'); digits.className = 'mm-digits'; badge.appendChild(digits);
  const kept = document.createElement('div'); kept.className = 'mm-kept'; kept.textContent = tr('meter.kept', 'KEPT'); badge.appendChild(kept);
  const bars = document.createElement('div'); bars.className = 'mm-bars';
  const barEls = [];
  for (let i = 0; i < NB; i++) { const b = document.createElement('div'); b.className = 'mm-bar'; b.style.setProperty('--k', (i / (NB - 1)).toFixed(3)); bars.appendChild(b); barEls.push(b); }
  const thin = document.createElement('div'); thin.className = 'mm-thin';
  const thinFill = document.createElement('div'); thinFill.className = 'mm-thin-fill'; thin.appendChild(thinFill);
  root.append(badge, bars, thin);
  hostEl.appendChild(root);

  let value = 1, isMax = false, timers = [];
  const later = (fn, ms) => { const id = setTimeout(fn, ms); timers.push(id); return id; };

  // layout: ladder (desktop) | strip (portrait) | badge (400x225-class heights)
  const mqTiny = matchMedia('(max-height: 300px)'), mqPort = matchMedia('(max-aspect-ratio: 11/10)');
  function layout() {
    root.dataset.layout = ctx.layout || (mqTiny.matches ? 'badge' : mqPort.matches ? 'strip' : 'ladder');
    try { // desktop badge scales with the ladder column
      if (root.dataset.layout === 'ladder') { const w = hostEl.clientHeight; root.style.setProperty('--bs', Math.round(Math.min(58, Math.max(40, w * .11))) + 'px'); } else root.style.removeProperty('--bs');
    } catch (e) { /* ignore */ }
  }
  layout();
  const onMq = () => layout();
  [mqTiny, mqPort].forEach((m) => { if (m.addEventListener) m.addEventListener('change', onMq); else if (m.addListener) m.addListener(onMq); });
  let ro = null; try { ro = new ResizeObserver(() => layout()); ro.observe(hostEl); } catch (e) { /* ignore */ }

  function paint(v) {
    value = v;
    const start = Math.max(1, v - NB + 1);              // beyond NB levels the ladder scrolls
    root.dataset.tier = String(tierOf(v));
    barEls.forEach((b, i) => {
      const lvl = start + i;
      b.classList.toggle('lit', lvl <= v); b.classList.toggle('cur', lvl === v);
      b.dataset.level = String(lvl);
    });
    digits.innerHTML = isMax ? tr('meter.max', 'MAX') : `<small>x</small>${v}`;
    thinFill.style.width = Math.min(100, v / NB * 100) + '%';
    root.setAttribute('aria-label', `${tr('meter.title', 'Mission Meter')} x${v}${isMax ? ' MAX' : ''}`);
  }
  const play = (n, o) => { try { if (ctx.audio && typeof ctx.audio.play === 'function') ctx.audio.play(n, o); } catch (e) { /* ignore */ } };
  const restart = (el, cls, ms) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); later(() => el.classList.remove(cls), ms); };

  function flyChip(from) {
    if (reduced || !from || typeof from.x !== 'number') return;
    try {
      const hr = hostEl.getBoundingClientRect(), br = badge.getBoundingClientRect();
      const chip = document.createElement('div'); chip.className = 'mm-chip'; chip.textContent = '+1';
      root.appendChild(chip);
      const rr = root.getBoundingClientRect();
      const x0 = from.x - rr.left, y0 = from.y - rr.top, x1 = br.left - rr.left + br.width / 2, y1 = br.top - rr.top + br.height / 2;
      void hr;
      chip.style.left = '0px'; chip.style.top = '0px';
      const a = chip.animate([{ transform: `translate(${x0}px,${y0}px) scale(1)`, opacity: 1 }, { transform: `translate(${(x0 + x1) / 2}px,${Math.min(y0, y1) - 16}px) scale(1.2)`, opacity: 1, offset: .5 }, { transform: `translate(${x1}px,${y1}px) scale(.6)`, opacity: 0 }], { duration: 520, easing: 'steps(8,end)', fill: 'forwards' });
      a.finished.then(() => chip.remove(), () => chip.remove());
    } catch (e) { /* ignore */ }
  }

  const api = {
    // value: integer multiplier; opts.animate plays the growth animation; opts.from {x,y} (client px) = cluster the +1 chip flies from
    set(v, opts = {}) {
      v = Math.max(1, Math.round(Number(v) || 1));
      const grew = v > value;
      if (v !== value || opts.force) isMax = isMax && v >= value;
      paint(v);
      if (opts.animate && grew && !reduced) {
        const cur = barEls.find((b) => b.classList.contains('cur'));
        if (cur) restart(cur, 'pop', 280);
        restart(digits, 'mm-flip', 130);
        restart(root, 'mm-flash', 320);
        flyChip(opts.from);
      }
      if (opts.animate && grew) play('meter', { level: v, note: v % 10, octave: Math.floor(v / 10) });
      return api;
    },
    pulse() { // free spin carry-over: badge pulses with a KEPT tag
      if (!reduced) { root.classList.remove('mm-pulse'); void root.offsetWidth; root.classList.add('mm-pulse'); later(() => root.classList.remove('mm-pulse'), 1600); }
      kept.classList.remove('on'); void kept.offsetWidth; kept.classList.add('on');
      return api;
    },
    max() { isMax = true; paint(value); restart(root, 'mm-flash', 320); play('meter', { level: value, max: true }); return api; },
    show(on = true) { root.hidden = !on; if (on) layout(); return api; },
    reset() { isMax = false; paint(1); return api; },
    get value() { return value; },
    el: root,
    destroy() {
      timers.forEach(clearTimeout); timers = [];
      [mqTiny, mqPort].forEach((m) => { if (m.removeEventListener) m.removeEventListener('change', onMq); else if (m.removeListener) m.removeListener(onMq); });
      try { if (ro) ro.disconnect(); } catch (e) { /* ignore */ }
      root.remove();
    },
  };
  paint(1);
  return api;
}
export default createMeter;
