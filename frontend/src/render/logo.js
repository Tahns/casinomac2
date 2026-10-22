// Chiseled gold "THE UNLEASHED MINE" logo drawn as SVG (text + gradients + lighting filter). Two layouts: stacked (landscape side panel) and wide (portrait).
let uid = 0;

function defs(id) {
  return `<defs>
<linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffbe0"/><stop offset=".28" stop-color="#ffe27a"/><stop offset=".5" stop-color="#e8a416"/><stop offset=".58" stop-color="#8a5200"/><stop offset=".66" stop-color="#ffd24a"/><stop offset="1" stop-color="#b86a00"/></linearGradient>
<linearGradient id="${id}s" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<filter id="${id}b" x="-5%" y="-10%" width="110%" height="125%">
 <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4" result="n"/>
 <feDisplacementMap in="SourceGraphic" in2="n" scale="1.6" result="rough"/>
 <feGaussianBlur in="rough" stdDeviation="1.1" result="bl"/>
 <feSpecularLighting in="bl" surfaceScale="3.2" specularConstant="1.2" specularExponent="26" lighting-color="#fff6c8" result="sp"><feDistantLight azimuth="235" elevation="46"/></feSpecularLighting>
 <feComposite in="sp" in2="rough" operator="in" result="spin"/>
 <feComposite in="rough" in2="spin" operator="arithmetic" k1="0" k2="1" k3=".9" k4="0"/>
</filter>
<filter id="${id}d" x="-10%" y="-20%" width="120%" height="150%"><feGaussianBlur stdDeviation="2.2"/></filter>
</defs>`;
}

function line(id, txt, x, y, size, len, extra = '') {
  const a = `x="${x}" y="${y}" text-anchor="middle" font-family="Impact,'Arial Black','Rockwell Extra Bold','DejaVu Serif',Georgia,serif" font-weight="900" font-size="${size}" textLength="${len}" lengthAdjust="spacingAndGlyphs" ${extra}`;
  return { a, txt };
}

function build(variant) {
  const id = 'lg' + (++uid) + variant[0];
  let w, h, lines, extras = '';
  if (variant === 'stack') {
    w = 300; h = 196;
    lines = [line(id, 'THE', 150, 40, 34, 74), line(id, 'UNLEASHED', 150, 108, 70, 288), line(id, 'MINE', 150, 182, 84, 214)];
    extras = `<g fill="#ffd54a" stroke="#6d4300" stroke-width="1.6" stroke-linejoin="round">
      <path d="M55 29l7-8 7 8-7 8z" fill="#ff3b57"/><path d="M231 29l7-8 7 8-7 8z" fill="#3d8bff"/>
      <path d="M78 29H112M188 29H222" stroke="#ffd54a" stroke-width="2.5" stroke-linecap="round"/></g>
      <g transform="translate(24 150) rotate(-35)"><rect x="-3" y="-4" width="6" height="52" rx="2.5" fill="#8a5a2c" stroke="#2c1608" stroke-width="1.4"/><path d="M-22 4Q0 -16 22 4Q0 -4 -22 4Z" fill="#c9d4de" stroke="#1f2a35" stroke-width="1.6"/></g>
      <g transform="translate(276 150) rotate(35)"><rect x="-3" y="-4" width="6" height="52" rx="2.5" fill="#8a5a2c" stroke="#2c1608" stroke-width="1.4"/><path d="M-22 4Q0 -16 22 4Q0 -4 -22 4Z" fill="#c9d4de" stroke="#1f2a35" stroke-width="1.6"/></g>`;
  } else {
    w = 520; h = 86;
    lines = [line(id, 'THE', 62, 34, 26, 60), line(id, 'UNLEASHED', 270, 56, 58, 330), line(id, 'MINE', 270, 82, 24, 110)];
    // wide: "THE UNLEASHED" row then "MINE" smaller below would be tiny; use single-row layout instead
    lines = [line(id, 'THE', 36, 52, 26, 50), line(id, 'UNLEASHED', 212, 60, 60, 258), line(id, 'MINE', 438, 60, 60, 112)];
    extras = `<g fill="#ffd54a" stroke="#6d4300" stroke-width="1.4"><path d="M16 14l6-7 6 7-6 7z" fill="#ff3b57"/><path d="M492 14l6-7 6 7-6 7z" fill="#3d8bff"/></g>`;
  }
  const texts = lines.map((l) => `<text ${l.a}>${l.txt}</text>`);
  const clip = `<clipPath id="${id}c">${texts.join('')}</clipPath>`;
  const body = `
  <g filter="url(#${id}d)" opacity=".75" transform="translate(2 5)">${lines.map((l) => `<text ${l.a} fill="#000" stroke="#000" stroke-width="5">${l.txt}</text>`).join('')}</g>
  <g stroke-linejoin="round">${lines.map((l) => `<text ${l.a} fill="none" stroke="#3a1c00" stroke-width="6.5">${l.txt}</text>`).join('')}</g>
  <g filter="url(#${id}b)">${lines.map((l) => `<text ${l.a} fill="url(#${id}g)" stroke="#fff3b0" stroke-width=".7" stroke-opacity=".6">${l.txt}</text>`).join('')}</g>
  ${extras}
  <g clip-path="url(#${id}c)"><rect x="-80" y="0" width="60" height="${h}" fill="url(#${id}s)" opacity=".8" transform="skewX(-20)"><animate attributeName="x" values="-120;${w + 120}" dur="5.5s" begin="1s;sh${id}.end+3s" id="sh${id}" fill="freeze"/></rect></g>`;
  return `<svg class="${variant === 'stack' ? 'stack' : 'wide'}" viewBox="0 0 ${w} ${h}" role="img" aria-label="The Unleashed Mine" focusable="false">${defs(id)}${clip}${body}</svg>`;
}

export function buildLogo(host) {
  if (!host || host.dataset.logo) return;
  host.dataset.logo = '1';
  host.insertAdjacentHTML('beforeend', build('stack') + build('wide'));
}
