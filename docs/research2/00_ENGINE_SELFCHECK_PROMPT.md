# Engine game review: self-check (prompt officiel fourni par l'utilisateur)

Texte fourni par l'utilisateur comme « prompt IA de Stake ». Référence de contrôle pour TOUS les agents de la v2. Source complète : https://studio.engine.io/docs/approval-guidelines

Règles de travail du prompt original : verdicts PASS / FAIL / AT RISK / NEEDS A HUMAN / N/A, preuve pour chaque verdict (`file:line`, texte exact, observation réseau), ne jamais deviner, vérifier tous les chemins (base et bonus, bureau et mobile, jeu normal et replay, UI principale et menu réglages).

## Faits de plateforme

URL de lancement : `https://{team}.live.engine.io/{game}/v{version}/?sessionID=…&rgs_url=…&lang=en&currency=USD&device=desktop&social=false&demo=false`
- `rgs_url` sert pour TOUTES les requêtes RGS, jamais d'hôte en dur, peut arriver sans `https://` (le jeu ajoute le schéma). `lang` inconnu → anglais. `device` : mobile, desktop ou tablet. `social=true` pour Stake.US.

API de portefeuille (POST JSON, relative à `rgs_url`) : `/wallet/authenticate {sessionID}` → balance, config {minBet,maxBet,stepBet,defaultBetLevel,betLevels[],jurisdiction.{socialCasino,…}}, round (si non terminé) ; `/wallet/balance` ; `/wallet/play {sessionID,amount,mode}` → balance, round {amount,payoutMultiplier,active,state}; `/wallet/end-round` ; `/bet/event {sessionID,event}`.
Erreurs : `{error,message}` parmi ERR_VAL (400), ERR_IPB (400, solde insuffisant), ERR_GLE (400, limites), ERR_ACT (429), ERR_GEN (500). Argent en micro-unités : 1000000 = 1.00.

Replay : `…/index.html?replay=true&game=…&version=…&mode=…&event=…&rgs_url=…&currency=…&amount=…&lang=…&device=…&social=…` ; `GET {rgs_url}/bet/replay/{game}/{version}/{mode}/{event}` → `{payoutMultiplier,costMultiplier,state}`. Aucun appel de portefeuille, aucun accès au jeu réel. Coût réel = amount × costMultiplier.

Devises à tester : USD $10.00, EUR €10.00, CAD CA$10.00, MXN MX$10.00, JPY ¥10 (0 décimale), XSC 10.00 SC, XGC 10.00 GC, XEC 10.00 SC. GBP non supportée.

Fichiers de math : `index.json` (modes: name, cost, events, weights) ; **20 modes maximum** (au-delà : exception du support, donc AT RISK) ; `lookUpTable_*.csv` = id, weight, payout×100 ; RTP par mode = Σ(weight × payout/100) ÷ Σ(weight) ÷ cost ; gain max = max(payout)/100.

## Checklist (les numéros sont les ids de directives Engine)

**Pré-contrôles**
- [181] `/wallet/authenticate` appelé au chargement sur `rgs_url` avec le `sessionID` de l'URL, 200, le jeu continue. Aucun hôte dev/staging.
- [274] Avec `rgs_url=example.com` : erreur de connexion/authentification claire, pas de spinner infini, pas de fallback vers un autre RGS.
- [183] Le bouton de mise envoie `/wallet/play` {sessionID, amount, mode} et joue la manche retournée.
- [275] Aucun loader « Powered by Stake Engine » à aucun moment (lancement, rechargement, replay, reconnexion). Chercher stake engine / stake-engine / stakeengine / powered by stake / engine-loader / engineLoader.

**Conformité**
- [213] Titre unique, sans : Megaways, XWays, Enhanced, Boosted (ou synonymes), RTP ou pourcentage, « Gates of… », « …Bonanza », Olympus, Rush, Kraken, Waylanders, ni rien qui laisse croire à un lien avec un autre éditeur ou une autre série. Vérifier code, `<title>`, logo, écran de chargement.
- [217] **Aucun contenu offensant ou inapproprié : pas de contenu haineux, discriminatoire, SEXUEL, gore, extrémiste ou illégal, et aucune image de mineurs.** (humain)
- [253] Distinct des titres existants : échec si au moins deux de ces éléments ressemblent de près à un jeu ou une série existants : titre, logo/tuile, personnage principal ou symboles, thème et style, mécanique centrale, présentation d'ensemble. (humain)

**Niveaux de mise**
- [242] `minBet`, `maxBet`, `stepBet`, `defaultBetLevel`, `betLevels` viennent tous de authenticate ; le jeu s'ouvre sur `defaultBetLevel`, ne parcourt que `betLevels`, s'arrête aux deux bouts, n'envoie jamais de valeur hors liste. Toutes les devises.
- [187] Un round actif (`round.active`) est repris et la mise devient `round.amount` (pas `defaultBetLevel`), y compris pour la mise suivante.

**Devises**
- [219] USD, EUR, CAD, MXN, JPY : bon symbole, bonnes décimales, bonne position, pour solde, mise, gain et modales ; pas de rognage avec CA$ ou MX$.
- [273] Gains sous 0.01 affichés avec assez de décimales (ni 0.00 ni 0.01 arrondi).

**Requêtes RGS**
- [221] `/wallet/end-round` seulement pour une manche encore ouverte (gain > 0x). Jamais pour 0x ; toujours pour un gain.
- [222] Solde < mise : aucun `/wallet/play` envoyé (bouton, espace, autoplay, achats), message au joueur, coût réel du mode (mise × multiplicateur de coût).

**Front**
- [228] Espace = bouton de mise quand possible, sans effet dans menus/modales/animations, `preventDefault()`, écouteur sur window/document.
- [227] Pas de défilement : html, body { margin:0; overflow:hidden; height:100% } à 1024×576, 400×225, 800×450, 425×812.
- [104] Autoplay : une pression ouvre un panneau de réglages, ne démarre pas seule.
- [31] Tout mode coûtant plus de 2x la mise : jamais de mise sur une seule pression (dialogue de confirmation indiquant le coût, ou bascule du mode avec coût clairement affiché).
- [107] Le contrôle de son visible coupe TOUT l'audio (effets, musique, ambiance, bonus, big wins).

**Règles du jeu (écran d'infos, en anglais)**
- [25] RTP et gain max indiqués par mode, cohérents avec le math.
- [24] Chaque symbole payant listé avec ses gains, cohérents avec le math.
- [26] Formation des gains expliquée (clusters, scatters, tumbles, multiplicateurs, conditions spéciales).
- [27] Chaque mode (hors base) décrit avec son coût, cohérent avec `index.json`.
- [29] Free games et re-triggers expliqués (déclencheur, nombre par déclencheur, re-trigger, différences par nombre de symboles).
- [235] Chaque bouton expliqué (mise, +/−, autoplay, turbo, achat, son, réglages, info, plein écran, menu, spécifiques).
- [185] Avertissement général présent : « Malfunction voids all wins and plays. A consistent internet connection is required. In the event of a disconnection, reload the game to finish any uncompleted rounds. The expected return is calculated over many plays. The game display is not representative of any physical device and is for illustrative purposes only. Winnings are settled according to the amount received from the Remote Game Server and not from events within the web browser. TM and © 2026 Engine. »
- [266] Mystery Mode / toute probabilité affichée : doit correspondre au math (N/A sinon).

**Responsive**
- [193] 1024×576, [195] 400×225 et 800×450, [194] 425×812 tactile : tout est visible, atteignable, sans chevauchement, lisible, mise possible.
- [223] Zoom au double-tap désactivé : `<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">` et/ou `touch-action: none|manipulation`. `width=device-width` seul ÉCHOUE.

**Langue**
- [239] `lang=en` : tout en anglais, aucune clé de traduction, `undefined`, `NaN`, `{placeholder}`, glyphe manquant.
- [240] `lang=zz` : repli sur l'anglais sans clés, vides ni mise en page cassée.

**Mode social (social=true)**
Mots interdits (mots entiers, insensible à la casse, partout où le joueur voit du texte) → remplacement : at the cost of→for ; be awarded to player's accounts→appear in player's accounts ; bet/bets/bet/s→play/plays ; betting→play/playing ; bonus buy→bonus/feature ; bought→instantly triggered ; buy→play ; buy bonus→get bonus ; cash→coins ; cost of→can be played for ; credit→balance ; currency→token ; deposit→get coins ; fund→balance ; win feature→play feature ; gamble→play ; money→coins ; paid→won ; paid out→win ; pay→win ; pay out→win/won ; payer→winner ; pays→wins ; pays out→won ; place your bets→come and play / join in the game ; purchase→play ; rebet→respin ; stake→play amount ; total bet→total play ; wager→play ; withdraw→redeem. Pièges : « Bet » sur le bouton principal, « Bet Amount », « Auto Bet », « Total Bet », « Buy » sur les achats et confirmations, erreurs de fonds, **« Pay table / Paytable »** (interdit).
- [77] Tout le texte en vocabulaire social. [78] XSC/XGC : « 10.00 SC » / « 10.00 GC », aucun « $ ». [225] Noms de modes sans mots interdits (« BONUS BUY », « BUY FEATURE », « SUPER BET » échouent), cohérents partout (y compris les noms de `index.json` affichés tels quels). [188] Le replay sans mot interdit.

**Replay**
- [171] `replay=true` : GET replay, AUCUN appel de portefeuille, chargement automatique, bouton Play/Start, rejoue exactement la manche, résultat laissé à l'écran, mise désactivée, pas d'accès au jeu réel, message d'erreur si l'appel échoue.
- [172] `currency`, `lang`, `amount` appliqués ; valeurs absentes ou invalides sans casse. **Aucun montant de mise affiché = échec.**
- [173] Après la fin, un contrôle Replay/Play Again relance le même événement.
- [174] Mise et, pour un mode > 1x, multiplicateur et coût réel (`amount × costMultiplier`), ex. « BONUS: 1.00 SC · REAL COST: 100.00 SC ».
- [243] Le replay fonctionne à 400×225 (charge, joue, tient, contrôles utilisables).

**Aussi à vérifier**
- Fichiers statiques uniquement : rien chargé depuis des hôtes externes (fonts, CDN, analytics).
- Les gains affichés = mise × payoutMultiplier et concordent avec la table.
- Aucune erreur console au lancement, en jeu et en replay.
