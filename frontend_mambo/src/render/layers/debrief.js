// Agent Mambo v2 layer DEBRIEF TAB (WP6). The end-of-feature card itself (MISSION REPORT, count, FILED when R <= C, DECLASSIFIED
// above C) is drawn by the player (render/index.js countBanner, WP4) from celebrate.endPlan. This layer pins the dossier tab of the
// mission that was played on top of that card, so the Debrief names the mission: a brass folder tab with the mission name (the
// FILED / DECLASSIFIED stamp is the player's, on the card). Neutral in both cases (L20): no rays, no coins, no sound of its own,
// the same look at R <= C and above.
import { missionKey } from './logic.js';
import { t } from '../../i18n/index.js';
import { h, anim, tx, esc } from './util.js';

export function createDebrief() {
  let mission = null, tab = null, timer = 0, token = 0;
  const L = { id: 'debrief', log: [] };

  function clear() {
    token++;
    clearTimeout(timer); timer = 0;
    if (tab) { tab.remove(); tab = null; }
  }

  function pin(ctx, level) {
    const my = token;
    const host = ctx.app;
    if (!host) return;
    const started = Date.now();
    const find = () => {
      if (my !== token) return;
      const banner = host.querySelector('.banner-layer .banner');
      if (!banner) { if (Date.now() - started < 1500) timer = setTimeout(find, 50); return; }
      const m = missionKey(mission);
      const name = tx(t, 'layers.mission.' + m, m.toUpperCase());
      const filed = !(level >= 1);
      tab = h('div', 'l-debrief ' + (filed ? 'filed' : 'declassified'), `<span class="l-debrief-name">${esc(name)}</span>`);
      tab.dataset.mission = m;
      banner.appendChild(tab);
      L.log.push({ t: 'tab', m, filed });
      anim(ctx, tab, [{ transform: 'translate(-50%,40%)', opacity: 0 }, { transform: 'translate(-50%,0)', opacity: 1 }], { duration: 167, easing: 'steps(2,end)' });
    };
    timer = setTimeout(find, 30);
  }

  L.onEvent = (ev, ctx) => {
    if (!ev || !ctx) return null;
    if (ev.type === 'missionAssigned') mission = ev.mission;
    else if (ev.type === 'freeSpinTrigger' && !mission) mission = 'briefing';
    else if (ev.type === 'freeSpinEnd') { clear(); pin(ctx, Number(ctx.level) || 0); }
    return null;
  };
  L.reset = () => { mission = null; clear(); };
  return L;
}
