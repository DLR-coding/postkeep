# Refonte de l'interface — conception

Date : 10 novembre 2026 · Branche : `feat/redesign` (partie de `feat/post-preview`)

## Intention

PostKeep sert à retrouver un post sauvegardé. L'interface actuelle (cartes génériques,
barre d'onglets native) rend ça laborieux dès qu'on a quelques dizaines de posts, et elle
recadre en carré des vidéos qui sont presque toutes verticales (TikTok, Reels). La refonte
donne à l'app une identité visuelle propre (dossiers en verre dépoli, autocollants de
plateforme), affiche les posts dans leur format 9:16 et rassemble navigation et recherche
dans une barre flottante.

Les choix viennent de trois tours de maquettes validés par l'utilisateur (artefacts privés
sur claude.ai, consultables par lui) :

- 1er tour (pistes A à E) : https://claude.ai/code/artifact/c9ac6e88-b141-4c73-b198-5324d2d4517c
- 2e tour (affichage 9:16) : https://claude.ai/code/artifact/afd0d2ec-9f77-4e5b-809d-4c88de1e74ab
- 3e tour (décisions restantes) : https://claude.ai/code/artifact/684afd53-89cd-4efe-af49-1fc99a9d0715

## Décisions de l'utilisateur

| Sujet | Décision |
|---|---|
| Écran Collections | Piste **A « Verre dépoli »** du 1er tour |
| Écran All posts | Variante **5 « Fiche »** du 2e tour |
| Barre de navigation | Celle de la piste **E** (champ de recherche + deux ronds Posts / Collections), en verre dépoli |
| Filtres par plateforme | Pilules **All / Instagram / TikTok / X**, sur **All posts uniquement** |
| En-têtes | Titre seul ; pas de chevron ni d'icône décorative |
| Créer une collection | Bouton **« + » rond en haut à droite** de l'écran Collections (option 2A) |
| Recherche | **Une seule**, dans la barre du bas ; elle remplace les deux barres actuelles |
| Feuille de détail | Restylée, même mécanique (aperçu mi-hauteur → tirer pour éditer) |
| Mode sombre | Décliné sur les deux écrans, la barre et la feuille |
| Vignette sans miniature | Option **6A** : couleur de la plateforme + autocollant + extrait du texte |
| SDK | Refonte sur le **SDK 57** actuel ; montée au SDK 58 ensuite, sur une autre branche |

## Objectifs

1. **Écran Collections (piste A).** Grille de 2 colonnes. Chaque collection est un dossier :
   un dos gris avec un onglet, jusqu'à 3 « feuilles » qui dépassent (chacune montre la
   miniature d'un post récent de la collection si elle existe, sinon deux traits de texte),
   une façade translucide qui recouvre le bas, et l'autocollant de la plateforme la plus
   présente dans la collection, en bas à droite de la façade. Sous le dossier : le nom et
   le nombre de posts dans une pastille. Le pseudo-dossier « Uncategorized » (virtuel, déjà
   existant) a une façade en pointillés et pas d'autocollant. En-tête : « Collections »,
   sous-titre « N collections · M posts », bouton « + » rond à droite qui ouvre la feuille
   de création existante. Appui long sur un dossier : la feuille d'actions existante
   (renommer / supprimer) est conservée telle quelle.
2. **Écran All posts (variante 5).** Liste d'une colonne. Chaque ligne : vignette 9:16 de
   80 px de large à gauche ; à droite « Plateforme · date », la légende sur 3 lignes max,
   la note de l'utilisateur dans un encart « Note » s'il y en a une, les puces de
   collection (« No collection » s'il n'y en a pas). Séparateur fin entre les lignes, pas
   de carte. Une vidéo verticale remplit la vignette avec un petit triangle « lecture » ;
   une image d'un autre format est centrée sur un fond flouté de la même image ; sans
   miniature, vignette 6A (voir 6). Le balayage vers la gauche (Supprimer / Retirer de la
   collection) est conservé. L'écran d'une collection (`/collection/[id]`) utilise la même
   ligne.
3. **Filtres.** Sous le titre de All posts : pilules All / Instagram / TikTok / X, une seule
   active. Filtre en mémoire sur la plateforme déduite de l'URL. Quand un filtre est
   actif, une ligne « N TikTok posts » apparaît au-dessus de la liste.
4. **Barre de navigation flottante.** En bas, au-dessus du contenu, sur les deux onglets :
   à gauche un champ de recherche en pilule (« Search notes and links » sur Posts,
   « Search collections » sur Collections), à droite une pilule avec deux boutons ronds
   (liste = Posts, dossier = Collections), le rond actif en plein contraste. Verre dépoli
   avec un vrai flou (`expo-blur`). La barre remplace `NativeTabs`. Elle se cale au-dessus
   du clavier quand le champ a le focus. Elle n'apparaît pas sur les écrans empilés
   (`/collection/[id]`, partage).
5. **Recherche.** Le champ de la barre filtre l'onglet affiché : sur Posts, légende + note +
   URL (insensible à la casse) ; sur Collections, le nom. Le terme trouvé est surligné dans
   les lignes de posts. Une croix vide le champ. Ligne « N results for “terme” » au-dessus
   de la liste. Changer d'onglet vide le champ.
6. **Vignette de secours (6A).** Fond de la couleur de la plateforme (dégradé Instagram,
   noir avec halos cyan/rose pour TikTok, gris très foncé pour X et Threads), extrait de la
   légende ou de la note en blanc (7 lignes max), petit autocollant en bas à gauche. Sert
   aussi pour un lien inconnu (couleur neutre, pas d'autocollant).
7. **Feuille de détail.** Aperçu à mi-hauteur : grande vignette 9:16 (≈ 92 px) à gauche,
   à droite plateforme, URL tronquée, puces de collection, date ; puis « Caption » (si
   présente), « Note » (si présente), indice « Pull up to edit », et en pied le bouton
   « Open in <plateforme> » à la couleur de la plateforme. Plein écran (édition) : en-tête
   compact (petite vignette + plateforme + date), puis **Collections en haut** : toutes
   les collections en puces à bascule (cochée = pleine avec ✓, non cochée = grise), sur
   deux lignes, défilables ; la puce « + New » en pointillés ouvre la feuille empilée
   existante `CollectionPickerSheet` (recherche + création) — *choix du constructeur de
   la conception : les puces à bascule viennent de la maquette validée, le rôle de
   « + New » est mon choix pour garder la création là où elle existe déjà*. Puis la
   **note qui occupe tout le reste** et défile seule (c'est la tâche « réagencer l'écran
   d'édition » de la phase 7 de `TODO.md`) ; en pied Open (contour), Save (plein), corbeille.
   **Bug existant à corriger dans ce cadre** (constaté sur appareil le 10 novembre) : en
   édition, avec une note longue, on voit le début du texte mais le champ ne défile pas.
   Le bandeau de debug laissé dans `post-fields-form.tsx` (commit c92e0eb) affichait
   `outer=728 collections=116 noteBlock=564 noteWrapper=524 content=524` (dp, écran de
   360 × 780 dp) : le cadre de la note descend sous le pied Open/Save et sort de l'écran,
   et comme le contenu (524) tient dans ce cadre trop grand, le champ n'a rien à faire
   défiler ; un glissé déclenche une sélection de texte. Piste principale : la hauteur
   disponible est calculée sans retirer celle du pied (`paddingBottom: footerHeight` de
   `post-detail-sheet.tsx` ne réduit pas l'espace mesuré). Critère : avec une note plus
   longue que l'espace, la dernière ligne visible est juste au-dessus du pied, et un glissé
   dans la note la fait défiler. Le débogage (bandeau rouge, `console.log('[note-debug]')`)
   est retiré une fois le correctif en place.
8. **Mode sombre.** Toutes les couleurs nouvelles passent par les jetons de thème (clair et
   sombre). En sombre : verre fumé, feuilles des dossiers gris foncé. Les couleurs de
   plateforme ne changent pas (autocollant Instagram en dégradé, vignette 6A, bouton
   « Open in … ») ; seuls les autocollants noirs (TikTok, X, Threads) prennent une bordure
   claire pour se détacher du fond sombre, comme sur la maquette 5.

## Non-objectifs

- L'écran de sauvegarde (feuille de partage) n'est pas redessiné ; il hérite seulement des
  jetons de couleur s'il les utilise déjà.
- Pas de changement de police (police système).
- Pas de montée de SDK, pas de changement du schéma de la base.
- Les deux autres tâches de la phase 7 (« + » en icône dans `CollectionPickerSheet`,
  dialog de suppression custom) ne font pas partie de cette refonte.
- Pas de nouvelle source de miniatures : la refonte affiche ce que `posts.caption` et
  `posts.thumbnail_url` contiennent déjà.

## Anti-objectifs (échec même si « ça marche »)

- Un défilement qui saccade à cause du flou. Le flou en temps réel (`BlurView`) ne va que
  dans la barre. Le fond flouté derrière une image qui n'est pas en 9:16 est un flou
  statique de l'image (`blurRadius` d'`expo-image`), calculé une fois : accepté, avec un
  contrôle de fluidité du défilement sur appareil comme critère (*mon choix*).
- Casser le comportement clavier de la feuille de détail, validé sur appareil en phase 3
  (`BottomSheetTextInput` + `keyboardBehavior="fillParent"`).
- Des couleurs en dur qui ne marchent que dans un thème (`CONTRIBUTING.md` l'interdit).
- Une barre flottante qui masque la dernière ligne de la liste ou le bouton de la feuille.

## Contraintes

- `AGENTS.md` : NativeWind 4.2.6 / Tailwind 3.4.19 épinglés ; `npx expo install` avant
  `npm install` ; vérifier la doc des bibliothèques (Context7, doc Expo v57) avant de coder ;
  en cas d'incompatibilité d'un module natif, s'arrêter et signaler.
- Données persistantes en SQLite uniquement ; l'état d'interface (onglet, texte de
  recherche, filtre) peut aller dans Zustand ou en état local.
- `expo-blur` (doc v57 vérifiée le 9 novembre) : sur Android le flou demande un
  `BlurTargetView` autour du contenu et `blurTarget` sur chaque `BlurView` ;
  `blurMethod="dimezisBlurViewSdk31Plus"` (vrai flou Android 12+, voile translucide
  en dessous) ; rendre le `BlurView` **après** la liste (FlashList) sinon le flou ne se met
  pas à jour ; `borderRadius` ignoré → `overflow: 'hidden'` sur un parent.
- Façades des dossiers : blanc (ou gris fumé) translucide **sans** `BlurView` — un flou par
  tuile dans une grille qui défile a un coût inconnu.
- `expo-blur` est un module natif : un nouveau build EAS est nécessaire (il embarquera aussi
  `react-native-webview`, déjà ajouté sur la branche). EAS builde depuis `git HEAD`.
- Vérifications de fin : `npx expo-doctor` 21/21, `npx @react-native-reusables/cli doctor
  --yes` « All checks passed », types et lint sans nouvelle erreur, test sur appareil réel
  en clair et en sombre, clavier compris.

## Laissé au constructeur

- **Comment remplacer `NativeTabs`.** Recommandation : `Tabs` d'`expo-router` (onglets JS,
  non expérimentaux) avec la prop `tabBar` qui rend la barre flottante ; `expo-router/ui`
  (onglets « headless ») est une alternative, mais marquée expérimentale dans la doc.
- Où vit le texte de recherche partagé entre la barre et les écrans (petit store Zustand
  d'interface, ou contexte).
- Comment savoir si un post est vertical : `isVerticalVideo` existe déjà dans
  `src/components/post-card.tsx` (TikTok, ou Instagram avec `/reel/`) ; le ratio réel de
  l'image peut aussi être lu au chargement par `expo-image`.
- Quelles miniatures montrer sur les feuilles d'un dossier (les 3 posts les plus récents
  qui en ont une, par exemple) et comment calculer la plateforme dominante — une requête de
  plus dans `src/db/collections.ts` est acceptable, en gardant la règle `deleted_at IS NULL`
  et la limite de réactivité de `useLiveQuery` documentée dans `src/db/posts.ts`.
- Le découpage en composants, les valeurs exactes de rayons, d'ombres et de transparence,
  tant que le rendu reste fidèle aux maquettes.
