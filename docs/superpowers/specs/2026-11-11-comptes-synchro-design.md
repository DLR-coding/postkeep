# Comptes et synchronisation — conception

Date : 11 novembre 2026 · Branche prévue : `feat/account-sync` · Phase : V1.5 (Synchronisation)

## Intention

Aujourd'hui les posts ne vivent que sur le téléphone : une réinstallation ou un nouveau
téléphone les perd, et deux appareils ne partagent rien. Un compte **optionnel** sauvegarde
les posts et collections dans Supabase et les synchronise entre les appareils du même
compte. Sans compte, l'app reste exactement ce qu'elle est (hors ligne, local).

## Décisions de l'utilisateur (11 novembre 2026)

| Sujet | Décision |
|---|---|
| Rôle du compte | **Synchro + sauvegarde** entre les appareils d'un même compte. Pas de partage entre personnes |
| Connexion | **Email + mot de passe**, inscription classique |
| Moteur de synchro | **Synchro maison** sur les colonnes `updated_at` / `deleted_at` déjà présentes, pas PowerSync |
| Déconnexion | **Les données du compte sont retirées du téléphone** (elles restent dans le compte) |
| Suppression du compte | **Oui, dans cette fonctionnalité** |
| Doublons entre appareils | L'utilisateur s'attend à n'en voir aucun : traités à la connexion (voir objectif 5) |

## Choix du concepteur (à valider)

- **Confirmation d'email désactivée** dans Supabase. Le service d'email intégré de Supabase
  n'envoie qu'aux membres de l'équipe du projet, 2 emails par heure. Avec la confirmation
  activée, personne d'autre ne pourrait s'inscrire. Conséquence : pas de « mot de passe
  oublié » tant qu'un serveur SMTP (Resend + un nom de domaine) n'est pas branché — un
  mot de passe oublié se réinitialise à la main depuis le tableau de bord Supabase. À faire
  avant d'ouvrir l'app à d'autres personnes (TODO). Effet de bord : rien ne prouve que
  l'email appartient à celui qui s'inscrit — quelqu'un peut créer un compte avec l'adresse
  d'un autre (et son propre mot de passe), qui trouvera ensuite l'adresse « déjà prise ».
  Le mot de passe protège la connexion, pas la propriété de l'adresse.
- **Session stockée dans le magasin clé-valeur d'expo-sqlite** (`expo-sqlite/kv-store`, déjà
  utilisé pour le thème), comme `storage` du client Supabase. Pas de chiffrement en plus :
  le tutoriel Expo de Supabase le présente comme optionnel, et le fichier est dans le bac à
  sable de l'app. Résultat : **aucun module natif ajouté**, pas de nouveau build de dev
  (à confirmer en vérifiant que `@supabase/supabase-js` tourne sans polyfill en RN 0.86).
- **Dernière écriture gagnante** par ligne, comparée sur `updated_at` = heure de la
  modification, prise sur l'appareil (elle peut avoir lieu hors ligne, le serveur ne la
  connaît pas). Le curseur de pull, lui, utilise l'heure du serveur (`server_updated_at`).
  Alternative écartée : départager à l'heure d'arrivée sur le serveur — insensible à
  l'horloge du téléphone, mais une vieille modification faite hors ligne écraserait une
  plus récente le jour où elle se synchronise. Suffisant : un compte n'est modifié que par
  une personne.

## Objectifs

1. **Écran Compte** (section « Account » des paramètres, qui remplace « Sign in — Coming
   soon »). Déconnecté : ligne « Sign in » qui ouvre une feuille avec email, mot de passe
   (8 caractères minimum), bascule « Sign in » / « Create account », erreurs lisibles
   (mauvais mot de passe, email déjà pris, pas de réseau). Connecté : email du compte,
   état de synchro (« Synced 2 min ago », « Syncing… », ou l'erreur), « Sign out »,
   « Delete account ». Styles du système de design (`sheet-kit`, `ConfirmDialog`).
2. **Base Supabase.** Tables `collections`, `posts`, `post_collections` qui reprennent les
   colonnes locales (dates en millisecondes `bigint`, comme en local), plus :
   - `user_id uuid not null references auth.users on delete cascade` ;
   - `server_updated_at` posée par le serveur à chaque écriture réelle (curseur de pull,
     indépendant des horloges des appareils).
   RLS sur les trois tables : chaque opération exige `user_id = auth.uid()`. Un trigger
   `BEFORE UPDATE` **ignore une écriture dont `updated_at` n'est pas plus récent** que la
   ligne en place (dernière écriture gagnante côté serveur, et pas de rebond infini entre
   appareils). Migrations SQL versionnées dans `supabase/migrations/`.
3. **Synchronisation** (`src/lib/sync/`), en deux temps :
   - **push** : envoie (upsert) les lignes locales dont `updated_at` dépasse la marque du
     dernier push réussi ;
   - **pull** : récupère les lignes dont `server_updated_at` dépasse le curseur de la table,
     par pages ; une ligne reçue n'écrase la locale que si son `updated_at` est plus récent.
   Ordre des tables respecté (collections et posts avant `post_collections`). Déclenchée :
   à la connexion, au lancement, au retour au premier plan, et quelques secondes après une
   écriture locale. Une seule synchro à la fois. Hors ligne : rien ne casse, elle reprend
   plus tard. Marques et curseurs dans le kv-store, par compte.
4. **Première connexion d'un appareil.** Les lignes locales sans `user_id` (créées sans
   compte) sont rattachées au compte, puis poussées. C'est le seul moment où des données
   déjà présentes rejoignent un compte.
5. **Fusion des doublons à la connexion.** Cas réel : on a utilisé l'app sans compte sur
   deux téléphones, puis on se connecte sur les deux — le même post peut exister des deux
   côtés. À la connexion, **après** le premier pull et **avant** le rattachement :
   - une collection locale du même nom (casse et espaces ignorés) qu'une collection du
     compte est fusionnée dans celle du compte ;
   - un post local de même URL qu'un post du compte est fusionné dedans : collections
     réunies, notes accolées si elles diffèrent, la copie locale passe en `deleted_at`.
   Hors de ce moment, un post sauvegardé hors ligne sur deux appareils à la fois peut
   donner un doublon : accepté (rare, supprimable à la main).
6. **Déconnexion.** Pousse d'abord ce qui n'est pas synchronisé. Si le push échoue (hors
   ligne), la déconnexion est refusée avec un message ; pas de perte silencieuse. Puis
   vide les trois tables locales et les marques de synchro, et revient au mode sans compte.
   *Exception assumée à « jamais de vrai DELETE »* : ce n'est pas une suppression de
   données (elles restent dans le compte, pierres tombales comprises), c'est le cache de
   l'appareil qu'on vide. À consigner dans ARCHITECTURE.md.
7. **Suppression du compte.** `ConfirmDialog` destructif, puis fonction Postgres
   `delete_my_account()` (`security definer`) qui supprime l'utilisateur d'`auth.users` ;
   ses lignes partent en cascade. Puis même nettoyage local que la déconnexion. Exception
   au « jamais de vrai DELETE » côté serveur, voulue : c'est le droit à l'effacement.
8. **Réveil du projet Supabase.** Workflow GitHub Actions planifié tous les 3 jours
   (`.github/workflows/supabase-keepalive.yml`) : une requête REST en lecture avec la clé
   publishable, pour que le tier gratuit ne se mette pas en pause après 7 jours sans
   activité. URL et clé en secrets GitHub. Limite : GitHub désactive un workflow planifié
   après 60 jours sans activité sur le dépôt (il prévient par email ; un clic le relance).
9. **Configuration.** `EXPO_PUBLIC_SUPABASE_URL` et `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   en `.env.local` pour le dev (`.env.example` commité) et en variables d'environnement
   EAS pour les builds. La clé publishable est publique par conception (RLS protège les
   données), mais reste hors du code.

## Non-objectifs

- Partage de collections entre personnes, données d'un autre compte.
- Connexion Google, lien magique, mot de passe oublié (attend le SMTP).
- Synchro en temps réel (Realtime) : la synchro se déclenche aux moments listés, pas en
  continu.
- PowerSync, changement de moteur SQLite, changement du schéma local (les 5 colonnes de
  synchro existent déjà ; `user_id` local reste `text`).
- iOS.

## Anti-objectifs (échec même si « ça marche »)

- Un mur de connexion : l'app doit rester utilisable sans compte, sans aucun rappel insistant.
- Perdre une modification : une déconnexion ou une synchro interrompue ne doit jamais
  effacer une écriture non poussée.
- Voir les données d'un autre compte (RLS manquante ou fausse). Tester avec deux comptes.
- Une synchro qui fige l'interface ou qui tourne en boucle.
- Casser `useLiveQuery` : les écrans doivent se mettre à jour seuls après un pull.

## Contraintes

- `AGENTS.md` : `npx expo install` avant `npm install` ; doc vérifiée (Context7, doc Supabase
  à jour) avant de coder ; module natif incompatible → s'arrêter et signaler.
- Données persistantes en SQLite uniquement (la session et les curseurs vont dans le
  kv-store d'expo-sqlite, qui est du SQLite).
- `useLiveQuery` n'écoute que la table racine de la requête (limite documentée dans
  `src/db/posts.ts`) : un pull qui ne touche que `post_collections` doit quand même
  rafraîchir les écrans (même astuce que l'écriture locale : toucher `updated_at` du post ?
  à trancher au plan — ça ne doit pas déclencher un push inutile en boucle).
- Logique pure (choix de la ligne gagnante, fusion des doublons, planification push/pull)
  séparée du réseau et testée avec `node --test`, comme `src/lib/*.test.ts`.
- Vérifications de fin : types, lint, tests, `expo-doctor` 21/21, doctor RNR, test sur
  appareil réel avec deux comptes et deux sessions (dont une hors ligne puis reconnectée).

## Laissé au constructeur

- Découpage de `src/lib/sync/` et du client Supabase (`src/lib/supabase.ts`).
- Appliquer les migrations : CLI `supabase db push` ou éditeur SQL du tableau de bord.
- Pagination du pull (taille de page), délai avant la synchro qui suit une écriture.
- Message exact des erreurs d'authentification et de synchro.

## Risques connus

- **Horloges des appareils** : un téléphone en retard perd ses modifications face à une
  modification plus ancienne mais horodatée plus tard. Accepté pour un seul utilisateur.
- **Transactions qui se croisent** sur le serveur : un pull peut manquer une ligne validée
  après une ligne plus récente. Négligeable à un utilisateur ; à noter en `shortcut:`.
- **Tier gratuit Supabase** mis en pause après 7 jours sans requête : évité par le workflow
  de réveil (objectif 8) ; si celui-ci est désactivé, la synchro échoue proprement jusqu'à
  la remise en route depuis le tableau de bord.
