# Boucle d'amélioration (48 h)

Demande de l'utilisateur : « corriger les faiblesses -> nouveau SWOT, etc. en boucle pendant 2 jours ».
Début : 2026-10-09. **Fin : 2026-10-11 13:00 UTC.** Passé ce moment, ne plus itérer : désactiver la routine et le dire.

## Une itération
1. Lire `docs/SWOT.md` (dernière version) et `docs/OPEN_QUESTIONS.md`.
2. Choisir les 1 à 3 faiblesses/menaces les plus utiles que Claude peut réellement traiter seul (code, maths, tests, docs, démo). Ne pas empiler : une itération = un lot cohérent, vérifié.
3. Corriger. Vérifier par des exécutions réelles (tests unitaires, simulations, captures de la démo). Ne jamais affirmer qu'un point est réglé sans l'avoir mesuré.
4. Committer et pousser sur `claude/nifty-franklin-amww6q` uniquement.
5. Écrire un **nouveau SWOT** (`docs/SWOT.md`, nouvelle version en tête, anciennes conservées en dessous) en reclassant honnêtement : ce qui est corrigé (avec la preuve), ce qui reste, ce qui est apparu.
6. Ajouter une entrée à `docs/ITERATIONS.md` : date, changements, chiffres mesurés, points bloqués.

## Garde-fous
- Aucune pull request, aucun merge, aucun push hors de la branche ci-dessus.
- Aucune publication ni soumission à Stake Engine. Aucun service payant ou à crédits (par ex. génération d'images ou de vidéos) sans accord explicite de l'utilisateur.
- Ne jamais copier Huff N' Puff : pas de loup/cochons/maisons, pas de roue de jackpots (exception : l'utilisateur a demandé, itération 12, une roue avant et une roue d'upgrade après le bonus : version originale décrite dans TWO_WHEELS_SPEC.md, derrière un réglage, défaut inchangé), pas de cadres paille/bois/brique, pas de noms de la franchise. Ne pas rapprocher la conception de la leur.
- Pas de jackpots (règle Stake « stateless ») : parler de multiplicateurs fixes.
- Ne jamais déclarer le jeu « libre de brevets » ni « conforme » : seul un conseil en PI / Stake peut le dire.
- Les décisions qui relèvent de l'humain (PI, CGU, licences d'art, soumission, contact Stake) vont dans `docs/OPEN_QUESTIONS.md`, pas dans le code.
- Si le conteneur a été recréé : `git fetch origin claude/nifty-franklin-amww6q`, se placer dessus, puis `cd math && make setup` si `math/env` est absent.

## Arrêt
- À la date de fin ci-dessus.
- Ou après 3 itérations d'affilée sans amélioration mesurable possible par Claude seul.
Dans les deux cas : désactiver la routine (update_trigger enabled=false), faire un dernier SWOT et un résumé court pour l'utilisateur.
