// Rules / info / help screens rendered into #modal-info.
import { t, isSocial, socialize } from './i18n/index.js';

let params = {};
let formatMoney = null;
try { ({ params } = await import('./params.js')); } catch (e) { params = {}; }
try { ({ formatMoney } = await import('./money.js')); } catch (e) { formatMoney = null; }

export const DISCLAIMER =
  'Malfunction voids all wins and plays. A consistent internet connection is required. In the event of a disconnection, reload the game to finish any uncompleted rounds. The expected return is calculated over many plays. The game display is not representative of any physical device and is for illustrative purposes only. Winnings are settled according to the amount received from the Remote Game Server and not from events within the web browser. TM and © 2026 Engine.';

const FALLBACK_DATA = {
  provisional: true, symbols: [], tiers: [], freespinTriggers: [], retrigger: [], modes: [], maxVeinMultiplier: 512, wincap: 5000,
};

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const num = (n) => {
  const v = Number(n);
  if (!Number.isFinite(v)) return '-';
  return String(Math.round(v * 100) / 100);
};
const commas = (n) => Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });
const pct = (r) => (Number.isFinite(Number(r)) ? (Number(r) * 100).toFixed(2) + '%' : '-');

// Tiny inline glyphs (text/colour only, no assets).
const GLYPH = {
  H1: ['#e0245e', '◆'], H2: ['#2f6fe0', '◆'], H3: ['#1fae5b', '◆'], H4: ['#f0b429', '◆'],
  L1: ['#9b59d0', '●'], L2: ['#9aa3ad', '▲'], L3: ['#ffb347', '■'], L4: ['#e8c547', '◗'],
  W: ['#ffd700', '★'], S: ['#e5533d', '✸'],
};
const glyph = (id) => {
  const g = GLYPH[id] || ['#ccc', '●'];
  return `<span class="rl-glyph" style="color:${g[0]}" aria-hidden="true">${g[1]}</span>`;
};

function modeName(name) { return t.mode(name); }

function tierLabel(tier) {
  return tier.min === tier.max ? `${tier.min}` : tier.max >= 30 ? `${tier.min}+` : `${tier.min}-${tier.max}`;
}

export function buildRules(data, ctx = {}) {
  const d = { ...FALLBACK_DATA, ...(data || {}) };
  const social = ctx.social !== undefined ? ctx.social : isSocial();
  const fmt = ctx.formatMoney || formatMoney;
  const currency = ctx.currency !== undefined ? ctx.currency : params && params.currency;
  const bonus = (d.modes || []).find((m) => m.name === 'bonus');
  const unleashCost = bonus ? bonus.cost : 100;
  const wincap = d.wincap || 5000;
  const maxMult = d.maxVeinMultiplier || 512;
  const veinStart = d.veinStart || 1;
  const veinStep = d.veinStep || 1;
  const tiers = d.tiers || [];
  const symbols = d.symbols || [];
  const pays = symbols.filter((s) => Array.isArray(s.pays));
  const wild = symbols.find((s) => s.kind === 'wild');
  const scatter = symbols.find((s) => s.kind === 'scatter');
  const trig = d.freespinTriggers || [];
  const retrig = d.retrigger || [];
  const minTrig = trig.length ? trig[0].scatters : 4;
  const minRetrig = retrig.length ? retrig[0].scatters : 3;
  const minCluster = tiers.length ? tiers[0].min : 5;
  const B = social ? 'play amount' : 'bet';
  const wildName = wild ? wild.name : 'Gold Nugget';
  const scatName = scatter ? scatter.name : 'Dynamite';

  let example = '';
  if (typeof fmt === 'function' && pays.length) {
    const top = pays[0];
    const last = top.pays[top.pays.length - 1];
    try {
      example = `<p>Example: with a ${B} of ${esc(fmt(1_000_000, currency))}, a cluster of ${tierLabel(tiers[tiers.length - 1])} ${esc(top.name)} symbols is worth ${esc(fmt(Math.round(last * 1_000_000), currency))} before any multipliers.</p>`;
    } catch (e) { example = ''; }
  }

  const sections = [];

  sections.push({ id: 'overview', title: t('rules.tab.overview'), html: `
    <h3>The Unleashed Mine</h3>
    <p>The Unleashed Mine is a 6-reel, 5-row cluster game. There are no paylines: wins are formed by groups of ${minCluster} or more matching symbols that touch each other horizontally or vertically.</p>
    <p>After every win the winning symbols are removed, the remaining symbols fall down and new symbols drop in from above (tumbles). Tumbles continue as long as new wins are formed, and all wins of a round are added together.</p>
    <p>Trigger the Unleashed Mine free spins, where every position holds a vein multiplier that grows each time the position takes part in a win.</p>
    <p>The maximum win is ${commas(wincap)}x the ${B}. When this limit is reached the round ends immediately and all remaining features are forfeited.</p>
  ` });

  sections.push({ id: 'howto', title: t('rules.tab.howto'), html: `
    <h3>How to play</h3>
    <ol>
      <li>Choose your ${B} with the - and + buttons.</li>
      <li>Press the BET button (or the space bar) to start a round.</li>
      <li>Any group of ${minCluster} or more matching symbols that are adjacent horizontally or vertically is a winning cluster.</li>
      <li>Winning symbols disappear, symbols above fall down and new ones fill the gaps. This repeats while new clusters form.</li>
      <li>The total win of the round is shown at the end and is added to your balance.</li>
    </ol>
    <h3>How wins form</h3>
    <ul>
      <li>Clusters are made of the same symbol touching horizontally or vertically. Diagonal neighbours do not connect.</li>
      <li>${esc(wildName)} (wild) substitutes for all paying symbols. It never replaces ${esc(scatName)} (scatter).</li>
      <li>A wild can join clusters of different symbols at the same time, but each symbol cluster is evaluated on its own.</li>
      <li>Every cluster is rewarded by its symbol and its size, as shown in the ${esc(social ? 'Win table' : 'Paytable')}. Larger clusters are worth more.</li>
      <li>All wins are multiples of the ${B}, and are added together over all tumbles of a round.</li>
    </ul>
    ${example}
  ` });

  const headCells = tiers.map((tr) => `<th scope="col">${esc(tierLabel(tr))}</th>`).join('');
  const rows = pays.map((s) => `
      <tr><th scope="row">${glyph(s.id)} ${esc(s.name)}</th>${s.pays.map((p) => `<td>${p == null ? '-' : esc(num(p)) + 'x'}</td>`).join('')}</tr>`).join('');
  sections.push({ id: 'wins', title: t('rules.tab.wins'), html: `
    <h3>${esc(social ? 'Win table' : 'Paytable')}</h3>
    <p>Wins are shown as multiples of the ${B} for a cluster of the given size. Cluster size is the number of connected symbols.</p>
    <div class="rl-scroll"><table class="rl-table">
      <thead><tr><th scope="col">Symbol</th>${headCells}</tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
    <p>Cluster sizes in the header are the number of matching symbols in the cluster. Symbols on the table are listed from highest to lowest value.</p>
    ${wild ? `<p>${glyph('W')} <strong>${esc(wild.name)}</strong> is wild and substitutes for all paying symbols (not for ${esc(scatName)}).</p>` : ''}
    ${scatter ? `<p>${glyph('S')} <strong>${esc(scatter.name)}</strong> is the scatter. It does not form clusters, and it triggers the free spins wherever it lands.</p>` : ''}
  ` });

  const trigRows = trig.map((x) => `<tr><td>${x.scatters}${x === trig[trig.length - 1] ? '+' : ''}</td><td>${x.spins}</td></tr>`).join('');
  const retrigRows = retrig.map((x) => `<tr><td>${x.scatters}${x === retrig[retrig.length - 1] ? '+' : ''}</td><td>${x.spins}</td></tr>`).join('');
  sections.push({ id: 'features', title: t('rules.tab.features'), html: `
    <h3>Tumbles</h3>
    <p>After each win, winning symbols are removed and the remaining symbols drop down. New symbols fill the empty positions. The tumbling continues until no new win is formed.</p>
    <h3>Unleashed Mine free spins</h3>
    <p>${minTrig} or more ${esc(scatName)} scatters anywhere on the board during a tumble sequence of a round trigger the Unleashed Mine free spins.</p>
    <table class="rl-table"><thead><tr><th scope="col">Scatters</th><th scope="col">Free spins awarded</th></tr></thead><tbody>${trigRows}</tbody></table>
    <h3>Veins and multipliers</h3>
    <ul>
      <li>When the free spins begin, every position on the board holds a vein multiplier of ${veinStart}x.</li>
      <li>Each time a position takes part in a winning cluster, its multiplier grows by ${veinStep}, up to a maximum of ${maxMult}x.</li>
      <li>Veins stay on the board for the whole free spins feature, even when symbols tumble away from the position.</li>
      <li>The win of a cluster is its value from the ${esc(social ? 'Win table' : 'Paytable')} multiplied by the sum of the multipliers of all positions in the cluster.</li>
    </ul>
    <h3>Retrigger</h3>
    <p>${minRetrig} or more ${esc(scatName)} scatters during the free spins award extra free spins.</p>
    <table class="rl-table"><thead><tr><th scope="col">Scatters</th><th scope="col">Extra free spins</th></tr></thead><tbody>${retrigRows}</tbody></table>
    <p>When the free spins end, the total win is added to your balance.</p>
    <h3>Maximum win</h3>
    <p>The maximum win is ${commas(wincap)}x the ${B}. When it is reached, the round ends and any remaining free spins are forfeited.</p>
  ` });

  const modeLines = (d.modes || []).map((m) => `${esc(modeName(m.name))}: RTP ${pct(m.rtp)}, max win ${commas(m.maxWin)}x`).join(' · ');
  const modeRows = (d.modes || []).map((m) => `<tr><th scope="row">${esc(modeName(m.name))}</th><td>${num(m.cost)}x</td><td>${pct(m.rtp)}</td><td>${commas(m.maxWin)}x</td></tr>`).join('');
  sections.push({ id: 'modes', title: t('rules.tab.modes'), html: `
    <h3>Game modes</h3>
    <p><strong>${esc(modeName('base'))}</strong> is the standard game. A round costs the ${B} (1x).</p>
    <p><strong>${esc(modeName('bonus'))}</strong> starts the Unleashed Mine free spins directly, without having to land scatters. A round in this mode costs ${num(unleashCost)}x the ${B}. A confirmation is shown, stating the total cost, before the round starts.</p>
    <p class="rl-rtp">${modeLines}</p>
    <div class="rl-scroll"><table class="rl-table"><thead><tr><th scope="col">Mode</th><th scope="col">Cost</th><th scope="col">RTP</th><th scope="col">Max win</th></tr></thead><tbody>${modeRows}</tbody></table></div>
    <p>The RTP is the expected return over many plays. A maximum win of ${commas(wincap)}x applies to every round, in every mode.</p>
  ` });

  sections.push({ id: 'controls', title: t('rules.tab.controls'), html: `
    <h3>Interaction guide</h3>
    <ul class="rl-controls">
      <li><strong>BET</strong> (or <kbd>Space</kbd>): starts a round at the selected ${B}. The space bar behaves exactly like this button.</li>
      <li><strong>Bet - / +</strong>: decreases or increases the ${B}. Disabled while a round is running.</li>
      <li><strong>AUTOPLAY</strong>: opens the autoplay settings. Choose the number of spins and stop conditions, then confirm to start. Press again to stop.</li>
      <li><strong>TURBO</strong>: speeds up the animations.</li>
      <li><strong>UNLEASH</strong>: starts the Unleashed Mine free spins directly at ${num(unleashCost)}x the ${B}, after you confirm the total cost.</li>
      <li><strong>SOUND</strong>: mutes or unmutes all sounds.</li>
      <li><strong>INFO</strong>: opens these rules.</li>
      <li><strong>FULLSCREEN</strong>: enters or leaves full screen.</li>
      <li><strong>MENU</strong>: opens the game menu.</li>
      <li><strong>Space bar</strong>: same as the BET button; it also starts a round while no round is running.</li>
    </ul>
    <p>A round cannot be started when the balance is lower than the ${B} multiplied by the cost multiplier of the selected mode.</p>
  ` });

  sections.push({ id: 'legal', title: t('rules.tab.legal'), html: `
    <h3>Return and limits</h3>
    <p class="rl-rtp">${modeLines}</p>
    <p class="rl-disclaimer">${esc(DISCLAIMER)}</p>
  ` });

  if (social) for (const s of sections) s.html = socialize(s.html);
  return { sections, provisional: !!d.provisional };
}

// ---- DOM rendering -----------------------------------------------------
const STYLE = `
.rules{display:flex;flex-direction:column;height:100%;max-height:100%;color:var(--fg,#f3ead7);font:14px/1.45 system-ui,sans-serif}
.rules-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 10px}
.rules-head h2{margin:0;font-size:1.1em}
.rules-tabs{display:flex;gap:4px;overflow-x:auto;padding:0 8px}
.rules-tab{flex:0 0 auto;border:1px solid rgba(255,255,255,.25);background:transparent;color:inherit;border-radius:6px;padding:4px 10px;cursor:pointer;font:inherit}
.rules-tab[aria-selected=true]{background:rgba(255,215,0,.2);border-color:#ffd700}
.rules-body{flex:1 1 auto;overflow:auto;padding:8px 12px;-webkit-overflow-scrolling:touch}
.rules-close{border:1px solid rgba(255,255,255,.35);background:transparent;color:inherit;border-radius:6px;padding:4px 12px;cursor:pointer;font:inherit}
.rules h3{margin:12px 0 4px;font-size:1.05em}
.rl-table{border-collapse:collapse;width:100%;margin:6px 0}
.rl-table th,.rl-table td{border:1px solid rgba(255,255,255,.2);padding:3px 6px;text-align:center}
.rl-table tbody th{text-align:left}
.rl-scroll{overflow-x:auto}
.rl-glyph{font-size:1.2em;margin-right:4px}
.rl-disclaimer{font-size:.85em;opacity:.85}
`;

let dataPromise = null;
export function loadRulesData() {
  if (!dataPromise) {
    dataPromise = fetch('data/rules_data.json').then((r) => { if (!r.ok) throw new Error('rules data'); return r.json(); }).catch(() => null);
  }
  return dataPromise;
}

export async function renderRules(container, data) {
  const d = data === undefined ? await loadRulesData() : data;
  const { sections } = buildRules(d);
  if (typeof document !== 'undefined' && !document.getElementById('rules-style')) {
    const st = document.createElement('style');
    st.id = 'rules-style';
    st.textContent = STYLE;
    document.head.appendChild(st);
  }
  container.innerHTML = `
    <div class="rules" role="document">
      <div class="rules-head"><h2>${esc(t('rules.title'))}</h2><button type="button" class="rules-close" data-rules-close>${esc(t('btn.close'))}</button></div>
      <div class="rules-tabs" role="tablist">${sections.map((s, i) => `<button type="button" role="tab" class="rules-tab" id="rules-tab-${s.id}" data-tab="${s.id}" aria-selected="${i === 0}">${esc(s.title)}</button>`).join('')}</div>
      <div class="rules-body" id="rules-body" tabindex="0"></div>
    </div>`;
  const body = container.querySelector('#rules-body');
  const show = (id) => {
    const s = sections.find((x) => x.id === id) || sections[0];
    body.innerHTML = s.html;
    body.scrollTop = 0;
    container.querySelectorAll('.rules-tab').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === s.id)));
  };
  container.querySelectorAll('.rules-tab').forEach((b) => b.addEventListener('click', () => show(b.dataset.tab)));
  const closeBtn = container.querySelector('[data-rules-close]');
  if (closeBtn) closeBtn.addEventListener('click', closeRules);
  show(sections[0].id);
}

function modalEl() { return typeof document !== 'undefined' ? document.getElementById('modal-info') : null; }

export async function openRules() {
  const el = modalEl();
  if (!el) return;
  await renderRules(el);
  el.hidden = false;
  el.removeAttribute('hidden');
  el.classList.add('open');
  const first = el.querySelector('.rules-close');
  if (first) first.focus();
}

export function closeRules() {
  const el = modalEl();
  if (!el) return;
  el.classList.remove('open');
  el.hidden = true;
}

if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => {
    const el = modalEl();
    if (e.key === 'Escape' && el && el.classList.contains('open')) closeRules();
  });
}
export default openRules;
