# Synthèse des recherches (thème, mécaniques, brevets)

Sources : `1_community.md` à `5_github.md`. **Qualité des preuves : faible à moyenne.** Reddit n'a pas été accessible (aucun fil lu). Les pages de brevets étaient souvent tronquées. Aucune base de marques (EUIPO/USPTO) n'a pu être interrogée. « Rien trouvé » ne veut jamais dire « libre ». Rien ici n'est un avis juridique.

## Ce qui est solide
1. **La mine est un thème saturé.** Environ 32 titres sur une seule page de thème, dont quatre très proches de notre ensemble (cartoon + mineur + dynamite + gemmes + tumble) : Miner Cat (2026), Prospector Capybara, Mining Rush (Pragmatic), Dynamite Miner (Endorphina). La ligne Fire in the Hole (Nolimit City) occupe « nains et bombes ».
2. **Collisions de noms.** « Gus » apparaît dans deux slots d'or (Gold Rush Gus, Gus's Gold Megaways). « Unleashed » apparaît dans un titre du top 50 de Stake Engine (Samurai Dogs Unleashed). La mascotte « Old Gus » et le titre actuel sont donc à renommer dans tous les cas.
3. **Espace ouvert (preuve moyenne) :** style cartoon des années 60 avec mascotte, jauge de progression visible sur la grille, mode d'entrée directe présenté comme un choix d'histoire, personnage original.
4. **Brevets (aide à la décision) :** le tumble de base, les paiements par adjacence et les free spins à multiplicateur croissant apparaissent anciens (brevets annoncés expirés). Zones à éviter jusqu'à lecture par un conseil : hold-and-spin d'Aristocrat, Megaways, multiplicateurs persistants **par position**, cascades qui **créent des wilds**.
5. **Ce que nous faisons déjà :** RTP calculé à partir des tables, paiements en multiples de 0,1x, taux de gain de base proche de 29 %, mêmes RTP dans les deux modes, gain max atteignable.

## Ce qui touche notre jeu actuel
- Nos **veines** (multiplicateurs persistants par case) et notre **Fuse Line** qui transforme des cases en wilds tombent dans deux zones de la liste « à éviter jusqu'à lecture des revendications ».

## Décision proposée
Changer de thème et ajuster deux mécaniques, en gardant le jeu actuel intact comme solution de repli (dossiers séparés).

- **Thème : espionnage-jazz années 60, titre de travail « Agent Mambo »** (14 slots d'espionnage comptés, contre 32 pour la mine ; aucune collision de titre trouvée, avec la limite de l'outil de recherche). Éviter tout ce qui évoque James Bond ou la Panthère rose. Mascotte à créer, adulte, originale, nom sans collision.
- **Veines → un multiplicateur global** (jauge visible sur la grille), qui monte à chaque pas gagnant et persiste pendant les free spins : c'est la famille « free spins à multiplicateur croissant » annoncée expirée, et c'est aussi l'espace ouvert du marché (jauge visible). Plus de multiplicateur par case.
- **Fuse Line → mèche de bombe à retardement** : au lieu de créer des wilds, l'explosion **retire** les cases brûlées (elles disparaissent et de nouveaux symboles tombent, comme une cascade supplémentaire). Aucune création de wild.
- **UNLEASH → mode d'entrée directe présenté comme un choix de mission** (nom sans « buy », coût 100x, prix minimum et confirmation conservés).
- Les règles de la plateforme, les contrôles QA et l'infrastructure de test restent identiques.

## Coût et risque honnêtes
- Les maths changent (suppression des veines, nouvelle optimisation) : plusieurs heures de simulation.
- Tout l'art, le son, la mascotte, le logo, la tuile et la cover sont à refaire.
- La recherche de marque sur le titre final reste à faire par un humain.
- Si les maths du nouveau jeu n'atteignent pas les mêmes cibles (RTP 96 %, gain max 5 000x, forme de l'achat), le jeu actuel reste la version à soumettre.

## Autres idées retenues (communauté, GitHub)
- Expliquer le prix et le RTP du mode d'entrée directe sur un écran ; afficher RTP, volatilité, gain max.
- Garder un jeu de base vivant (taux de gain 25-30 %), éviter les longues séries vides.
- Un moment partageable (grosse chaîne), anticipation sonore, réactions de la mascotte liées aux événements du livre.
- Outils : rapport de type PAR (RTP par composante, histogramme, volatilité), simulateur de sessions, snapshot des livres avant refonte.
