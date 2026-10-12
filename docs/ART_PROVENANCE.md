# Provenance des visuels (art généré par IA)

Les visuels de `demo/art/` ont été générés le 2026-10-10 avec **Higgsfield** (modèle `gpt_image_2_5`), à la demande de l'utilisateur, avec des crédits payants du compte de l'utilisateur (coût : 0,25 crédit par image, soit environ 3,3 crédits pour 13 images). Ils remplacent les icônes vectorielles provisoires dessinées à la main.

## Ce qui a été généré
| Fichier | Rôle | Description du prompt (résumé) | Job Higgsfield |
|---|---|---|---|
| `astrolabe.webp` | H1 | astrolabe en laiton, anneaux gravés, étoile au centre | 60823dc5-2434-48ce-8d81-c9f702a89d54 |
| `moon.webp` | H2 | croissant de lune lumineux, cratères, étincelles | 742a806e-a5e6-4caa-9889-1bd66ab71215 |
| `comet.webp` | H3 | comète à tête blanc-or et longue traîne orange/magenta | 73e740d4-452f-433a-8206-d744a2883727 |
| `hourglass.webp` | H4 | sablier orné, sable violet et rose | 46828c02-c900-46b2-9987-5218e227f4c5 |
| `wild.webp` | Wild | étoile filante vert émeraude facettée | 2e314c47-0892-47e3-be60-ce208a5e1a36 |
| `telescope.webp` | Scatter | lunette en laiton sur trépied, lentille cyan | 67f52ee0-83cd-42e2-8fbf-c842dc09dacb |
| `star.webp` | Étoile à valeur | étoile cristal bleu glacier facettée | 0b478ff3-d973-4697-ac3a-f72631af7de6 |
| `A/K/Q/J.webp` | Bas niveau | lettres gravées en pierre fine (saphir, émeraude, améthyste, ambre) | ba70e6b7-…, 11c4d32e-…, bf8695ac-…, 1e17a9b6-… |
| `bg.webp` | Fond | ciel nocturne et dôme d'observatoire, nébuleuse | 400e9253-d15f-4e8a-adcd-8aa118b54d3a |
| `logo.webp` | Titre | « STELLAR VIGIL » en lettres dorées et constellations | 0f7e667e-87a0-4d83-b921-8bd8fc957489 |

Les prompts demandent un objet unique sur **fond noir pur** ; les images sont fondues dans le jeu par un mode de fusion CSS (`mix-blend-mode: screen`), faute de canal alpha. Les fichiers bruts (PNG 1024 px) ne sont pas versionnés (`.gitignore`) ; les versions WebP redimensionnées le sont.

## Garde-fous respectés
- Aucun prompt ne cite un jeu, une marque, un personnage ou un artiste ; aucune image de Huff N' Puff ni d'un autre jeu n'a servi de référence ; aucune image de référence n'a été utilisée.
- Univers original (observatoire, constellations) ; aucun loup, cochon, maison ni casque.

## À faire par un humain avant toute publication (non vérifié)
1. **Conditions d'utilisation de Higgsfield** : confirmer par écrit que les sorties du plan utilisé peuvent servir à un produit commercial, et à quelles conditions. Je n'ai pas lu ces conditions.
2. **CGU Stake Engine** : le développeur accorde à l'opérateur une licence de toute la propriété intellectuelle du jeu (graphismes compris) ; il faut s'assurer que les droits sur ces images permettent de la consentir.
3. **Droit d'auteur** : le statut de protection d'images générées par IA varie selon les pays ; à faire valider par un conseil. Conserver ce fichier, les prompts et les identifiants de jobs comme preuve de création.
4. **Ressemblance involontaire** : faire relire les images (en particulier le logo et la comète) pour vérifier qu'elles ne ressemblent pas à un visuel existant.
5. **Divulgation** : certaines plateformes ou juridictions demandent de déclarer le recours à l'IA générative.

## Ajout (2026-10-12) : roues
| Fichier | Rôle | Description du prompt (résumé) | Job Higgsfield |
|---|---|---|---|
| `wheel_rim.webp` | Cadre des roues | anneau doré d'astrolabe, graduations, petites étoiles et lunes, centre vide | b99f8c88-b698-4c87-8ca6-6c812eaadb64 |
| `wheel_hub.webp` | Moyeu des roues | médaillon doré, étoile à huit branches, petit cristal bleu | 87584ec7-7070-4a69-ad7e-07a4a6c85338 |

Modèle `gpt_image_2_5`, fond noir converti en transparence. Même garde-fous que ci-dessus (aucune référence, aucun nom de marque). Trois visuels de menu ont aussi été générés (jobs 707ab0d2-98cc-47b2-9001-663858c37a61, fa8fbab4-ab48-454c-8698-badc10d0536d, f2368020-d67f-4c40-b71b-d18ad2574d41) mais pas encore intégrés.
