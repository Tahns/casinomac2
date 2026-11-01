// Agent Mambo v2 i18n partial (WP1 owns it). Merged by index.js AFTER en.js, so a key here wins over the same key in en.js.
// Social-casino wording rules apply to every string here (restricted word list: src/i18n/social.js and tests/text):
// no bet/bets/betting, buy/bought/purchase, pay/paid/pays/paytable, cash, money, credit, deposit, wager, gamble, fund,
// currency, withdraw, "cost of", "at the cost of". Say "play amount" or "cost" (the platform review scans src/** for one more word, see guideline [275]).
export const en_ui = {
  'btn.settings': 'SETTINGS',

  // settings dialog
  'settings.title': 'SETTINGS',
  'settings.tabs': 'Settings sections',
  'settings.tab.sound': 'Sound',
  'settings.tab.display': 'Display',
  'settings.tab.play': 'Play',
  'settings.tab.info': 'Info',
  'settings.mute': 'Mute sound',
  'settings.vol.master': 'Master volume',
  'settings.vol.music': 'Music',
  'settings.vol.sfx': 'Effects',
  'settings.vol.text': '{n} percent',
  'settings.vol.off': 'Off',
  'settings.motion': 'Motion',
  'settings.motion.hint': 'Auto follows your device. Calm and Still never shorten a round.',
  'settings.motion.auto': 'Auto',
  'settings.motion.full': 'Full',
  'settings.motion.calm': 'Calm',
  'settings.motion.still': 'Still',
  'settings.flash': 'Screen flash effects',
  'settings.flash.hint': 'Switch off to remove bright flashes.',
  'settings.contrast': 'High contrast',
  'settings.summary': 'Session summary',
  'settings.summary.hint': 'Shows your net position and time played on the main screen.',
  'settings.summary.locked': 'Always shown in your region.',
  'settings.turbo.hint': 'Faster animations. Not saved between visits.',
  'settings.autoplay': 'Autoplay',
  'settings.autoplay.hint': 'Choose the number of spins and when to stop.',
  'settings.autoplay.open': 'Autoplay settings',
  'settings.autoplay.stop': 'Stop autoplay',
  'settings.autoplay.busy': 'Available between rounds.',

  // info tab
  'info.rtp.all': 'Expected return (RTP): {rtp} in every mode.',
  'info.rtp.modes': 'Expected return (RTP): {list}.',
  'info.session': 'This session',
  'info.version': 'Version {v}',
  'info.rules': 'Rules',
  'info.controls': 'Controls',
  'info.modes': 'Modes and RTP',
  'info.legal': 'Legal',

  // session summary (main screen)
  'ledger.title': 'Session summary',
  'ledger.label': 'SESSION',
  'ledger.net': 'Net position',
  'ledger.time': 'Time played',
  'ledger.netShort': 'NET',
  'ledger.timeShort': 'TIME',

  // secret entrance doors
  'door.title': 'Choose a door',
  'door.hint': 'Choose a door to continue.',
  'door.stage': 'Stage Door',
  'door.coat': 'Coat Check',
  'door.stairs': 'Service Stairs',
  'unleash.chooseText': 'Take the secret entrance? This starts the free spins right away. Each door shows what it costs for this round. Continue?',
  'door.cost': 'Cost: {cost}',
  'door.fact.rtp': 'RTP {rtp}',
  'door.fact.max': 'Max win {max}x',
  'door.fact.median': 'Median round {x}x',
  'door.fact.share': '{p} of rounds return more than the cost',
  // the mission each door plays, one line under the door name (SYNTHESIS 2: Stage Door = Briefing, Coat Check = Sealed Orders,
  // Service Stairs = Ballroom Blackout)
  'door.mission.bonus': 'The Briefing: the Clearance Dial climbs in the lab',
  'door.mission.entrance_orders': 'Sealed Orders: wins are filed in the envelope, opened at the end',
  'door.mission.entrance_blackout': 'Ballroom Blackout: the spotlight multiplies lit clusters',
  'mode.entrance_orders': 'SECRET ENTRANCE: COAT CHECK',
  'mode.entrance_blackout': 'SECRET ENTRANCE: SERVICE STAIRS',
  // Clearance Dial (WP5_to_WP1 item 2; player-facing name, SYNTHESIS 0.2)
  'meter.title': 'Clearance Dial',
  'meter.band.largo': 'Largo',
  'meter.band.andante': 'Andante',
  'meter.band.allegro': 'Allegro',
  'meter.band.presto': 'Presto',
  'fx.bam': 'BAM!',

  // first-spin briefing card (SYNTHESIS 4 lever 8): once, skippable, shown again from Settings > Info
  'briefing.title': 'YOUR BRIEFING',
  'briefing.l1': 'Match 5 or more touching symbols. Wins tumble away and new symbols drop in.',
  'briefing.l2': 'Each winning step lights the bomb-timer wire. 3 or more lit positions blast.',
  'briefing.l3': '4 Classified Dossiers start the free spins, with one of three missions.',
  'briefing.close': 'CLOSE',
  'briefing.again': 'Show the briefing again',

  // error dialog title plate
  'err.title': 'CONNECTION LOST',
  'err.title.maintenance': 'MISSION PAUSED',
  'err.title.noParams': 'MISSING LINK',
};
export default en_ui;
