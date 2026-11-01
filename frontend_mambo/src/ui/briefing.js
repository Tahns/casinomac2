// First-spin briefing card (WP1, SYNTHESIS 4 lever 8): a small card over the board on the very first visit, once.
//  - shown when the game is idle and settings 'briefed' is false (stored inside the whitelisted am_settings blob);
//  - never blocks play: it is NOT a .modal (no inert UI, SPIN and the space bar keep working) and a round start closes it;
//  - one CLOSE button that gets the focus, Escape closes it, closing marks it seen;
//  - never in replay mode; Settings > Info has "Show the briefing again" (show()).
// createBriefing({ host, settings, t, replay }) -> { maybeShow(), show(), dismiss(), get open }
import { h } from './dom.js';

export const BRIEF_LINES = Object.freeze(['briefing.l1', 'briefing.l2', 'briefing.l3']);

/** Pure: should the card open by itself? */
export function shouldBrief({ briefed, replay, state }) {
  return !briefed && !replay && state === 'idle';
}

export function createBriefing({ host, settings, t, replay = false, doc = typeof document !== 'undefined' ? document : null }) {
  let card = null, closeBtn = null, onKey = null;
  const isOpen = () => !!(card && !card.hidden);
  function build() {
    if (card || !doc || !host) return;
    closeBtn = h('button', { type: 'button', class: 'mbtn brief-close', id: 'briefing-close' }, t('briefing.close'));
    closeBtn.addEventListener('click', () => api.dismiss());
    card = h('section', { id: 'briefing-card', class: 'brief', role: 'dialog', 'aria-modal': 'false', 'aria-labelledby': 'briefing-title', hidden: true },
      h('h2', { id: 'briefing-title', class: 'brief-title' }, t('briefing.title')),
      h('ol', { class: 'brief-list' }, BRIEF_LINES.map((k, i) => h('li', { 'data-n': String(i + 1) }, t(k)))),
      h('div', { class: 'brief-actions' }, closeBtn));
    host.append(card);
  }
  const api = {
    get open() { return isOpen(); },
    maybeShow(state = 'idle') {
      let briefed = true;
      try { briefed = !!settings.get('briefed'); } catch (e) { briefed = true; }
      if (shouldBrief({ briefed, replay, state })) api.show();
    },
    show() {
      if (replay) return;
      build();
      if (!card) return;
      card.hidden = false;
      if (!onKey) {
        onKey = (e) => { if (e.key === 'Escape' && isOpen() && !doc.querySelector('.modal.open')) { e.preventDefault(); api.dismiss(); } };
        doc.addEventListener('keydown', onKey);
      }
      try { closeBtn.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
    },
    /** Close and remember it was seen. Called by CLOSE, Escape and the start of any round. */
    dismiss() {
      if (!card || card.hidden) return;
      const hadFocus = card.contains(doc.activeElement);
      card.hidden = true;
      try { settings.set('briefed', true); if (settings.flush) settings.flush(); } catch (e) { /* ignore */ }
      if (hadFocus) { const spin = doc.getElementById('btn-bet'); try { if (spin && !spin.disabled) spin.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
    },
  };
  return api;
}
