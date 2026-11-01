// Agent Mambo v2 i18n partial (WP3 owns it). Merged by index.js AFTER en.js, so a key here wins over the same key in en.js.
// Social-casino wording rules apply to every string here (restricted word list: src/i18n/social.js and tests/text).
//
// The five reworded heroine lines (docs/research2/09_theme_lore_names.md section 4.3, SYNTHESIS 4 lever 11). Each one removes a soft nudge or an echo:
//  - "Next one's the one." suggested that a win is due after a dead round (gambler's fallacy) and "Same time tomorrow?" asked for a return visit;
//    both are replaced by neutral lines that say nothing about what comes next;
//  - "Case closed." (a common title), "Mission: fabulous!" (an echo of a film title) and "Press and pray." (a religious aside) are softened.
// `mascot.lose` is the base key of `mascot.lose.1`, so both carry the new line. Everything else about the heroine's voice stays in en.js.
export const en_hero = {
  'mascot.lose': 'Nothing to report.',
  'mascot.lose.1': 'Nothing to report.',
  'mascot.fsEnd.3': 'File closed.',
  'mascot.fsEnd.5': 'Debrief done.',
  'mascot.big.2': 'Fabulous, darling.',
  'mascot.wire.2': 'Press and hum.',
  // v2 round 1 (H2-11 / I7): one entry and one exit line per mission (render says 'mascot.fs.' + mission id at the trigger and
  // 'mascot.fsEnd.' + mission id at the end; 'mascot.fs' with its variants stays the Briefing line)
  'mascot.fs.briefing': 'Briefing time.',
  'mascot.fs.orders': 'Sealed orders. Hush.',
  'mascot.fs.blackout': 'Lights out, darling.',
  'mascot.fsEnd.briefing': 'Lesson learned.',
  'mascot.fsEnd.orders': 'Orders carried out.',
  'mascot.fsEnd.blackout': 'Lights back on.',
  // v2 round 2 (H2-11): the generic entry pool is said on EVERY door confirm (main.js) and by the render for The Briefing; until the render
  // says 'mascot.fs.' + mission id (docs/v2/requests/FIX_heroine_to_render.md), no line of the pool may name one mission ("Briefing time.",
  // "Lights, dossier, action." were heard on Coat Check / Service Stairs rounds). The mission lines live in mascot.fs.<id> above.
  'mascot.fs': 'Into the lair!',
  'mascot.fs.1': 'Into the lair!',
  'mascot.fs.2': "Let's mambo.",
  'mascot.fs.3': 'New file, new rules.',
  'mascot.fs.4': 'On the case.',
  'mascot.fs.5': 'Showtime, darling.',
};
export default en_hero;
