// AGENT MAMBO - 1962 jazz-lounge city drawn procedurally with FLAT cut-paper shapes (no gradients-as-light, no AI art).
// Base group  : sky + pale-lemon crescent + far/near skyline with lemon windows and a coral CLUB sign, rooftop (parapet, water tower,
//               turning radar dish), atomic-age sparkles, venetian-blind light bands drifting 6 px/s, foreground silhouettes, satellite.
// Lair group  : free spins = SECRET LAIR (riveted teal round room, map screen, radar sweep wedge, coral alarm lamps, coral blinds),
//               revealed by an iris wipe (CSS clip-path circle) when body.fs-mode is toggled.
// Palette     : CSS custom properties read at draw time, with built-in defaults (DESIGN 4.1).
//   base  tokens: --mb-sky --mb-sky2 --mb-far --mb-near --mb-dark --mb-window --mb-moon --mb-lilac --mb-lemon --mb-cream --mb-coral --mb-blind
//   lair  tokens: --mb-fs-bg --mb-fs-wall --mb-fs-ring --mb-fs-seam --mb-fs-rivet --mb-fs-dark --mb-fs-screen --mb-fs-lamp --mb-fs-blind --mb-fs-wedge
import { motion } from './motion.js';
import { quality } from './quality.js';
const TAU = Math.PI * 2;

const BASE = {
  sky: '#181640', sky2: '#1E1C52', far: '#23225E', near: '#2B2A6B', dark: '#14102B', window: '#FFD23F', moon: '#FFF0B0',
  lilac: '#9A7BD0', lemon: '#FFD23F', cream: '#FBF1D9', coral: '#F0472F', flamingo: '#F5799F', blind: '#FBF1D9', steel: '#6FA7D9',
};
const LAIR = {
  bg: '#0A2A38', wall: '#117079', ring: '#1FB5A3', seam: '#0C525C', rivet: '#FFD23F', dark: '#14102B', screen: '#0B1E2B',
  lamp: '#F0472F', blind: '#F0472F', wedge: '#1FB5A3', cream: '#FBF1D9', lemon: '#FFD23F',
};

// Per-mission free-spins palettes (WP6_to_WP5, applied by WP10): keyed on <html data-mission> (set by WP6 under the dossier wipe);
// the lair stays the default (Briefing and any unknown mission). Closed-palette colours only.
const MISSION_FS = {
  briefing: LAIR,                                                    // the secret lair (teal round room)
  orders: { ...LAIR, bg: '#3B1F52', wall: '#9A7BD0', ring: '#E8A92B', seam: '#14102B', lamp: '#F08A2B', blind: '#E8A92B', wedge: '#E8A92B' },  // hat-check room: aubergine and brass
  blackout: { ...LAIR, bg: '#14102B', wall: '#2B2A6B', ring: '#9A7BD0', seam: '#1D1B4F', lamp: '#FBF1D9', blind: '#9A7BD0', wedge: '#FBF1D9' },  // ballroom in the dark: ink, indigo, cream spot
};
const missionFs = () => { try { return MISSION_FS[document.documentElement.dataset.mission] || LAIR; } catch (e) { return LAIR; } };

function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function pal(host, prefix, def) {
  const cs = getComputedStyle(host); const o = {};
  for (const k of Object.keys(def)) o[k] = (cs.getPropertyValue(`--mb-${prefix}${k}`) || '').trim() || def[k];
  return o;
}

// ---------- shapes ----------
function blob(ctx, cx, cy, rx, ry, r, n = 7, jit = .28, rot = 0) {
  const pts = [];
  for (let i = 0; i < n; i++) { const a = rot + (i / n) * TAU, k = 1 + (r() - .5) * 2 * jit; pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const m0 = mid(pts[n - 1], pts[0]);
  ctx.beginPath(); ctx.moveTo(m0[0], m0[1]);
  for (let i = 0; i < n; i++) { const m = mid(pts[i], pts[(i + 1) % n]); ctx.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]); }
  ctx.closePath();
}

// kind 0 = four-point star, 1 = boomerang, 2 = amoeba blob, 3 = diamond
function sparkle(ctx, x, y, s, color, kind, rot = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.fillStyle = color; ctx.beginPath();
  if (kind === 0) {
    ctx.moveTo(0, -s); ctx.quadraticCurveTo(0, 0, s, 0); ctx.quadraticCurveTo(0, 0, 0, s); ctx.quadraticCurveTo(0, 0, -s, 0); ctx.quadraticCurveTo(0, 0, 0, -s);
  } else if (kind === 1) {
    ctx.moveTo(-s, -s * .25); ctx.quadraticCurveTo(0, s * .75, s, -s * .25); ctx.quadraticCurveTo(s * .15, s * .12, -s, -s * .25);
  } else if (kind === 2) {
    ctx.moveTo(-s * .9, 0); ctx.bezierCurveTo(-s * .8, -s * .8, -s * .1, -s * .6, s * .2, -s * .5); ctx.bezierCurveTo(s * .9, -s * .4, s * 1.0, s * .3, s * .4, s * .6);
    ctx.bezierCurveTo(-s * .1, s * .8, -s * .3, s * .3, -s * .9, 0);
  } else {
    ctx.moveTo(0, -s); ctx.lineTo(s * .6, 0); ctx.lineTo(0, s); ctx.lineTo(-s * .6, 0);
  }
  ctx.closePath(); ctx.fill(); ctx.restore();
}

function rrect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

// ---------- BASE: sky + skyline + rooftop ----------
function building(ctx, x, bw, top, base, fill, r, p, u, o) {
  const kind = o.kind;
  ctx.fillStyle = fill; ctx.beginPath();
  if (kind === 1) { // stepped
    const sw = bw * .62, sx = x + (bw - sw) / 2, st = top - (base - top) * .22;
    ctx.moveTo(x, base); ctx.lineTo(x, top); ctx.lineTo(sx, top); ctx.lineTo(sx, st); ctx.lineTo(sx + sw, st); ctx.lineTo(sx + sw, top); ctx.lineTo(x + bw, top); ctx.lineTo(x + bw, base);
  } else if (kind === 2) { // mid-century slanted roof
    ctx.moveTo(x, base); ctx.lineTo(x, top + bw * .18); ctx.lineTo(x + bw, top - bw * .12); ctx.lineTo(x + bw, base);
  } else if (kind === 3) { // round dome top
    ctx.moveTo(x, base); ctx.lineTo(x, top + bw * .5); ctx.arc(x + bw / 2, top + bw * .5, bw / 2, Math.PI, 0); ctx.lineTo(x + bw, base);
  } else { ctx.moveTo(x, base); ctx.lineTo(x, top); ctx.lineTo(x + bw, top); ctx.lineTo(x + bw, base); }
  ctx.closePath(); ctx.fill();
  if (o.line) { ctx.lineWidth = o.line * u; ctx.strokeStyle = p.dark; ctx.lineJoin = 'round'; ctx.stroke(); }
  if (kind === 4 || o.antenna) { // antenna with lemon beacon
    const ax = x + bw * (.3 + r() * .4), ah = (base - top) * .18 + 10 * u, ay = top - (kind === 2 ? bw * .05 : 0);
    ctx.strokeStyle = p.dark; ctx.lineWidth = 2.2 * u; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax, ay - ah); ctx.stroke();
    ctx.fillStyle = p.coral; ctx.beginPath(); ctx.arc(ax, ay - ah, 2.6 * u, 0, TAU); ctx.fill();
  }
  // windows
  const ws = o.win; const cw = 12 * u, chh = 15 * u; const cols = Math.max(1, Math.floor((bw - 8 * u) / cw)), rows = Math.floor(((base - top) * .86 - 8 * u) / chh);
  const ox = x + (bw - cols * cw) / 2 + (cw - 5.5 * u) / 2, oy = top + 10 * u + (kind === 3 ? bw * .5 : kind === 2 ? bw * .16 : kind === 1 ? 0 : 0);
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const lit = r() < o.dens;
    ctx.fillStyle = lit ? ws : o.dim; ctx.fillRect(ox + i * cw, oy + j * chh, 5.5 * u, 8 * u);
  }
}

function drawSky(c, w, h, p) {
  const ctx = c.getContext('2d'); const r = rng(7); const u = Math.min(w, h) / 600;
  const portrait = w < h * 1.05;
  ctx.fillStyle = p.sky; ctx.fillRect(0, 0, w, h);
  // flat horizon band (cut paper, not a gradient)
  ctx.fillStyle = p.sky2; ctx.beginPath(); ctx.moveTo(0, h * .46); for (let x = 0; x <= w + 1; x += w / 6) ctx.lineTo(x, h * (.46 + (r() - .5) * .03)); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fill();
  // pale-lemon crescent (offset circle cut-out), top right, with a thin misregistered ink outline
  const mr = Math.min(w, h) * (portrait ? .1 : .085), mx = w * .8, my = h * (portrait ? .12 : .14);
  ctx.save(); ctx.beginPath(); ctx.arc(mx, my, mr, 0, TAU); ctx.clip();
  ctx.fillStyle = p.moon; ctx.fillRect(mx - mr, my - mr, mr * 2, mr * 2);
  ctx.fillStyle = p.sky; ctx.beginPath(); ctx.arc(mx - mr * .42, my - mr * .1, mr * .86, 0, TAU); ctx.fill(); ctx.restore();

  // skyline: far row (muted indigo) and near row (midnight indigo with ink outline)
  const baseY = h * .945; const maxH = h * (portrait ? .36 : .42);
  let club = null;
  const row = (seed, fill, hmin, hmax, wmin, wmax, line, dens, winCol, dim, antennaP, wantClub) => {
    const rr = rng(seed); let x = -wmax * .3; let i = 0;
    while (x < w) {
      const bw = (wmin + rr() * (wmax - wmin)) * w; const th = (hmin + rr() * (hmax - hmin)) * maxH;
      const kind = [0, 1, 2, 3, 0, 1, 4][Math.floor(rr() * 7)];
      const top = baseY - th;
      building(ctx, x, bw, top, baseY + 4, fill, rr, p, u, { kind, line, dens, win: winCol, dim, antenna: rr() < antennaP });
      if (wantClub && !club && x > w * .62 && bw > w * .07 && kind !== 3) club = { x: x + bw / 2, y: top, bw };
      x += bw + (line ? 1.5 * u : 0); i++;
    }
  };
  row(21, p.far, .35, .95, .05, .1, 0, .18, 'rgba(255,210,63,.55)', 'rgba(20,16,43,.25)', .35, false);
  row(77, p.near, .22, .75, .06, .12, 2.6, .3, p.window, 'rgba(20,16,43,.35)', .25, true);
  // CLUB neon sign on posts above one near building (blinks in the twinkle loop, geometry published through c._club)
  if (club) {
    const sw = Math.min(club.bw * 1.1, 70 * u * 1.6), sh = sw * .42, sx = club.x - sw / 2, sy = club.y - sh - 12 * u;
    ctx.strokeStyle = p.dark; ctx.lineWidth = 3 * u; ctx.beginPath(); ctx.moveTo(sx + sw * .2, sy + sh); ctx.lineTo(sx + sw * .2, club.y); ctx.moveTo(sx + sw * .8, sy + sh); ctx.lineTo(sx + sw * .8, club.y); ctx.stroke();
    rrect(ctx, sx, sy, sw, sh, sh * .3); ctx.fillStyle = p.coral; ctx.fill(); ctx.lineWidth = 3 * u; ctx.strokeStyle = p.dark; ctx.stroke();
    rrect(ctx, sx + sh * .1, sy + sh * .1, sw - sh * .2, sh - sh * .2, sh * .22); ctx.lineWidth = 1.6 * u; ctx.strokeStyle = p.cream; ctx.stroke();
    ctx.fillStyle = p.cream; ctx.font = `900 ${Math.round(sh * .56)}px 'Arial Black','Futura','Century Gothic',sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('CLUB', sx + sw / 2, sy + sh / 2 + sh * .04, sw - sh * .5);
    c._club = { x: sx, y: sy, w: sw, h: sh };
  } else c._club = null;

  // rooftop: parapet band with coping, ink water tower on the left
  const py = h * .955;
  ctx.fillStyle = p.dark; ctx.fillRect(0, py, w, h - py);
  ctx.fillStyle = p.lilac; ctx.fillRect(0, py - 2.4 * u, w, 2.4 * u);
  ctx.fillStyle = p.dark; ctx.fillRect(0, py - 2.4 * u - 3 * u, w, 3 * u);
  // parapet dentils (cut-paper squares)
  ctx.fillStyle = p.near; for (let x = 6 * u; x < w; x += 22 * u) ctx.fillRect(x, py + 4 * u, 12 * u, 3.2 * u);
  const S = Math.min(w, h) * (portrait ? .2 : .26), tx = w * (portrait ? .1 : .075), ty = py - 3 * u;
  const tw = S * .46, thh = S * .5, legh = S * .5;
  ctx.fillStyle = p.dark; ctx.strokeStyle = p.dark; ctx.lineWidth = 2.6 * u; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(tx - tw * .42, ty); ctx.lineTo(tx - tw * .3, ty - legh); ctx.moveTo(tx + tw * .42, ty); ctx.lineTo(tx + tw * .3, ty - legh); ctx.moveTo(tx, ty); ctx.lineTo(tx, ty - legh); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(tx - tw * .4, ty - legh * .55); ctx.lineTo(tx + tw * .3, ty - legh * .2); ctx.moveTo(tx + tw * .4, ty - legh * .55); ctx.lineTo(tx - tw * .3, ty - legh * .2); ctx.stroke();
  rrect(ctx, tx - tw / 2, ty - legh - thh, tw, thh, tw * .12); ctx.fillStyle = p.dark; ctx.fill();
  ctx.fillStyle = p.near; ctx.fillRect(tx - tw / 2 + 2 * u, ty - legh - thh * .72, tw - 4 * u, 2.4 * u); ctx.fillRect(tx - tw / 2 + 2 * u, ty - legh - thh * .3, tw - 4 * u, 2.4 * u);
  ctx.fillStyle = p.dark; ctx.beginPath(); ctx.moveTo(tx - tw * .58, ty - legh - thh); ctx.lineTo(tx, ty - legh - thh - S * .26); ctx.lineTo(tx + tw * .58, ty - legh - thh); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = p.lilac; ctx.lineWidth = 1.8 * u; ctx.beginPath(); ctx.moveTo(tx - tw * .52, ty - legh - thh - 1.5 * u); ctx.lineTo(tx, ty - legh - thh - S * .26 + 1 * u); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(tx - tw / 2 + 3 * u, ty - legh - thh + 4 * u); ctx.lineTo(tx - tw / 2 + 3 * u, ty - legh - 4 * u); ctx.moveTo(tx - tw * .4, ty - legh + 1.5 * u); ctx.lineTo(tx - tw * .3, ty - 6 * u); ctx.stroke();
}

// ---------- BASE: mid layer (static sparkles) ----------
function drawSparkles(c, w, h, p) {
  const ctx = c.getContext('2d'); ctx.clearRect(0, 0, w, h);
  const r = rng(99); const u = Math.min(w, h) / 600;
  for (let i = 0; i < 18; i++) {
    const edge = r() < .65; const x = edge ? (r() < .5 ? w * r() * .22 : w * (.78 + r() * .22)) : w * r(), y = h * (.04 + r() * .6);
    const kind = i % 3; const col = i % 4 === 0 ? p.lemon : i % 4 === 1 ? p.lilac : i % 4 === 2 ? p.cream : p.flamingo;
    ctx.globalAlpha = .55; sparkle(ctx, x, y, (kind === 2 ? 9 : 7 + r() * 7) * u * 1.4, col, kind, kind === 0 ? 0 : r() * TAU);
  }
  ctx.globalAlpha = 1;
}

// ---------- BASE: venetian-blind light shafts: 8 diagonal bands ----------
function drawBlinds(c, w, h, color) {
  const ctx = c.getContext('2d'); ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = color; const skew = h * .55, bw = w * .045, gap = w * .125, x0 = w * .06;
  for (let i = 0; i < 8; i++) {
    const x = x0 + i * gap;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + bw, 0); ctx.lineTo(x + bw - skew, h); ctx.lineTo(x - skew, h); ctx.closePath(); ctx.fill();
  }
}

// ---------- BASE: foreground cut-paper silhouettes (palm leaf left, bongo stack right) ----------
function drawFore(c, w, h, p) {
  const ctx = c.getContext('2d'); ctx.clearRect(0, 0, w, h);
  const u = Math.min(w, h) / 600; const S = Math.min(w, h) * .34; const dk = p.dark;
  ctx.fillStyle = dk; ctx.strokeStyle = dk; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  // palm leaf: curved blades fanning from the bottom-left corner
  const px = -S * .06, py = h + S * .06;
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI * .5 + (i - 3) * .27 + .5; const L = S * (1.05 + (i % 2) * .26 - Math.abs(i - 3) * .07);
    const ex = px + Math.cos(a) * L, ey = py + Math.sin(a) * L; const nx = -Math.sin(a), ny = Math.cos(a);
    const bend = (i - 3) * .06 * L, mx = (px + ex) / 2 + nx * bend - 8 * u, my = (py + ey) / 2 + ny * bend - 4 * u, wd = S * .15;
    ctx.beginPath(); ctx.moveTo(px, py); ctx.quadraticCurveTo(mx + nx * wd, my + ny * wd, ex, ey); ctx.quadraticCurveTo(mx - nx * wd, my - ny * wd, px, py); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = p.near; ctx.lineWidth = 1.6 * u; ctx.beginPath(); ctx.moveTo(px + Math.cos(a) * 8 * u, py + Math.sin(a) * 8 * u); ctx.quadraticCurveTo(mx, my, ex - Math.cos(a) * 4 * u, ey - Math.sin(a) * 4 * u); ctx.stroke();
    ctx.strokeStyle = dk;
  }
  // bongo stack: two drums on a stand, bottom-right
  const bx = w - S * .5, by = h + 2 * u, dw = S * .34, dh = S * .5;
  const drum = (x, y, tw2, bw2, hh, col) => {
    ctx.beginPath(); ctx.moveTo(x - bw2 / 2, y); ctx.lineTo(x - tw2 / 2, y - hh); ctx.lineTo(x + tw2 / 2, y - hh); ctx.lineTo(x + bw2 / 2, y); ctx.closePath(); ctx.fillStyle = dk; ctx.fill();
    ctx.beginPath(); ctx.ellipse(x, y - hh, tw2 / 2, tw2 * .16, 0, 0, TAU); ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 2 * u; ctx.strokeStyle = dk; ctx.stroke();
    ctx.fillStyle = p.near; ctx.fillRect(x - (tw2 + bw2) / 4 + 2 * u, y - hh * .5, (tw2 + bw2) / 2 - 4 * u, 2.4 * u);
  };
  ctx.fillStyle = dk; ctx.fillRect(bx - dw * .9, by - S * .06, dw * 1.8, S * .06);
  drum(bx - dw * .52, by - S * .06, dw * .86, dw * .62, dh * .75, p.near);
  drum(bx + dw * .52, by - S * .06, dw * .72, dw * .52, dh * .62, p.near);
  drum(bx, by - S * .06 - dh * .1, dw * .0001, dw * .0001, 1, dk);
}

// ---------- LAIR ----------
function drawLairBg(c, w, h, p) {
  const ctx = c.getContext('2d'); const u = Math.min(w, h) / 600; const r = rng(5);
  ctx.fillStyle = p.bg; ctx.fillRect(0, 0, w, h);
  const cx = w / 2, cy = h * .47, R0 = Math.hypot(w, h) * .56;
  // round room: wall disc, rings, radial panel seams, rivets
  ctx.beginPath(); ctx.arc(cx, cy, R0 * .98, 0, TAU); ctx.fillStyle = p.wall; ctx.fill();
  ctx.lineWidth = 5 * u; ctx.strokeStyle = p.dark; ctx.stroke();
  for (const [k, wd] of [[.78, 9], [.58, 7], [.38, 5]]) {
    ctx.beginPath(); ctx.arc(cx, cy, R0 * k, 0, TAU); ctx.lineWidth = wd * u; ctx.strokeStyle = p.ring; ctx.stroke();
    ctx.lineWidth = 2.6 * u; ctx.strokeStyle = p.dark; ctx.beginPath(); ctx.arc(cx, cy, R0 * k + wd * u * .5 + 1.3 * u, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(cx, cy, R0 * k - wd * u * .5 - 1.3 * u, 0, TAU); ctx.stroke();
  }
  ctx.strokeStyle = p.seam; ctx.lineWidth = 7 * u; ctx.lineCap = 'butt';
  for (const [r1, r2, n] of [[.8, .97, 24], [.6, .76, 16], [.4, .56, 12]]) for (let i = 0; i < n; i++) { const a = (i / n) * TAU + Math.PI / n; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * R0 * r1, cy + Math.sin(a) * R0 * r1); ctx.lineTo(cx + Math.cos(a) * R0 * r2, cy + Math.sin(a) * R0 * r2); ctx.stroke(); }
  ctx.fillStyle = p.rivet; ctx.strokeStyle = p.dark; ctx.lineWidth = 1.6 * u;
  for (const k of [.78, .58]) for (let i = 0; i < 48; i++) { const a = (i / 48) * TAU, rr = R0 * k + (i % 2 ? 1 : -1) * 0; if (i % 2) continue; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 3.2 * u, 0, TAU); ctx.fill(); ctx.stroke(); }
  // map screen (ink bezel, dark screen, grid, route and blips): placed low-left on portrait, upper-left on wide screens
  const portrait = w < h * 1.05; const mw = Math.min(w * (portrait ? .42 : .26), 200 * u * 1.6), mh = mw * .62, mx = portrait ? w * .08 : w * .07, my = portrait ? h * .62 : h * .3;
  ctx.fillStyle = p.dark; rrect(ctx, mx - 7 * u, my - 7 * u, mw + 14 * u, mh + 14 * u, 12 * u); ctx.fill();
  ctx.fillStyle = p.screen; rrect(ctx, mx, my, mw, mh, 7 * u); ctx.fill();
  ctx.save(); rrect(ctx, mx, my, mw, mh, 7 * u); ctx.clip();
  ctx.strokeStyle = p.ring; ctx.globalAlpha = .45; ctx.lineWidth = 1.4 * u;
  for (let i = 1; i < 8; i++) { ctx.beginPath(); ctx.moveTo(mx + mw * i / 8, my); ctx.lineTo(mx + mw * i / 8, my + mh); ctx.stroke(); }
  for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.moveTo(mx, my + mh * i / 5); ctx.lineTo(mx + mw, my + mh * i / 5); ctx.stroke(); }
  ctx.globalAlpha = 1; ctx.strokeStyle = p.lamp; ctx.lineWidth = 2.4 * u; ctx.setLineDash([6 * u, 5 * u]); ctx.beginPath(); ctx.moveTo(mx + mw * .08, my + mh * .8); ctx.quadraticCurveTo(mx + mw * .4, my + mh * .1, mx + mw * .62, my + mh * .55); ctx.lineTo(mx + mw * .9, my + mh * .25); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = p.lemon; for (const [a, b] of [[.08, .8], [.62, .55], [.9, .25]]) { ctx.beginPath(); ctx.arc(mx + mw * a, my + mh * b, 3.6 * u, 0, TAU); ctx.fill(); }
  ctx.restore();
  ctx.fillStyle = p.rivet; for (const [a, b] of [[-3.5, -3.5], [mw + 3.5, -3.5], [-3.5, mh + 3.5], [mw + 3.5, mh + 3.5]]) { ctx.beginPath(); ctx.arc(mx + a * u, my + b * u, 2.4 * u, 0, TAU); ctx.fill(); }
  // floor grate band
  const fy = h * .93; ctx.fillStyle = p.dark; ctx.fillRect(0, fy, w, h - fy);
  ctx.fillStyle = p.seam; for (let x = 0; x < w; x += 16 * u) ctx.fillRect(x + 3 * u, fy + 6 * u, 9 * u, 3 * u);
  ctx.fillStyle = p.ring; ctx.fillRect(0, fy - 2.4 * u, w, 2.4 * u);
  // ceiling pipe with flanges
  const pyy = h * .012, ph = Math.max(10 * u, h * .028);
  ctx.fillStyle = p.dark; ctx.fillRect(0, pyy - 2 * u, w, ph + 4 * u); ctx.fillStyle = p.seam; ctx.fillRect(0, pyy, w, ph);
  ctx.fillStyle = p.ring; ctx.fillRect(0, pyy + ph * .18, w, 2.2 * u);
  ctx.fillStyle = p.dark; for (let x = w * .12; x < w; x += w * .24) ctx.fillRect(x - 5 * u, pyy - 4 * u, 10 * u, ph + 8 * u);
  ctx.fillStyle = p.rivet; for (let x = w * .12; x < w; x += w * .24) { ctx.beginPath(); ctx.arc(x, pyy + ph / 2, 2 * u, 0, TAU); ctx.fill(); }
}

function drawWedge(c, s, p) {
  const ctx = c.getContext('2d'); ctx.clearRect(0, 0, s, s);
  ctx.fillStyle = p.wedge; ctx.globalAlpha = 1; ctx.beginPath(); ctx.moveTo(s / 2, s / 2); ctx.arc(s / 2, s / 2, s / 2, -Math.PI * .5, -Math.PI * .5 + .62); ctx.closePath(); ctx.fill();
}

const LAMP = (cls) => `<div class="mbs-lamp ${cls}"><svg viewBox="0 0 60 70" aria-hidden="true"><path d="M8 66V44q0-24 22-24t22 24v22z" fill="#F0472F" stroke="#14102B" stroke-width="4" stroke-linejoin="round"/><path d="M17 62V46q0-14 10-17" fill="none" stroke="#FBF1D9" stroke-width="4" stroke-linecap="round"/><rect x="4" y="62" width="52" height="8" rx="3" fill="#14102B"/><rect x="20" y="8" width="20" height="12" rx="3" fill="#9A7BD0" stroke="#14102B" stroke-width="3"/></svg><i class="beam"></i></div>`;
const SAT = `<svg viewBox="0 0 100 60" aria-hidden="true"><g fill="none" stroke="#FBF1D9" stroke-width="3" stroke-linecap="round"><path d="M50 30L8 8M50 30L6 24M50 30L10 50M50 30L22 58"/></g><circle cx="50" cy="30" r="14" fill="#9A7BD0" stroke="#14102B" stroke-width="4"/><path d="M42 24q6-8 14-3" fill="none" stroke="#FBF1D9" stroke-width="3" stroke-linecap="round"/><circle cx="8" cy="8" r="3" fill="#FFD23F"/><circle cx="6" cy="24" r="3" fill="#FFD23F"/><circle cx="10" cy="50" r="3" fill="#FFD23F"/><circle cx="22" cy="58" r="3" fill="#FFD23F"/></svg>`;
const RADAR = `<svg viewBox="0 0 80 90" aria-hidden="true"><path d="M40 90V52" stroke="#14102B" stroke-width="6" stroke-linecap="round"/><path d="M28 90L40 58L52 90Z" fill="#14102B"/><g class="dish"><path d="M10 40Q40 78 70 40Q40 52 10 40Z" fill="#9A7BD0" stroke="#14102B" stroke-width="4" stroke-linejoin="round"/><path d="M40 47V22" stroke="#14102B" stroke-width="4" stroke-linecap="round"/><circle cx="40" cy="20" r="4.5" fill="#F0472F" stroke="#14102B" stroke-width="2.5"/></g></svg>`;

const CSS = `
#scene{background:#181640}
#scene .mbs-grp{position:absolute;inset:0;overflow:hidden}
#scene .mbs-lair{clip-path:circle(0% at 50% 50%);visibility:hidden}
#scene .lay{position:absolute;inset:-4%}
#scene .lay.mv{will-change:transform}
#scene canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
#scene .mbs-blinds{position:absolute;inset:-12% -12%;opacity:.10;pointer-events:none;animation:mbsblind 60s steps(90,end) infinite alternate}
#scene .mbs-blinds canvas{width:100%;height:100%}
#scene .mbs-lair .mbs-blinds{opacity:.2}
@keyframes mbsblind{from{transform:translateX(0)}to{transform:translateX(360px)}}
#scene .mbs-sat{position:absolute;left:0;top:7%;width:clamp(30px,8vmin,64px);animation:mbssat 40s steps(320,end) infinite;pointer-events:none}
#scene .mbs-sat svg{display:block;width:100%;height:auto;overflow:visible;animation:mbsspin 4s steps(8,end) infinite}
@keyframes mbssat{0%{transform:translate3d(-12vw,0,0)}50%{transform:translate3d(50vw,-3vh,0)}100%{transform:translate3d(112vw,3vh,0)}}
@keyframes mbsspin{to{transform:rotate(360deg)}}
#scene .mbs-radar{position:absolute;left:23%;bottom:3.2%;width:clamp(36px,13vmin,100px);pointer-events:none}
#scene .mbs-radar svg{display:block;width:100%;height:auto;overflow:visible}
#scene .mbs-radar .dish{transform-box:fill-box;transform-origin:50% 100%;animation:mbsdish 4.8s steps(12,end) infinite}
@keyframes mbsdish{0%{transform:scaleX(1)}50%{transform:scaleX(.18)}100%{transform:scaleX(1)}}
#scene .mbs-sweep{position:absolute;left:50%;top:47%;width:150vmax;height:150vmax;margin:-75vmax 0 0 -75vmax;opacity:.16;pointer-events:none;animation:mbssweep 8s steps(32,end) infinite}
#scene .mbs-sweep canvas{width:100%;height:100%}
@keyframes mbssweep{to{transform:rotate(360deg)}}
#scene .mbs-lamp{position:absolute;top:0;width:clamp(26px,8vmin,54px);pointer-events:none}
#scene .mbs-lamp svg{display:block;width:100%;height:auto;overflow:visible}
#scene .mbs-lamp.l{left:9%}#scene .mbs-lamp.r{right:9%}
#scene .mbs-lamp .beam{position:absolute;left:50%;top:60%;width:0;height:0;border-left:clamp(40px,12vmin,100px) solid transparent;border-right:clamp(40px,12vmin,100px) solid transparent;border-top:clamp(40px,12vmin,100px) solid rgba(240,71,47,.2);transform:translateX(-50%);animation:mbsalarm 1.2s steps(1,end) infinite}
#scene .mbs-lamp svg path:first-child{animation:mbsalarmf 1.2s steps(1,end) infinite}
@keyframes mbsalarm{0%{opacity:1}50%{opacity:.15}100%{opacity:1}}
@keyframes mbsalarmf{0%{fill:#F0472F}50%{fill:#9B2A1E}100%{fill:#F0472F}}
html[data-motion="calm"] #scene .mbs-blinds,html[data-motion="calm"] #scene .mbs-sat,html[data-motion="calm"] #scene .mbs-sat svg,html[data-motion="calm"] #scene .mbs-radar .dish,html[data-motion="calm"] #scene .mbs-sweep,
html[data-motion="still"] #scene .mbs-blinds,html[data-motion="still"] #scene .mbs-sat,html[data-motion="still"] #scene .mbs-sat svg,html[data-motion="still"] #scene .mbs-radar .dish,html[data-motion="still"] #scene .mbs-sweep,html[data-motion="still"] #scene .mbs-lamp .beam,html[data-motion="still"] #scene .mbs-lamp svg path:first-child,
html[data-quality="calm"] #scene .mbs-blinds,html[data-quality="calm"] #scene .mbs-sat,html[data-quality="calm"] #scene .mbs-sat svg,html[data-quality="calm"] #scene .mbs-radar .dish,html[data-quality="calm"] #scene .mbs-sweep{animation:none!important}
@media (prefers-reduced-motion:reduce){#scene .mbs-blinds,#scene .mbs-sat,#scene .mbs-sat svg,#scene .mbs-radar .dish,#scene .mbs-sweep,#scene .mbs-lamp .beam,#scene .mbs-lamp svg path:first-child{animation:none!important}}
`;

// v2 (WP5): the blinds and the satellite move in hard steps (1.5 and 8 per second) instead of a continuous compositor slide:
// a full-screen layer that moves every frame forced a full-screen recomposite 60 times a second (half a CPU core in software
// compositing). The parallax layers are promoted (will-change) only while they actually move, and the parallax runs in Full motion
// only (render/motion.js) and not on a device the quality governor has put to Calm. Calm / Still (html[data-motion]) and the
// quality governor (html[data-quality]) switch the decorative loops off.
export function createScene(app) {
  let host = app.querySelector('#scene');
  if (!host) { host = document.createElement('div'); host.id = 'scene'; app.insertBefore(host, app.firstChild); }
  if (host.dataset.built) return host._scene;
  host.dataset.built = '1';
  if (!document.getElementById('mbs-css')) { const st = document.createElement('style'); st.id = 'mbs-css'; st.textContent = CSS; document.head.appendChild(st); }
  host.innerHTML = `
    <div class="mbs-grp mbs-base">
      <div class="lay" data-k=".3"><canvas data-l="sky"></canvas></div>
      <div class="lay" data-k=".5"><canvas data-l="spark"></canvas></div>
      <div class="mbs-sat">${SAT}</div>
      <div class="mbs-radar">${RADAR}</div>
      <div class="mbs-blinds"><canvas data-l="blinds"></canvas></div>
      <div class="lay" data-k="1"><canvas data-l="fore"></canvas></div>
    </div>
    <div class="mbs-grp mbs-lair">
      <div class="lay" data-k=".3"><canvas data-l="lair"></canvas></div>
      <div class="mbs-sweep"><canvas data-l="wedge"></canvas></div>
      <div class="mbs-blinds"><canvas data-l="lblinds"></canvas></div>
      ${LAMP('l')}${LAMP('r')}
    </div>
    <canvas class="dustc" style="position:absolute;inset:0;width:100%;height:100%"></canvas>`;
  const cv = (k) => host.querySelector(`canvas[data-l="${k}"]`);
  const lairEl = host.querySelector('.mbs-lair');
  let lastW = 0, lastH = 0, timer = 0, P = null, PL = null;

  function draw(force) {
    const rect = host.getBoundingClientRect();
    const W = Math.max(2, Math.round(rect.width)), H = Math.max(2, Math.round(rect.height));
    if (!force && W === lastW && H === lastH) return;
    lastW = W; lastH = H; P = pal(host, '', BASE); PL = pal(host, 'fs-', missionFs());
    const sc = Math.min(window.devicePixelRatio || 1, 1.5);
    const size = (k, f) => { const c = cv(k); c.width = Math.round(W * f * sc); c.height = Math.round(H * f * sc); return c; };
    const run = (name, fn, c, ...a) => { try { fn(c, c.width, c.height, ...a); } catch (e) { console.error('scene', name, e); } };
    run('sky', drawSky, size('sky', 1.08), P); run('spark', drawSparkles, size('spark', 1.08), P);
    run('blinds', (c, w, h) => drawBlinds(c, w, h, P.blind), size('blinds', 1.24));
    run('fore', drawFore, size('fore', 1.08), P);
    run('lair', drawLairBg, size('lair', 1.08), PL);
    run('lblinds', (c, w, h) => drawBlinds(c, w, h, PL.blind), size('lblinds', 1.24));
    const wc = cv('wedge'); const ws = Math.round(Math.min(900, Math.max(W, H) * .75)); wc.width = wc.height = ws; try { drawWedge(wc, ws, PL); } catch (e) { console.error('scene wedge', e); }
    sizeDust(W, H);
  }

  // ---- atomic-age twinkles (limited animation: ~7 fps, hard on/off steps) + CLUB sign flicker + lair embers
  const dust = host.querySelector('.dustc'); const dctx = dust.getContext('2d');
  let DW = 1, DH = 1; const motes = [];
  function sizeDust(W, H) { DW = W; DH = H; dust.width = W; dust.height = H; }
  const r0 = rng(31);
  const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const COLS = ['lemon', 'lilac', 'cream', 'flamingo'];
  for (let i = 0; i < (reduce ? 6 : 18); i++) {
    const edge = r0() < .65;
    motes.push({ x: edge ? (r0() < .5 ? r0() * .22 : .78 + r0() * .22) : r0(), y: .04 + r0() * .6, s: .6 + r0() * .8, ph: r0() * 10, kind: i % 3, col: COLS[i % 4], rot: r0() * TAU });
  }
  let lt = 0, running = true; let sceneLair = false;
  // one setTimeout per 140 ms step (was a rAF loop waking every vsync only to skip 7 frames of 8)
  function loop() {
    if (!running) return;
    setTimeout(loop, 140);
    const now = performance.now();
    if (document.hidden) return;
    lt = now;
    dctx.clearRect(0, 0, DW, DH);
    const u = Math.min(DW, DH) / 600; const pc = (sceneLair ? PL : P) || (P = pal(host, '', BASE));
    for (const m of motes) {
      const t = Math.floor((now / 140 + m.ph * 3)) % 9; // on for 2 of 9 steps
      if (t > 1) continue;
      const col = sceneLair ? (PL ? PL.lemon : '#FFD23F') : pc[m.col] || pc.cream;
      sparkle(dctx, m.x * DW, m.y * DH, (t === 0 ? 7 : 10) * u * 1.5 * m.s, col, m.kind, m.kind === 0 ? 0 : m.rot);
    }
    // CLUB neon flicker: a lemon-cream overlay rim blinking in hard steps, base scene only
    const club = !sceneLair && cv('sky')._club;
    if (club) {
      const k = lastW ? (lastW * 1.08 / (cv('sky').width || 1)) : 1;
      if (Math.floor(now / 700) % 6 !== 5 && Math.floor(now / 140) % 2 === 0) {
        dctx.strokeStyle = '#FBF1D9'; dctx.lineWidth = Math.max(1.4, 2 * u); dctx.globalAlpha = .9;
        const x = club.x * k - lastW * .04, y = club.y * k - lastH * .04, w = club.w * k, h = club.h * k; dctx.beginPath(); dctx.rect(x - 3 * u, y - 3 * u, w + 6 * u, h + 6 * u); dctx.stroke(); dctx.globalAlpha = 1;
      }
    }
  }
  setTimeout(loop, 0);

  // ---- parallax
  const lays = [...host.querySelectorAll('.lay')];
  let tx = 0, ty = 0, cx = 0, cy = 0, pr = 0;
  const parallaxOn = () => { try { return motion.level === 'full' && !quality.calm; } catch (e) { return true; } };
  function par() {
    cx += (tx - cx) * .08; cy += (ty - cy) * .08;
    for (const l of lays) { const k = Number(l.dataset.k || 0); l.style.transform = `translate3d(${(cx * k * -14).toFixed(2)}px,${(cy * k * -9).toFixed(2)}px,0)`; }
    if (Math.abs(tx - cx) > .002 || Math.abs(ty - cy) > .002) pr = requestAnimationFrame(par);
    else { pr = 0; lays.forEach((l) => l.classList.remove('mv')); }
  }
  window.addEventListener('pointermove', (e) => {
    if (!parallaxOn()) { if (tx || ty) { tx = 0; ty = 0; } if (!cx && !cy) return; }
    else { tx = e.clientX / window.innerWidth - .5; ty = e.clientY / window.innerHeight - .5; }
    if (!pr) { lays.forEach((l) => l.classList.add('mv')); pr = requestAnimationFrame(par); }
  }, { passive: true });

  let ro = null;
  const onResize = () => { clearTimeout(timer); timer = setTimeout(draw, 120); };
  if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(onResize); ro.observe(host); } else window.addEventListener('resize', onResize);

  // ---- free spins: iris wipe into the SECRET LAIR (clip-path circle grows from the centre; shrinks back on exit)
  let irisAnim = null;
  function setLair(on, instant) {
    if (on === sceneLair) return;
    sceneLair = on;
    if (irisAnim) { try { irisAnim.cancel(); } catch (e) { /* ignore */ } irisAnim = null; }
    const open = 'circle(150% at 50% 50%)', shut = 'circle(0% at 50% 50%)';
    if (on) lairEl.style.visibility = 'visible';
    if (instant || reduce || !lairEl.animate) { lairEl.style.clipPath = on ? open : shut; if (!on) lairEl.style.visibility = 'hidden'; return; }
    irisAnim = lairEl.animate(on ? [{ clipPath: shut }, { clipPath: open }] : [{ clipPath: open }, { clipPath: shut }], { duration: 750, easing: 'steps(12,end)', fill: 'forwards' });
    irisAnim.onfinish = () => { lairEl.style.clipPath = on ? open : shut; if (!on) lairEl.style.visibility = 'hidden'; try { irisAnim.cancel(); } catch (e) { /* ignore */ } irisAnim = null; };
  }
  const isFs = () => document.body.classList.contains('fs-mode') || app.classList.contains('fs-mode');
  let mo = null;
  if (typeof MutationObserver !== 'undefined') {
    mo = new MutationObserver(() => setLair(isFs(), false));
    mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    mo.observe(app, { attributes: true, attributeFilter: ['class'] });
  }
  // redraw the lair canvases when the mission changes (the palette swap happens while the dossier covers the board)
  let missionNow = document.documentElement.dataset.mission || '';
  if (typeof MutationObserver !== 'undefined') {
    const mm = new MutationObserver(() => { const m = document.documentElement.dataset.mission || ''; if (m === missionNow) return; missionNow = m; lastW = 0; draw(true); });
    mm.observe(document.documentElement, { attributes: true, attributeFilter: ['data-mission'] });
    const prev = mo; mo = { disconnect() { mm.disconnect(); if (prev) prev.disconnect(); } };
  }
  draw(true);
  setLair(isFs(), true);

  const api = {
    host,
    redraw() { lastW = 0; draw(true); },
    setLair(on, instant) { setLair(!!on, !!instant); },
    shakeTargets() { return [host]; },
    destroy() { running = false; if (ro) ro.disconnect(); if (mo) mo.disconnect(); },
  };
  host._scene = api;
  return api;
}
