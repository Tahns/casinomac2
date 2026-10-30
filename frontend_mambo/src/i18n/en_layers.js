// Agent Mambo v2 i18n partial (WP6 owns it). Merged by index.js AFTER en.js, so a key here wins over the same key in en.js.
// Social-casino wording rules apply to every string here (restricted word list: src/i18n/social.js and tests/text).
// Keys used by the layer plug-ins (src/render/layers/*): dossier cutscene, doors, stamps, Sealed Orders envelope, Ballroom Blackout beam.
export const en_layers = {
  'layers.topSecret': 'TOP SECRET',
  'layers.mission.briefing': 'MISSION: THE BRIEFING',
  'layers.mission.orders': 'MISSION: SEALED ORDERS',
  'layers.mission.blackout': 'MISSION: BALLROOM BLACKOUT',
  'layers.brief.briefing': 'Every winning step turns the Clearance Dial up.',
  'layers.brief.orders': 'Steps are filed in the envelope. It opens at the end of the spin: filed total x dial.',
  'layers.brief.blackout': 'Lights out. Clusters inside the spotlight count x4.',
  'layers.spins': '{n} FREE SPINS',
  'layers.continue': 'TAP TO CONTINUE',
  'layers.door.stage': 'STAGE DOOR',
  'layers.door.coat': 'COAT CHECK',
  'layers.door.stairs': 'SERVICE STAIRS',
  'layers.sealed': 'SEALED',
  'layers.opened': 'OPENED',
  'layers.filed': 'FILED',
  'layers.declassified': 'DECLASSIFIED',
  'layers.debrief': 'DEBRIEF',
  'layers.debriefText': 'Mission closed. Back to the base game.',
  'layers.envelope': 'ORDERS',
  'layers.bank': 'FILED {x}',
  'layers.reveal': '{bank} x{dial} = {x}',
  'layers.plan': '{name}',
  'layers.lit': 'x{n}',
};
export default en_layers;
