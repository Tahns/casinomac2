# Idées pour rendre Stellar Vigil plus attractif (2026-10-13)

Statut : liste d'idées, rien n'est implémenté ni mesuré. Aucune idée ne vaut avis de conformité ou de liberté d'exploitation.

## Garde-fous (valables pour toutes les idées)
- Jeu stateless Stake : aucun état persistant entre sessions ou entre spins (pas de compteur, de niveau de compte, de série), pas de jackpot ni de progressif, gains en multiples de 0,1x.
- Aucune copie de Huff N' Puff ni d'un autre jeu protégé (pas de loup, cochons, maisons, cadres paille/bois/brique, noms de la franchise). Ne pas rapprocher la conception de la leur.
- Les probabilités affichées sont les probabilités réelles (voir `STAKE_COMPLIANCE.md`, honnêteté des visuels de hasard).
- Tout changement de maths exige une régénération complète (optimiseur non reproductible) et reste figé après approbation. Les idées « visuel / son / UI seulement » n'y touchent pas.
- Art IA, polices, sons : licences à vérifier avant toute publication (`ART_PROVENANCE.md`).
- Rétention honnête : rien qui pousse à rejouer (pas de faux quasi-gains, pas de « vous y étiez presque » inventé, pas de compte à rebours, pas de messages de culpabilité).

## Lecture du tableau
Impact joueur : H (fort), M (moyen), B (faible). Effort : S (moins d'un jour), M (quelques jours), L (une semaine ou plus, ou dépend d'un tiers). Risque PI / conformité : bas, moyen, élevé, ou « à vérifier » (jamais « aucun »).

| N° | Idée | Famille | Impact | Effort | Risque |
|----|------|---------|--------|--------|--------|
| 1 | Petits gains visibles dès 0,1x (compteur animé, son court) | Rythme | M | S | bas |
| 2 | Mise en avant des symboles gagnants | Rythme | M | S | bas |
| 3 | Rythme des tours : arrêt échelonné des rouleaux | Rythme | M | S | bas |
| 4 | Suspense vrai sur le 3e Lunette et sur les roues (déjà amorcé) | Anticipation | H | S | bas |
| 5 | Indicateur honnête « 2 Lunettes sur 3 » sans promesse | Anticipation | B | S | bas |
| 6 | Carte de présentation du bonus avec saut possible | Anticipation | M | S | bas |
| 7 | Ciel qui se remplit pendant le bonus (progression visuelle) | Narration | H | M | bas |
| 8 | Chaque bonus a sa mini-histoire et son décor | Narration | M | M | bas |
| 9 | Récapitulatif de fin de bonus en « carte du ciel » | Narration | M | M | bas |
| 10 | Musique adaptative en trois couches (base / bonus / grand gain) | Sons | H | L | moyen (droits) |
| 11 | Pack de sons écouté et réglé (volumes, fatigue auditive) | Sons | M | M | bas |
| 12 | Voix et sons distincts par phase de lune | Sons | B | M | bas |
| 13 | Mode achat avec choix de la phase de lune (prix différent) | Achat | H | L | élevé (maths + PI) |
| 14 | Fiche de prix claire du mode achat (chances, médiane, risques) | Achat | M | S | bas |
| 15 | Confirmation d'achat en deux temps | Achat | M | S | bas |
| 16 | Accessibilité visuelle et animations réduites | Accessibilité | M | M | bas |
| 17 | Sous-titres des sons et retour haptique optionnel | Accessibilité | B | M | bas |
| 18 | Mobile : zone du pouce, orientation, poids du chargement | Mobile | H | M | bas |
| 19 | Première minute : tutoriel de 20 s sautable et table des gains | Onboarding | H | M | bas |
| 20 | Solde fictif clair dans la démo | Onboarding | M | S | bas |
| 21 | Capture d'écran du gros gain avec le ciel final | Partage | M | M | moyen (art IA, vie privée) |
| 22 | Panneau « jeu responsable » : limites, historique, pause | Rétention honnête | H | M | à vérifier (opérateur) |
| 23 | Rappel de durée de session et bouton de pause visibles | Rétention honnête | M | S | à vérifier |
| 24 | Résumé de session honnête (misé, gagné, net) | Rétention honnête | M | S | à vérifier |

---

## Rythme et micro-récompenses

### 1. Petits gains visibles dès 0,1x
- **Description** : tout gain, même de 0,1x, déclenche un compteur animé court et un son discret ; les gains supérieurs à la mise ont une animation plus nette que ceux qui rapportent moins que la mise.
- **Pourquoi** : sur un jeu de base rude (6 % des spins hors bonus paient la mise, mesure ancienne), chaque gain doit se sentir. Attention : un gain inférieur à la mise est une perte nette ; ne pas le célébrer comme une victoire (voir idée 24).
- **Coût** : S. **Risque** : bas ; vérifier que la célébration ne masque pas la perte nette (règles de présentation des opérateurs, à confirmer).
- **Mesure** : test de perception sur quelques joueurs (« ai-je gagné ou perdu ? ») ; aucune mesure de maths.

### 2. Mise en avant des symboles gagnants
- **Description** : en cas de gain, les symboles gagnants pulsent un instant, les autres s'atténuent.
- **Pourquoi** : lisibilité immédiate, moins de fatigue d'analyse.
- **Coût** : S. **Risque** : bas.
- **Mesure** : temps pour désigner le symbole gagnant lors d'un test observé.

### 3. Rythme des tours : arrêt échelonné des rouleaux
- **Description** : durée de tour réglable, arrêt rouleau par rouleau, durée totale plafonnée en vitesse normale (déjà un début avec turbo et turbo x2).
- **Pourquoi** : un tour trop long lasse, un tour trop court n'a pas de saveur. Le turbo reste un choix du joueur, jamais activé par défaut.
- **Coût** : S. **Risque** : bas ; certains marchés interdisent ou limitent le turbo et l'autoplay : à vérifier par juridiction (l'autoplay du démo s'arrête au bonus et au solde insuffisant).
- **Mesure** : durée moyenne d'un tour, nombre de tours par minute en démo.

## Anticipation et quasi-gains honnêtes

### 4. Suspense vrai sur le 3e Lunette et sur les roues
- **Description** : conserver et affiner l'attente avant le 3e Lunette et le frôlement de case des roues, uniquement quand le résultat est réellement en suspens dans le livre tiré.
- **Pourquoi** : l'anticipation est la source de plaisir principale d'une slot à bonus rare.
- **Coût** : S (réglage). **Risque** : bas **si** l'animation ne simule jamais un quasi-gain qui n'existe pas : une roue qui frôle puis revient est un effet visuel sur un résultat déjà tiré ; ne pas en abuser et ne pas augmenter la fréquence de ces frôlements au-delà de ce que le tirage produit. Point de conformité à faire valider (règles sur les quasi-gains selon juridiction).
- **Mesure** : revue du code (le suspense n'est déclenché que sur un événement du livre) ; test unitaire de cohérence démo / livres.

### 5. Indicateur « 2 Lunettes » sans promesse
- **Description** : un petit halo sur les Lunettes déjà présentes, sans texte du type « presque ».
- **Pourquoi** : lisibilité de l'objectif. **Coût** : S. **Risque** : bas, mais ne pas ajouter de messages d'encouragement.
- **Mesure** : compréhension de l'objectif en test observé.

### 6. Carte de présentation du bonus avec saut possible
- **Description** : la carte (nom + règle en une phrase) reste lisible ; un appui la saute après une demi-seconde.
- **Pourquoi** : informer sans ralentir ; les joueurs réguliers sautent. **Coût** : S. **Risque** : bas.
- **Mesure** : taux de saut en test.

## Narration et progression visuelle (sans état persistant)

### 7. Le ciel se remplit pendant le bonus
- **Description** : à chaque nuit, la scène change légèrement (aube plus proche, étoiles qui s'allument) ; la progression n'existe que dans le bonus en cours et disparaît à la fin.
- **Pourquoi** : sentiment d'avancée sans compteur persistant. **Coût** : M. **Risque** : bas (aucun état entre sessions). Rester éloigné des mécaniques de grille persistante d'autres jeux ; le bonus actuel garde ses étoiles dans le bonus seulement (voir `PATENT_BRIEF.md`).
- **Mesure** : test de lisibilité (« où en est le bonus ? ») ; compter les erreurs de compréhension.

### 8. Mini-histoire et décor par bonus
- **Description** : une phrase d'ouverture et une teinte de ciel propres à chaque bonus (la teinte par variante existe déjà).
- **Pourquoi** : donne de l'identité aux huit bonus, aide à les mémoriser. **Coût** : M (texte + éventuel art). **Risque** : bas ; art IA soumis aux vérifications de licence.
- **Mesure** : rappel spontané des noms de bonus en fin de test.

### 9. Fin de bonus en « carte du ciel »
- **Description** : le total final s'affiche sur un dessin des étoiles posées, avec les paliers atteints.
- **Pourquoi** : récompense visuelle, partageable (voir idée 21). **Coût** : M. **Risque** : bas.
- **Mesure** : test préférence A/B interne sur la carte de résumé actuelle.

## Sons et musique

### 10. Musique adaptative en trois couches
- **Description** : boucle calme en base, couche supplémentaire pendant les roues et le bonus, montée pour les gros gains ; coupure et volume réglables.
- **Pourquoi** : atmosphère, rythme émotionnel. **Coût** : L (création ou licence écrite). **Risque** : moyen : droits (musique de production à créer ou licencier par écrit, licence écrite sur toute la durée du contrat Stake, y compris 36 mois renouvelables).
- **Mesure** : écoute interne, fatigue après 15 minutes, taux de coupure du son en test.

### 11. Sons écoutés et réglés
- **Description** : faire écouter le pack synthétisé actuel (jamais écouté par moi) et ajuster volumes, hauteurs, répétitions ; vérifier l'absence de sons agressifs ou répétitifs.
- **Pourquoi** : base indispensable. **Coût** : M. **Risque** : bas.
- **Mesure** : retours d'au moins cinq auditeurs ; test avec casque et haut-parleur de téléphone.

### 12. Identité sonore par phase de lune
- **Description** : timbre différent pour croissant, quartier, pleine lune : l'oreille reconnaît la richesse du bonus.
- **Pourquoi** : renforce la lecture sans texte. **Coût** : M. **Risque** : bas.
- **Mesure** : test de reconnaissance les yeux fermés.

## Mode achat : choix de bonus et prix

### 13. Achat avec choix de la phase de lune
- **Description** : le joueur choisit entre plusieurs offres d'achat (par exemple phase 1 / 2 / 3), chacune avec son prix.
- **Pourquoi** : contrôle perçu, personnalisation du risque. **Coût** : L (nouveaux modes de maths : chaque offre est un mode distinct avec RTP 96 % ; régénération complète, vérification de l'écart entre modes). **Risque** : **élevé** : demande de maths neuves, rapprochement possible de la revendication « choix du joueur » (brevet 11798368 du dossier) ; à faire avaliser par un conseil PI avant tout travail ; règles de bonus buy de Stake non publiées. Pas d'achat qui choisit le type de bonus avant avis juridique.
- **Mesure** : avec le conseil d'abord ; ensuite RTP par mode, médiane, ruine, tests.

### 14. Fiche de prix du mode achat
- **Description** : un écran avant achat avec le prix (80x ou 90x, décision n°11), la médiane réelle du gain mesurée, la fréquence des gains élevés et la mention que le gain peut être inférieur au prix.
- **Pourquoi** : transparence ; réduit les regrets et les réclamations. **Coût** : S après mesure du nouveau système (les chiffres actuels du mode achat ne couvrent pas les huit bonus : à régénérer). **Risque** : bas ; n'afficher que des chiffres mesurés.
- **Mesure** : relecture des chiffres affichés contre `tools/` de simulation.

### 15. Confirmation d'achat en deux temps
- **Description** : bouton d'achat distinct du bouton TOURNER, confirmation explicite avec montant en clair ; pas d'achat par appui accidentel.
- **Pourquoi** : évite les erreurs coûteuses, signe de sérieux. **Coût** : S. **Risque** : bas.
- **Mesure** : taux d'achats annulés en démo.

## Accessibilité

### 16. Accessibilité visuelle et animations réduites
- **Description** : respect de `prefers-reduced-motion` (seul repéré dans la démo : étendre à toutes les animations lourdes et au suspense), contrastes suffisants, tailles de texte, pas d'information portée par la seule couleur (pourcentages des roues écrits en clair, déjà le cas), clignotements limités (risque photosensible).
- **Pourquoi** : plus de joueurs, moins de gêne. **Coût** : M. **Risque** : bas ; certaines juridictions imposent des limites sur les effets lumineux : à vérifier.
- **Mesure** : audit automatique de contraste, test manuel clavier / écran, test avec animations réduites.

### 17. Sous-titres des sons et retour haptique
- **Description** : indicateur visuel pour les sons clés (bonus, gros gain), vibration légère optionnelle, désactivable.
- **Pourquoi** : jeu possible sans son. **Coût** : M. **Risque** : bas.
- **Mesure** : test sans son avec consigne de deviner l'événement.

## Mobile

### 18. Pouce, orientation, poids
- **Description** : boutons principaux dans la zone du pouce, gestion de l'orientation paysage, chargement léger (images WebP déjà utilisées ; la démo fait 2,4 Mo avec les livres), polices hébergées localement, pas de blocage sur réseau lent.
- **Pourquoi** : l'essentiel du public joue sur téléphone. **Coût** : M. **Risque** : bas ; vérifier la licence des polices et contraintes de taille du SDK Stake (limites non publiées).
- **Mesure** : temps de chargement 4G simulé, fluidité (images par seconde) sur un téléphone d'entrée de gamme, captures 390 px.

## Onboarding (première minute)

### 19. Tutoriel de 20 secondes, sautable
- **Description** : trois cartes : « 3 Lunettes ouvrent les deux roues », « les roues choisissent le bonus et sa richesse », « les pourcentages affichés sont les vrais » ; table des gains accessible en un appui.
- **Pourquoi** : huit bonus et deux roues sont lourds à comprendre. **Coût** : M. **Risque** : bas ; ne pas faire de promesse de gain.
- **Mesure** : test de cinq nouveaux joueurs : savent-ils expliquer le déclenchement après une minute ?

### 20. Solde fictif clair dans la démo
- **Description** : bannière « démo, pas d'argent réel » discrète et permanente ; un bouton de remise du solde fictif.
- **Pourquoi** : confiance ; évite la confusion avec un jeu d'argent réel. **Coût** : S. **Risque** : bas ; pas de branding Stake ni de mention « casino » trompeuse.
- **Mesure** : question de compréhension en test.

## Partage et capture d'écran

### 21. Capture du gros gain
- **Description** : bouton « enregistrer l'image » qui produit une carte du ciel final avec le total, sans identifiant, sans solde ni nom d'opérateur.
- **Pourquoi** : bouche-à-oreille. **Coût** : M. **Risque** : moyen : art IA (droits, divulgation éventuelle), mentions publicitaires du jeu d'argent selon les pays, vie privée. Ne pas inciter au partage (pas de récompense pour partager).
- **Mesure** : nombre de captures en test, relecture juridique du texte joint.

## Rétention honnête (jeu responsable)

Principe : on ne cherche pas à faire jouer plus longtemps, mais à ce que le jeu soit agréable et compréhensible tant que le joueur choisit d'y rester. Les outils de jeu responsable sont en grande partie la responsabilité de l'opérateur (limites de dépôt, auto-exclusion) ; le jeu doit les rendre faciles d'accès et ne rien faire qui les contrarie.

### 22. Panneau jeu responsable
- **Description** : un accès permanent à : limites (selon ce que permet la plateforme), historique de la session, pause et sortie. Textes sobres, sans publicité.
- **Pourquoi** : confiance, exigence probable des opérateurs et régulateurs. **Coût** : M. **Risque** : à vérifier : exigences par juridiction non publiées par Stake ; ne pas créer d'état persistant propre au jeu (limites fournies par l'opérateur).
- **Mesure** : revue avec la liste des exigences que Stake ou l'opérateur communiquera ; test d'accessibilité du panneau en moins de deux appuis.

### 23. Rappel de durée et pause
- **Description** : horloge de session visible, rappel optionnel toutes les 30 à 60 minutes, bouton de pause. Pas de compte à rebours incitatif, pas de message de type « ne partez pas ».
- **Pourquoi** : contrôle perçu et honnêteté. **Coût** : S. **Risque** : à vérifier (selon juridiction, parfois obligatoire).
- **Mesure** : présence testée ; pas de mesure de rétention visée.

### 24. Résumé de session honnête
- **Description** : total misé, total gagné, net, sans formulation flatteuse ; un gain inférieur à la mise est présenté comme tel.
- **Pourquoi** : clarté ; évite l'illusion de gain (« petits gains = victoire »). **Coût** : S. **Risque** : à vérifier ; ne pas stocker entre sessions.
- **Mesure** : exactitude du calcul sur des séries simulées.

### Exclu volontairement
Séries et récompenses quotidiennes, faux quasi-gains, compte à rebours, offres « dernière chance », succès persistants, classements, tout état entre sessions, tout jackpot ou progressif.

---

## Plan en 3 lots

### Cette semaine (UI / son / textes, sans toucher aux maths)
- 11 (écoute et réglage des sons), 1 et 2 (lisibilité des gains), 6 (saut de la carte de présentation), 15 (confirmation d'achat), 20 (bannière démo), 24 (résumé de session), 23 (rappel de durée).
- Critère de sortie : captures 390 px, 0 erreur console, tests démo verts, aucune nouvelle affirmation de conformité.

### Ce mois
- 19 (tutoriel), 16 (accessibilité), 18 (mobile et poids), 3 et 4 (rythme et suspense, avec contrôle que chaque effet correspond à un événement du livre), 7 et 9 (ciel qui se remplit, carte de fin), 22 (panneau jeu responsable, selon exigences de l'opérateur).
- Régénérer et mesurer les maths du système à huit bonus (sessions, ruine, mode achat) avant l'idée 14.
- Parallèlement, côté humain : avis d'un conseil en brevets (n°16), lecture complète des CGU Stake (n°2), vérification des conditions Higgsfield, des polices et des marques (n°4, n°5).

### Plus tard
- 10 (musique de production, droits écrits), 12 (identité sonore par phase), 8 (histoires par bonus), 17 (haptique), 21 (capture de partage).
- 13 (achat avec choix de phase) uniquement après l'avis du conseil PI et la réponse de Stake sur les règles du mode achat ; sinon abandonner.
- Tout ce qui précède reste soumis à : pas de soumission, pas de publication, pas de mot « conforme » ou « libre de brevets ».
