# Journal des itérations

## Itération 0 (2026-10-09, avant la boucle)
- Moteur : base 5x4 ways + bonus « Nuit des Constellations » 5x5. RTP 96,0 % sur 10 000 simulations par mode.
- Ajouts : étoiles à valeur en jeu de base (pipeline relancé, formats vérifiés), démo jouable `demo/index.html`.
- Recherches : dossier brevets (6 brevets Aristocrat), règles Stake, conflits de noms.
- En cours au moment du lancement de la boucle : roue de sauvegarde (wager saver) et renommage des paliers hors du vocabulaire « jackpot ».

## Itération 1 (2026-10-09, 18:12-18:45 UTC)
- Wager saver : roue de sauvegarde en fin de bonus (plancher = mise payée pour entrer). Mesuré à 10 000 simulations : en achat, roue présente dans environ 78 % des books, « sauvée » dans environ 38 % d'entre elles.
- Paliers renommés hors vocabulaire « jackpot » ; étoiles à valeur en jeu de base.
- Validation à 100 000 simulations : RTP 96,0 % (base et bonus), spins sans gain 71,6 % en base, écart-type 10,1 (base) et 95,9 (achat).
- Tests : 26 passent. Le test de RTP lit seulement les tables de poids (0,2 s) ; le reste de la suite prend environ 100 s à 100 000 simulations.
- Démo : roue animée, étoiles à valeur, nouveaux noms ; books ré-exportés depuis la bibliothèque à 100 000.
- Incident : le worker a redémarré pendant l'itération ; la routine s'est déclenchée deux fois (15:12 et 18:12 UTC), une seule itération a été jouée. Une commande précédente, interrompue, avait déjà appliqué une partie des modifications : doublons nettoyés avant de relancer.
- Pour l'itération suivante : mesurer la répartition du RTP par composante (ways, étoiles, bonus, roue, zones), puis régler le coût du bonus buy et la table des gains ; audio procédural dans la démo ; texte de règles.
