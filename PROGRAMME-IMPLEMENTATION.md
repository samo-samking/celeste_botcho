# Céleste Bôtchô — Programme d'implémentation

Programme complet, de l'état actuel du dépôt jusqu'à la mise en ligne et au lot 3. Il s'appuie sur le **Cahier des charges** et l'**Architecture technique** du 6 octobre 2026, et les complète sur trois points : la charte graphique détaillée, le SEO complet et les e-mails transactionnels.

**Légende** : `[x]` fait · `[ ]` à faire · 🔒 bloqué par une décision de la vendeuse (voir §2)

---

## Sommaire

1. [État actuel du projet](#1-état-actuel-du-projet)
2. [Décisions à obtenir de la vendeuse](#2-décisions-à-obtenir-de-la-vendeuse)
3. [Conventions de travail](#3-conventions-de-travail)
4. [Charte graphique et design system](#4-charte-graphique-et-design-system)
5. [Rappel d'architecture](#5-rappel-darchitecture)
6. [Phase 0 — Finir le socle](#phase-0--finir-le-socle)
7. [Phase 1 — Couche partagée](#phase-1--couche-partagée-packagesshared)
8. [Phase 2 — Design system et coque du site public](#phase-2--design-system-et-coque-du-site-public)
9. [Phase 3 — Pages publiques](#phase-3--pages-publiques)
10. [Phase 4 — Admin : catalogue et configuration](#phase-4--admin--catalogue-et-configuration)
11. [Phase 5 — Commande, WhatsApp et e-mails](#phase-5--commande-whatsapp-et-e-mails)
12. [Phase 6 — Admin : gestion quotidienne](#phase-6--admin--gestion-quotidienne)
13. [Phase 7 — SEO et partage social](#phase-7--seo-et-partage-social)
14. [Phase 8 — PWA et hors connexion](#phase-8--pwa-et-hors-connexion)
15. [Phase 9 — Performance](#phase-9--performance)
16. [Phase 10 — Accessibilité](#phase-10--accessibilité)
17. [Phase 11 — Sécurité](#phase-11--sécurité)
18. [Phase 12 — Conformité et contenus légaux](#phase-12--conformité-et-contenus-légaux)
19. [Phase 13 — Lot 3 : automatisation](#phase-13--lot-3--automatisation)
20. [Phase 14 — Recette et mise en ligne](#phase-14--recette-et-mise-en-ligne)
21. [Planning récapitulatif](#planning-récapitulatif)
22. [Annexes](#annexes)

---

## 1. État actuel du projet

| Élément | État |
|---|---|
| Arborescence complète (monorepo npm workspaces) | [x] |
| Configs TypeScript strict, Vite (public multi-pages + PWA, admin SPA), ESLint | [x] |
| `firebase.json` (2 cibles Hosting, en-têtes, émulateurs, Functions) | [x] |
| Règles Firestore de départ + 7 index composites | [x] (non déployés) |
| Projet Firebase `celestebotcho-322a5`, forfait Blaze, app web enregistrée | [x] |
| Base Firestore créée en `africa-south1` | [x] |
| Connexion Firebase (`services/firebase.ts`) + App Check reCAPTCHA v3 | [x] |
| Cloudinary : cloud `dwzhiapy0`, preset `celeste_admin_unsigned` | [x] |
| Secrets : `SMTP_USER`, `SMTP_PASSWORD`, `RECAPTCHA_SECRET_KEY`, `CLOUDINARY_API_SECRET` | [x] |
| Fonction `onMessageCreated` (e-mail à la propriétaire) | [x] (non déployée) |
| Boîte d'envoi `contact@celestebotcho.com` (LWS, SMTP 465) | [x] |
| Image OG par défaut (`apps/public/public/og/og-default.jpg`, 1200×630, 139 Ko) + couleurs de la charte | [x] |
| Logo (`brand/logo.png`), favicon, icônes PWA 180 / 192 / 512 / maskable ; originaux rangés dans `design/` (non publié) | [x] |
| Site Hosting `admin` | [ ] |
| Code applicatif (vues, ViewModels, modèles…) | [ ] fichiers vides |

---

## 2. Décisions à obtenir de la vendeuse

À trancher **avant** la phase indiquée. Tant qu'une décision manque, on avance avec la valeur provisoire.

| # | Question | Bloque | Valeur provisoire |
|---|---|---|---|
| D1 | Quelle grille de prix fait foi : 2 500 / 4 000 / 8 500 F ou 3 000 / 5 000 / 10 000 F ? | Phase 4 (saisie catalogue) | aucune, pas de saisie avant réponse |
| D2 | Numéros officiels : 07 67 10 78 04, 05 07 88 44 70, 01 41 04 76 71 ? Lequel pour WhatsApp ? | Phase 3 | `2250507884470` |
| D3 | Formats : 30 / 55 / 115 boules, ou aussi 150 ? | Phase 4 | 30 / 55 / 115 |
| D4 | Stock suivi à l'unité ou simple disponible / rupture ? | Phase 4 | `stock: null` (non suivi) |
| D5 | Livraison Abidjan : prix unique 1 500 F ou grille par commune ? | Phase 5 | Abidjan 1 500 F, intérieur 2 000 F |
| D6 | Nom de domaine (`celestebotcho.com` ?) et qui le paie | Phase 14 | — |
| D7 | Composition, mode d'emploi, précautions de **chaque** produit | Publication des produits | brouillons |
| D8 | Démarches AIRP et ARTCI : qui, quand ? | Phase 14 | — |
| D9 | Nombre d'utilisateurs de l'admin | Phase 6 | 1 propriétaire |
| D10 | Vraies photos produits en plus des affiches ? | Phase 3 / 4 | affiches recadrées |
| D11 | Adresse qui reçoit les notifications | Phase 5 | `contact@celestebotcho.com` |
| D12 | Logo en **SVG** ou PNG ≥ 1 024 px (le PNG actuel ne fait que 201 × 79 px) | Phase 8 (icônes nettes) | ✅ couleurs et logo en place ; icônes tirées du monogramme de l'image OG, un peu douces |
| D13 | Durée de conservation des coordonnées clientes | Phase 12 | 24 mois |
| D14 | Collecter l'e-mail des clientes (facultatif) pour leur envoyer les confirmations ? | Phase 5 | oui, champ facultatif |

---

## 3. Conventions de travail

**Code**
- TypeScript strict partout ; aucun `any` sans commentaire justificatif.
- Fichiers en `kebab-case`, classes en `PascalCase`, signaux et fonctions en `camelCase`.
- Une View = `x.view.ts`, un ViewModel = `x.viewmodel.ts`, un style = `x.css`, dans le même dossier.
- Montants en **FCFA entiers** (`number`), jamais de décimales. Formatage uniquement via `formatFcfa()`.
- Dates : `Timestamp` Firestore posé par `serverTimestamp()` ; jamais `new Date()` côté écriture.
- Téléphones stockés au format `+225XXXXXXXXXX` ; affichés au format `07 67 10 78 04`.
- Textes visibles en français ; code, noms de variables et commits en anglais ou en français, mais toujours la même langue dans un même fichier.

**Règles d'import** (vérifiées par ESLint)
1. `apps/*` importe `packages/shared`, jamais l'inverse.
2. Une View n'importe que son ViewModel et des composants.
3. Seuls `repositories/` et `services/` importent le SDK Firebase.

**Git**
- Branche `main` = production. Une branche par phase ou fonctionnalité : `feat/catalog-page`, `fix/cart-total`.
- Commits courts au présent : `feat(catalog): filtre par catégorie`.
- Chaque pull request déclenche une prévisualisation Hosting (Phase 0, CI).

**Définition de « terminé »** pour toute tâche
- Types OK, lint OK, tests unitaires écrits et verts.
- Testé sur un écran de 360 px de large et sur un Android d'entrée de gamme (ou émulation Chrome « Moto G4 » + réseau « Fast 3G »).
- Aucune erreur dans la console.

---

## 4. Charte graphique et design system

Source de vérité : [`apps/public/src/styles/tokens.css`](apps/public/src/styles/tokens.css) (copie identique dans `apps/admin`). **Aucune couleur, taille ou durée n'est écrite en dur ailleurs** : on utilise toujours une variable.

> Couleurs **relevées sur l'image OG officielle** (`apps/public/public/og/og-default.jpg`) : fond chocolat presque noir, or chaud, caramel des boules Toffi. Pour tout ajustement, on modifie uniquement `tokens.css`.

### 4.1 Couleurs

**Palette de base**

| Token | Valeur | Usage |
|---|---|---|
| `--choco-950` | `#0d0500` | Texte sur bouton or, fond le plus sombre |
| `--choco-900` | `#140800` | **Fond principal du site** |
| `--choco-800` | `#1f0e03` | Surfaces : cartes, tiroir panier, en-tête |
| `--choco-700` | `#2e1606` | Surfaces secondaires, survol de carte |
| `--choco-600` | `#683201` | Bordures marquées, séparateurs |
| `--choco-500` | `#a94d17` | Éléments désactivés (jamais pour du texte : 3,5:1) |
| `--caramel-600` | `#883c05` | Caramel foncé : texte d'accent et liens de l'**admin** (thème clair) |
| `--caramel-500` | `#a94d17` | Caramel : illustrations, puces, fonds de badges |
| `--gold-600` | `#dd931b` | Or foncé : bouton pressé, dégradé |
| `--gold-500` | `#efb830` | **Accent principal** : boutons, liens, prix |
| `--gold-400` | `#f7c83e` | Survol de l'accent, prix |
| `--gold-300` | `#fdda4b` | Titres en or clair, reflets du dégradé |
| `--cream-50` → `--cream-200` | `#fdf9f2` → `#f1e6d2` | Texte principal et secondaire, fonds clairs de l'admin |
| `--color-whatsapp` | `#25d366` | Bouton WhatsApp flottant uniquement |

**Rôles sémantiques** (à utiliser dans les composants plutôt que la palette brute)

| Token | Pointe vers | Usage |
|---|---|---|
| `--color-bg` | `--choco-900` | `body` |
| `--color-surface` / `--color-surface-2` | `--choco-800` / `--choco-700` | Cartes, tiroirs, modales |
| `--color-text` / `--color-text-muted` | `--cream-100` / `--cream-200` | Texte |
| `--color-accent` / `--color-accent-hover` | `--gold-500` / `--gold-400` | Boutons principaux, liens |
| `--color-on-accent` | `--choco-950` | Texte posé sur l'or |
| `--color-price` / `--color-price-old` | `--gold-400` / crème à 60 % | Prix promo et prix barré |
| `--color-border` | or à 25 % | Bordures fines |
| `--color-success` / `warning` / `danger` / `info` | vert / ambre / rouge / bleu | Statuts, toasts, badges |

**Contrastes à respecter** (WCAG AA : 4,5:1 pour le texte courant, 3:1 pour le texte ≥ 24 px)

| Combinaison | Ratio approx. | Verdict |
|---|---|---|
| `--cream-100` sur `--choco-900` | 18,2:1 | ✅ texte courant |
| `--gold-500` sur `--choco-900` | 10,9:1 | ✅ texte courant et prix |
| `--choco-950` sur `--gold-500` | 11,1:1 | ✅ texte des boutons |
| `--cream-200` sur `--choco-700` | 13,8:1 | ✅ |
| `--caramel-500` sur `--choco-900` | 3,5:1 | ⚠️ décoratif uniquement, pas de texte |
| `--gold-600` sur `--cream-50` | 2,4:1 | ❌ jamais de texte or sur fond clair (admin) |
| Prix barré (crème 60 %) sur `--choco-800` | à mesurer | ⚠️ vérifier ≥ 4,5:1 ; sinon passer à 75 % |

- [ ] Vérifier chaque combinaison réelle avec l'outil de contraste de Chrome DevTools une fois la charte définitive.

**Statuts de commande** (badges, admin et page Suivi)

| Statut | Libellé | Couleur |
|---|---|---|
| `new` | Nouvelle | `--color-info` |
| `confirmed` | Confirmée | `--gold-500` |
| `preparing` | En préparation | `--color-warning` |
| `shipped` | Expédiée | `--choco-500` sur fond clair |
| `delivered` | Livrée | `--color-success` |
| `cancelled` | Annulée | `--color-danger` |

**Admin** : même palette, mais en **thème clair** pour la lisibilité des tableaux : fond `--cream-50`, surfaces blanches, texte `--choco-900`, liens et texte d'accent `--caramel-600` ; l'or ne sert qu'en **fond** de bouton (texte `--choco-950` dessus), jamais en texte sur fond clair. À définir dans `apps/admin/src/styles/base.css` en surchargeant les rôles sémantiques.

### 4.2 Typographie

| Rôle | Police | Graisses | Usage |
|---|---|---|---|
| Titres | **Playfair Display** (variable) | 600, 700 | H1–H3, nom de produit, bandeau promo |
| Texte | **Poppins** | 400, 500, 600 | Corps, boutons, formulaires, prix |

**Chargement — auto-hébergé, pas de Google Fonts** (performance, CSP stricte, pas d'appel tiers) :
- [ ] `npm i -w @celeste/public -w @celeste/admin @fontsource-variable/playfair-display @fontsource/poppins`
- [ ] Importer uniquement les sous-ensembles `latin` et les graisses listées.
- [ ] `font-display: swap` ; précharger (`<link rel="preload" as="font" crossorigin>`) uniquement Poppins 400 et Playfair 700.
- [ ] Polices de repli ajustées (`size-adjust`) pour limiter le décalage de mise en page (CLS).

**Échelle** (mobile d'abord)

| Token | Taille | Usage |
|---|---|---|
| `--fs-xs` | 12 px | Mentions, badges |
| `--fs-sm` | 14 px | Texte secondaire, libellés |
| `--fs-md` | 16 px | **Corps de texte** (jamais moins sur mobile, sinon zoom iOS sur les champs) |
| `--fs-lg` | 18 px | Prix en carte, intertitres |
| `--fs-xl` | 22 px | H3, nom produit en carte |
| `--fs-2xl` | 28 px | H2 |
| `--fs-3xl` | 32 → 48 px (`clamp`) | H1, titres du carrousel |

Interlignage : 1,5 pour le corps, 1,15 pour les titres. Longueur de ligne max : 65 caractères (`max-inline-size: 65ch`).

### 4.3 Espacements, formes, ombres

- **Espacements** : échelle de 4 px (`--space-1` = 4 px … `--space-8` = 64 px). Marge latérale mobile : `--space-4` (16 px).
- **Rayons** : `--radius-sm` 6 px (champs, badges), `--radius-md` 12 px (cartes, boutons), `--radius-lg` 20 px (tiroir, modales), `--radius-full` (pastilles, bouton flottant).
- **Ombres** : `--shadow-sm` (cartes au repos), `--shadow-md` (survol, tiroir), `--shadow-gold` (élément mis en avant, produit vedette).
- **Dégradé signature** : `--gold-gradient` réservé aux éléments de marque (bouton « Commander », bordure du bandeau promo, logo texte). Pas plus de 2 usages par écran.
- **Cibles tactiles** : `--touch-min` = 44 px minimum en largeur et hauteur.
- **Conteneur** : `--container-max` 1 200 px ; grille catalogue 2 colonnes à 360 px, 3 à 768 px, 4 à 1 024 px (container queries).

### 4.4 Iconographie et images

- **Icônes** : jeu maison « Trait doré », 95 SVG dans `packages/shared/src/icons/` :
  - `interface/` (81) : grille 24, trait 1,5 px, bouts ronds, `currentColor` ;
  - `signature/` (10) : grille 48, formes pleines à pointes effilées, 2e couleur `--icon-accent` (or clair) ;
  - utilisation : `import { bag } from '@celeste/shared/icons'` puis `${icon(bag)}` (helper `icons/icon.ts`) ; `icon(close, { label: 'Fermer' })` pour un bouton sans texte ;
  - seules les icônes importées partent dans le build ; après ajout d'un SVG : `npm run icons` ;
  - générateur et planche d'aperçu : `design/icones/` (non publié) ;
  - [x] `brands/` (4) : `whatsapp`, `facebook`, `tiktok`, `instagram` — glyphes officiels non modifiés (Simple Icons 16.34, CC0), une couleur, marge de 2 px via `viewBox="-2 -2 28 28"` ; planche de contrôle `design/icones/apercu-marques.html`.
- **Logo** : `apps/*/public/brand/logo.png` (201 × 79, fond transparent), affiché à 40 px de haut maximum dans l'en-tête. Monogramme seul pour le favicon et les icônes. Originaux dans `design/`. Une version SVG (🔒 D12) remplacera le PNG.
- **Photos produit** : ratio **1:1**, fond uni chocolat ou crème, produit centré. Minimum 1 200 × 1 200 px à l'envoi.
- **Bannières d'accueil** : ratio **16:9** sur bureau, **4:5** sur mobile (deux recadrages via Cloudinary `g_auto`).
- **Toutes les images passent par Cloudinary** avec `f_auto,q_auto` et la largeur exacte affichée (voir annexe C). Toujours `width` / `height` dans le HTML (pas de CLS), `loading="lazy"` sauf l'image LCP (`fetchpriority="high"`).

### 4.5 Mouvement

| Token | Valeur | Usage |
|---|---|---|
| `--duration-fast` | 150 ms | Survol, pression de bouton |
| `--duration-base` | 250 ms | Ouverture tiroir, toast |
| `--duration-slow` | 450 ms | Apparition au défilement, transitions de page |
| `--ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` | Courbe par défaut |

- Toutes les durées tombent à 0 avec `prefers-reduced-motion: reduce` (déjà dans `tokens.css`).
- Animations autorisées : `transform` et `opacity` uniquement (pas de `width`, `top`, `box-shadow` animés).

### 4.6 Composants de base (états obligatoires)

Chaque composant interactif a les états : **repos, survol, focus visible, pressé, désactivé, chargement**.

| Composant | Variantes |
|---|---|
| Bouton | `primary` (or), `secondary` (contour or), `ghost` (texte), `whatsapp` (vert), tailles `md` (44 px) et `lg` (52 px) |
| Champ | texte, téléphone (préfixe +225 fixe), zone de texte, liste, case à cocher ; états erreur + message sous le champ |
| Badge | statut de commande, « Promo -15 % », « Rupture », « Nouveau » |
| Carte produit | image, catégorie, nom, « à partir de » + prix, prix barré si promo, bouton d'ajout rapide |
| Toast | succès, erreur, info ; disparaît après 4 s ; annoncé aux lecteurs d'écran (`role="status"`) |
| Squelette | rectangle animé (shimmer), même taille que le contenu final |
| Focus | anneau `2px solid var(--gold-300)` + `outline-offset: 2px`, jamais supprimé |

---

## 5. Rappel d'architecture

```
View (lit-html + CSS) ──► ViewModel (signals) ──► Model / domain (fonctions pures)
                                    │
                                    ▼
                         Repository (seul accès Firestore)
```

- Le ViewModel ne touche jamais le DOM ; la View ne calcule jamais un prix.
- Un ViewModel se teste avec un faux repository, sans navigateur.
- Le site public est **multi-pages** (une URL et des balises par page) ; l'admin est une **application à page unique**.

---

## Phase 0 — Finir le socle

**Objectif** : environnement de dev et de prod complet, connexion admin possible, CI en place.
**Durée** : 3 à 4 jours.

### 0.1 Dépendances
- [ ] `npm i firebase -w @celeste/shared` (déjà déclaré, vérifier l'installation)
- [ ] Polices (§4.2)
- [ ] `npm i -D @types/node` à la racine (pour `vite.config.ts` et `scripts/`)
- [ ] `npm i -D tsx firebase-admin` à la racine (exécution des scripts `scripts/*.ts`)
- [ ] Approuver les scripts d'installation d'esbuild : `npm approve-scripts esbuild`

### 0.2 Firebase
- [ ] Créer le site admin : `firebase hosting:sites:create celestebotcho-admin`
- [ ] Le lier : `firebase target:apply hosting admin celestebotcho-admin`
- [ ] Activer **Authentication › E-mail / mot de passe** ; désactiver l'inscription publique (Paramètres › Actions utilisateur).
- [ ] Déployer règles et index : `firebase deploy --only firestore`
- [ ] App Check : enregistrer l'app web avec reCAPTCHA v3 (clé secrète dans la console) ; **mode « surveillance »** tant que le site n'est pas en ligne.
- [ ] Alerte de budget Blaze : Google Cloud Console › Facturation › Budgets, seuil 5 000 FCFA (≈ 8 €), alertes à 50 / 90 / 100 %.
- [ ] Optionnel : projet `dev` séparé (le document d'architecture le prévoit). En attendant, travailler sur les **émulateurs**.

### 0.3 Scripts
- [ ] `scripts/set-admin.ts` : `tsx scripts/set-admin.ts <email> owner|manager` ; pose le custom claim `role` via Admin SDK, crée le document `admins/{uid}`.
- [ ] `scripts/seed.ts` : remplit l'émulateur (ou le projet dev) avec 3 catégories, 8 produits, `settings/public`, `settings/legal`, 2 promos, 10 commandes de test.
- [ ] `scripts/prerender.ts` : voir Phase 7.
- [ ] Ajouter au `package.json` racine : `"seed": "tsx scripts/seed.ts"`, `"set-admin": "tsx scripts/set-admin.ts"`, `"prerender": "tsx scripts/prerender.ts"`.

### 0.4 Tests des règles
- [ ] `firebase/tests/rules.test.ts` avec `@firebase/rules-unit-testing`, un test par interdiction :
  - un visiteur ne peut pas lire une commande, lister `orderTracking`, lire un produit brouillon, écrire un produit, écrire `settings`, supprimer une commande ;
  - un visiteur peut créer une commande valide, mais pas avec `status != 'new'`, un total non entier, plus de 20 articles, un téléphone mal formé, une `adminNote` remplie ;
  - un `manager` ne peut pas écrire `settings`, `admins`, ni lire `auditLogs` ;
  - personne ne peut modifier ou supprimer un `auditLog`.

### 0.5 CI/CD (`.github/workflows/deploy.yml`)
- [ ] Étapes : `npm ci` → `npm run lint` → `npm run typecheck` → `npm test` → `npm run test:rules` → `npm run build` → `npm run prerender` → déploiement.
- [ ] Pull request : `FirebaseExtended/action-hosting-deploy` en canal de prévisualisation (expire après 7 jours).
- [ ] Branche `main` : déploiement production (hosting public + admin, règles, functions).
- [ ] Secrets GitHub : `FIREBASE_SERVICE_ACCOUNT` (JSON du compte de service), variables `VITE_*` du `.env.local`.

**Livrable** : `npm run dev:public` et `npm run dev:admin` démarrent ; le compte propriétaire se connecte à l'admin (écran vide) ; la CI passe.

---

## Phase 1 — Couche partagée (`packages/shared`)

**Objectif** : tous les modèles, règles métier et accès aux données, testés.
**Durée** : 4 à 5 jours.

### 1.1 Modèles (`src/models/`)
Recopier les interfaces du document d'architecture (§4), avec ces **ajouts** :

- [ ] `category.ts`, `product.ts` (+ `Variant`), `promotion.ts`, `settings.ts` (`PublicSettings`, `LegalSettings`), `admin.ts`, `audit-log.ts` : identiques au document.
- [ ] `order.ts` : ajouter `customer.email: string | null` (🔒 D14, facultatif) et `emailNotifications: boolean`.
- [ ] `order-tracking.ts` : identique.
- [ ] `message.ts` : ajouter `email: string | null` (facultatif) et `productId: string | null` (message envoyé depuis une fiche produit).
- [ ] `settings.ts` : ajouter dans `PublicSettings` : `contactEmail: string`, `businessHours: string`, `address: string` (pour le SEO local), `geo: { lat: number; lng: number } | null`.
- [ ] `LegalSettings` : `mentionsLegales`, `cgv`, `confidentialite`, `updatedAt` (texte riche en Markdown simple).
- [ ] `index.ts` réexporte tout. Types utilitaires : `WithId<T> = T & { id: string }`.

### 1.2 Utilitaires (`src/utils/`)
- [ ] `format-fcfa.ts` : `formatFcfa(2500)` → `2 500 F CFA` (espace insécable fine ` `) ; variante courte `2 500 F`.
- [ ] `phone.ts` : `normalizePhone('07 67 10 78 04')` → `+2250767107804` ; `formatPhone()` inverse ; `isValidCiPhone()` (10 chiffres, préfixes 01 / 05 / 07 / 25 / 27).
- [ ] `slug.ts` : `slugify('Toffi Bassin & Fesses')` → `toffi-bassin-fesses` (accents retirés, `&` supprimé).
- [ ] `order-number.ts` : `CB-AAMMJJ-XXXX`, 4 caractères en base 32 sans caractères ambigus (pas de `0/O/1/I/L`).
- [ ] `hash.ts` : `trackingId(orderNumber, phone)` = SHA-256 hexadécimal de `orderNumber + '|' + phone` via `crypto.subtle`.
- [ ] Tests unitaires pour chacun (`tests/utils/`).

### 1.3 Domaine (`src/domain/`) — fonctions pures, 100 % testées
- [ ] `promo.ts`
  - `isPromoActive(promo, now)` : `isActive && startsAt <= now < endsAt`.
  - `applicablePromos(promos, product, variant, now)` selon `scope` (`all`, `category`, `product`, `variant`) et sans `code`.
  - `bestPrice(variant, promos)` : applique la meilleure promo (jamais en dessous de 0, toujours un entier arrondi à la dizaine inférieure).
  - `findPromoByCode(code, promos, now)` insensible à la casse.
- [ ] `pricing.ts`
  - `lineTotal(unitPrice, qty)`, `subtotal(items)`, `discount(...)`, `orderTotal(subtotal, discount, deliveryFee)`.
  - `minActivePrice(product)` pour `Product.minPrice`.
- [ ] `delivery.ts` : `deliveryFee(zoneId, zones)`, `zonesByMode(zones)`.
- [ ] Cas de test obligatoires : promo expirée, promo future, deux promos qui se chevauchent (la meilleure gagne), promo `fixed_price` supérieure au prix (ignorée), code promo invalide, panier vide, quantité 0.

### 1.4 Validation (`src/validation/`)
Fonctions qui renvoient `{ ok: true, value } | { ok: false, errors: Record<champ, message> }`, messages en français, réutilisées par les formulaires **et** par les fonctions serveur.

- [ ] `order.validation.ts` : nom 2–80 caractères, téléphone CI valide, ville et adresse obligatoires, e-mail valide si fourni, zone existante, 1–20 articles, consentement coché.
- [ ] `message.validation.ts` : nom, téléphone, sujet ≤ 120, corps 10–2 000, e-mail valide si fourni.
- [ ] `product.validation.ts` : publication refusée si aucun format actif, aucune photo, `composition` ou `precautions` vides ; 1 à 6 formats ; SKU uniques ; prix entiers > 0.
- [ ] `category.validation.ts`, `promotion.validation.ts` (`endsAt > startsAt`, `value` cohérente avec `type`, `targetIds` non vide sauf `scope: 'all'`).

### 1.5 Repositories (`src/repositories/`)
Un `withConverter` par collection (dates `Timestamp` ↔ `Date`, ajout de `id`).

| Repository | Méthodes publiques | Méthodes admin |
|---|---|---|
| `product` | `listPublished()`, `getBySlug(slug)` | `listAll()`, `listByCategory()`, `save()`, `setStatus()`, `reorder()` |
| `category` | `listActive()` | `listAll()`, `save()`, `reorder()`, `delete()` (refusé si `productCount > 0`) |
| `promotion` | `listActive(now)` | `listAll()`, `save()`, `toggle()` |
| `settings` | `getPublic()` | `savePublic()`, `getLegal()`, `saveLegal()` |
| `order` | `create(order)` (+ `orderTracking` dans le même `writeBatch`) | `watchOpen(limit 50)`, `page(filters, cursor)`, `get()`, `setStatus()` (transaction : statut, historique, tracking, stock), `addNote()`, `cancel(reason)`, `stats()` (agrégations `count`/`sum`) |
| `order-tracking` | `get(trackingId)` | — |
| `message` | `create()` | `watchNew()`, `page()`, `setStatus()` |
| `admin` | — | `list()`, `save()`, `setActive()` |
| `audit-log` | — | `log(action, targetPath, summary)`, `page()` |

- [ ] Toute écriture admin qui modifie un prix, un statut de commande ou la configuration appelle `auditLog.log()` dans le **même batch**.
- [ ] Dénormalisation dans le même `writeBatch` : renommer une catégorie met à jour `categoryName` de ses produits ; publier / archiver un produit met à jour `productCount`.

### 1.6 Services (`src/services/`)
- [x] `firebase.ts`, `app-check.ts`
- [ ] `images.ts` : `cld(publicIdOrUrl, { w, h, crop })` → URL Cloudinary avec `f_auto,q_auto` ; `srcset(publicId, [320, 480, 768, 1200])` ; `uploadImage(file, folder)` vers le preset non signé ; `ogImage(...)` (Phase 7).
- [ ] `whatsapp.ts` : interface `WhatsAppService` ; implémentation niveau 1 : `buildOrderLink(order, shopNumber)`, `buildProductLink(product, variant, shopNumber)`, `buildCustomerLink(order)` (admin → cliente), `buildContactLink(shopNumber, text?)`.
- [ ] Tests de `whatsapp.ts` : encodage des caractères spéciaux, sauts de ligne, emoji.

**Livrable** : `npm test` vert, couverture du dossier `domain/` ≥ 90 %.

---

## Phase 2 — Design system et coque du site public

**Objectif** : tous les composants réutilisables et la structure commune des pages.
**Durée** : 3 jours.

### 2.1 Styles globaux
- [ ] `base.css` : reset moderne, `color-scheme: dark`, `body` (fond, police, taille), titres, liens, `:focus-visible`, `.container`, `.visually-hidden`, `.skip-link`.
- [ ] `animations.css` : `@keyframes` shimmer, pop (badge panier), slide-in (tiroir), fade-up ; classe `.reveal` (apparition au défilement via `animation-timeline: view()` avec repli `IntersectionObserver`) ; règles `@view-transition { navigation: auto; }` et noms de transitions pour l'image produit (catalogue → fiche).
- [ ] Toutes les animations désactivées sous `prefers-reduced-motion`.

### 2.2 Composants (`apps/public/src/components/`)
| Composant | Contenu | Points d'attention |
|---|---|---|
| `site-header` | Logo, menu (Accueil, Catalogue, Suivi, Contact), icône panier + badge, bandeau d'annonce (`settings.announcement`) | Collant en haut, réduit au défilement ; menu mobile en tiroir |
| `site-footer` | Contacts, réseaux sociaux, zones de livraison, liens légaux, mention « ne remplace pas un avis médical » | Liens légaux présents sur **toutes** les pages (exigence conformité) |
| `product-card` | Voir §4.6 | `view-transition-name` sur l'image ; ajout rapide = premier format actif |
| `cart-drawer` | Liste des articles, quantités +/−, sous-total, promo appliquée, bouton « Commander » | Piège du focus, fermeture par Échap et par glissement ; `aria-modal` |
| `whatsapp-fab` | Bouton flottant vert, en bas à droite | Ne masque pas le bouton « Commander » sur mobile ; texte pré-rempli selon la page |
| `promo-countdown` | Jours / heures / minutes / secondes jusqu'à `endsAt` | Un seul `setInterval` partagé ; arrêt quand la promo expire ; `aria-live="off"` (pas d'annonce chaque seconde) |
| `skeleton` | `skeletonCard()`, `skeletonGrid(n)`, `skeletonText(lines)` | Mêmes dimensions que le contenu final |
| `icons.ts` | SVG des icônes utilisées | |
| `toast` | Notifications (ajout au panier, erreur réseau) | `role="status"` |

### 2.3 Stores partagés entre pages
- [ ] `cart.store.ts` : signal `items` persisté dans `localStorage` (clé `cb-cart-v1`, version pour migrer plus tard) ; `add`, `remove`, `setQty`, `clear`, `count` (computed) ; synchronisation entre onglets via l'évènement `storage`. Le panier ne stocke que `productId`, `sku`, `qty` : prix et noms sont **toujours relus du catalogue** (règle « le prix vient du catalogue »).
- [ ] `settings.store.ts` : charge `settings/public` une fois par visite (cache Firestore + `sessionStorage`).

### 2.4 `main.ts` et gabarit HTML commun
- [ ] Chaque page HTML contient : `lang="fr"`, balises SEO (Phase 7), lien « Aller au contenu », `<header>`, `<main id="main">`, `<footer>`, et un script d'entrée qui monte la page correspondante.
- [ ] `main.ts` : monte en-tête, pied de page, tiroir panier et bouton WhatsApp, puis importe dynamiquement la page (`import('./pages/catalog/catalog.view')`) pour découper le JavaScript par page.

**Livrable** : une page de démonstration affiche tous les composants, sur 360 px et 1 280 px.

---

## Phase 3 — Pages publiques

**Durée** : 6 à 7 jours. Pour chaque page : View + ViewModel + CSS + test du ViewModel.

### 3.1 Accueil (`index.html`, `pages/home/`)
**Sections, dans l'ordre**
1. Carrousel (`settings.heroSlides`) — défilement automatique 5 s, pause au toucher et au survol, points de navigation, glissement tactile ; première image en `fetchpriority="high"` (c'est l'image LCP).
2. Bandeau promo actif + compte à rebours (si une promo sans code est active).
3. Catégories (cartes avec image de couverture) → `catalogue?categorie=<slug>`.
4. Produits vedettes (`isFeatured`, max 8) en défilement horizontal sur mobile.
5. Bénéfices / engagements (livraison, paiement à la livraison, conseil WhatsApp) — **sans allégation médicale** (§Phase 12).
6. Zones et tarifs de livraison (`settings.deliveryZones`).
7. FAQ courte (3 questions) + lien vers Contact.

**ViewModel** : `slides`, `categories`, `featured`, `activePromo`, `loading` ; 3 lectures Firestore maximum (settings, catégories, produits publiés partagés avec le catalogue via le cache).

### 3.2 Catalogue (`catalogue.html`, `pages/catalog/`)
- [ ] Lecture de **tous** les produits publiés en une requête (règle de fluidité n° 1), filtrage et tri en mémoire.
- [ ] Filtres : catégorie (pastilles défilantes), tri (pertinence, prix croissant, prix décroissant), recherche instantanée (nom, catégorie, description courte ; insensible aux accents ; délai 150 ms).
- [ ] État reflété dans l'URL (`?categorie=…&tri=…&q=…`) pour le partage et le bouton retour.
- [ ] Chargement progressif : 12 cartes, puis 12 de plus à l'approche du bas (`IntersectionObserver`).
- [ ] États : chargement (squelettes), aucun résultat (message + réinitialiser les filtres), erreur réseau (réessayer), hors connexion (données en cache + bandeau).

### 3.3 Fiche produit (`produit.html` + pages pré-rendues `/produit/<slug>`)
- [ ] Lecture du slug depuis l'URL ; produit introuvable ou non publié → page 404 avec lien vers le catalogue.
- [ ] Galerie : image principale + miniatures, glissement tactile, zoom au toucher ; `view-transition-name` partagé avec la carte.
- [ ] Sélecteur de format (30 / 55 / 115 boules…) en boutons radio accessibles ; format en rupture grisé avec mention.
- [ ] Prix : prix promo en or + prix barré + badge « -15 % » ; « à partir de » quand aucun format n'est choisi.
- [ ] Quantité (1–10) ; bouton **« Ajouter au panier »** (animation vers l'icône panier) ; bouton **« Commander sur WhatsApp »** (lien direct avec produit, format et prix).
- [ ] Onglets / sections repliables : Description, **Composition**, **Mode d'emploi**, **Précautions et contre-indications**.
- [ ] Encadré permanent : « Ce produit ne remplace pas un avis médical. Arrêtez l'utilisation et consultez en cas d'effet indésirable. Déconseillé aux femmes enceintes ou allaitantes, aux mineures et en cas de traitement médical. »
- [ ] Bouton « Poser une question sur ce produit » → formulaire de contact pré-rempli (`productId`).
- [ ] Produits de la même catégorie (4 max).
- [ ] Barre d'action collante en bas sur mobile (prix + bouton d'ajout).

### 3.4 Commande (`commande.html`, `pages/checkout/`)
Une seule page, 3 blocs visibles en même temps sur mobile (objectif : commande en moins de 2 minutes).

1. **Récapitulatif** : articles du panier (relus du catalogue ; un article devenu indisponible est signalé et retiré du total), quantités modifiables.
2. **Coordonnées** : nom, téléphone (+225 fixe), e-mail facultatif (« pour recevoir la confirmation par e-mail »), commune / ville, adresse ou repère, note.
3. **Livraison et paiement** : livraison à Abidjan / expédition (zones depuis `settings`), frais affichés ; code promo (vérifié en direct) ; paiement : à la livraison ou mobile money convenu sur WhatsApp.
4. **Total** détaillé : sous-total, remise, livraison, **total**.
5. Case **« J'accepte les CGV et la politique de confidentialité »** (liens), obligatoire.
6. Bouton **« Valider et envoyer sur WhatsApp »**.

**Séquence de validation** (dans le ViewModel)
1. Valider avec `order.validation.ts` ; afficher les erreurs sous les champs et faire défiler jusqu'à la première.
2. Recalculer les prix depuis le catalogue frais (pas depuis le panier).
3. Générer le numéro, calculer `trackingId`, écrire `orders/{numéro}` et `orderTracking/{trackingId}` dans **un seul batch**.
4. Vider le panier, mémoriser la dernière commande dans `localStorage` (pour la page de confirmation et le suivi).
5. Ouvrir WhatsApp (`buildOrderLink`) ; afficher l'écran de confirmation : numéro de commande, bouton « Ouvrir WhatsApp » (si le navigateur a bloqué l'ouverture), lien vers le suivi.
- [ ] **Hors connexion** : la commande est conservée (`localStorage`, file d'attente) et envoyée au retour du réseau, avec un message clair. Le cache persistant de Firestore met déjà l'écriture en attente : afficher l'état « en attente d'envoi ».
- [ ] Double clic sur le bouton : désactivé pendant l'envoi.

### 3.5 Suivi (`suivi.html`, `pages/tracking/`)
- [ ] Champs : numéro de commande + téléphone ; préremplis avec la dernière commande si elle existe.
- [ ] Calcul de l'empreinte dans le navigateur, lecture du seul document `orderTracking/{id}`.
- [ ] Affichage en frise : Nouvelle → Confirmée → En préparation → Expédiée → Livrée (ou Annulée), date de dernière mise à jour.
- [ ] Introuvable : message neutre (« Aucune commande ne correspond ») sans indiquer quel champ est faux.

### 3.6 Contact / À propos (`contact.html`, `pages/contact/`)
- [ ] Présentation de la marque (slogan « Plus de volume, plus de confiance »), numéros officiels (🔒 D2), réseaux sociaux, horaires.
- [ ] Bouton WhatsApp direct.
- [ ] Formulaire : nom, téléphone, e-mail facultatif, sujet (liste : question produit, commande, livraison, autre), message (compteur 2 000).
- [ ] À l'envoi : écriture `messages` → toast de succès → la fonction envoie l'e-mail (Phase 5).
- [ ] FAQ complète (`settings.faq`) en accordéon (données structurées FAQPage, Phase 7).
- [ ] Sections ou pages : **Mentions légales**, **CGV**, **Politique de confidentialité** (texte `settings/legal`), accessibles par ancres `contact#cgv` etc.

### 3.7 Page 404
- [ ] `404.html` (servie automatiquement par Firebase Hosting) : message, recherche, lien catalogue, bouton WhatsApp.

**Livrable** : parcours complet accueil → produit → panier → commande sur un téléphone de 360 px.

---

## Phase 4 — Admin : catalogue et configuration

**Durée** : 5 jours.

### 4.1 Coque de l'admin
- [ ] `router.ts` : routes en hash ou History API (la réécriture `**` → `index.html` est déjà dans `firebase.json`).
- [ ] `auth.guard.ts` : redirige vers `/connexion` si non connecté ; vérifie le claim `role` (`getIdTokenResult`) ; un compte sans rôle ou `isActive: false` est déconnecté avec un message.
- [ ] `shell.view.ts` : menu latéral (repliable sur mobile), en-tête (nom, rôle, déconnexion), zone de contenu. Les entrées réservées au propriétaire (Configuration, Comptes admin, Journal) sont **masquées** pour un gestionnaire (et de toute façon bloquées par les règles).
- [ ] Composants : `data-table` (tri, pagination par curseur, sélection), `form-field`, `modal` (confirmation), `toast`, `image-uploader` (glisser-déposer, aperçu, compression côté navigateur à 1 600 px max avant envoi, barre de progression, réordonnancement).

### 4.2 Connexion (`features/auth`)
- [ ] E-mail + mot de passe, « mot de passe oublié » (e-mail Firebase), message d'erreur générique, limite visuelle après 5 échecs.
- [ ] Mise à jour de `admins/{uid}.lastLoginAt`.

### 4.3 Catégories
- [ ] Liste réordonnable par glisser-déposer (souris et tactile ; boutons ↑ ↓ pour le clavier), activer / désactiver, image de couverture.
- [ ] Formulaire : nom (slug généré, modifiable), description, image.
- [ ] Suppression refusée si la catégorie contient des produits (proposer la désactivation).

### 4.4 Produits
- [ ] Liste filtrable (catégorie, statut, rupture), recherche, aperçu de l'image.
- [ ] Formulaire en sections : Informations, Photos (1–8), Formats (1–6 lignes : libellé, quantité, prix, stock, actif, SKU auto `TOF-BF-030`), Contenu (description courte, description, **composition**, **mode d'emploi**, **précautions** — obligatoires pour publier), Mise en avant (vedette, ordre), SEO (titre ≤ 60 caractères, description ≤ 155, avec compteur et aperçu Google / WhatsApp).
- [ ] Statut brouillon / publié / archivé ; bouton « Publier » désactivé avec la liste des manques (règle de gestion).
- [ ] Calcul automatique de `minPrice`, `inStock`, `categoryName`, `slug`.
- [ ] Bouton « Voir sur le site ».
- [ ] Journalisation : changement de prix (`prix 30 boules : 3000 → 2500`), publication, archivage.
- [ ] 🔒 D1, D3, D4, D7 avant la saisie réelle du catalogue.

### 4.5 Configuration (propriétaire)
- [ ] Onglets : Boutique (nom, slogan, logo, numéros, WhatsApp, e-mail de contact, adresse, horaires, réseaux), Accueil (diapositives du carrousel, annonce), FAQ, Textes légaux, SEO (titre, description, image OG par défaut).
- [ ] Aperçu en direct du carrousel et de la carte de partage.

### 4.6 Livraison
- [ ] Zones (nom, mode `local` / `shipping`, tarif) ; réordonnables ; stockées dans `settings/public.deliveryZones`. 🔒 D5

**Livrable (fin du lot 1 côté admin)** : la vendeuse saisit le catalogue réel sans aide.

---

## Phase 5 — Commande, WhatsApp et e-mails

**Durée** : 4 jours.

### 5.1 WhatsApp niveau 1
- [ ] Trois boutons branchés : « Commander » (panier), « Commander sur WhatsApp » (fiche), « Écrire à la cliente » (admin).
- [ ] Message pré-rempli selon le modèle du document d'architecture, plus le lien de suivi.
- [ ] Test sur Android : ouverture de l'application WhatsApp (pas WhatsApp Web), caractères accentués corrects.

### 5.2 Architecture des e-mails

L'adresse `contact@celestebotcho.com` (serveur LWS `mail.celestebotcho.com`, port 465) **envoie tous les e-mails** du site. Les e-mails partent **uniquement depuis les Cloud Functions** (le mot de passe ne quitte jamais Secret Manager).

| Déclencheur | Fonction | Destinataire | Contenu |
|---|---|---|---|
| Nouveau message de contact | `onMessageCreated` | Propriétaire (`MAIL_TO_OWNER`) | Message, coordonnées, lien WhatsApp, produit concerné ; `Reply-To` = e-mail de la cliente si fourni |
| Nouveau message de contact, avec e-mail | `onMessageCreated` | Cliente | Accusé de réception : « Nous avons bien reçu votre message, réponse sous 24 h » |
| Nouvelle commande | `onOrderCreated` | Propriétaire | Alerte avec récapitulatif, lien vers la commande dans l'admin, lien WhatsApp cliente |
| Nouvelle commande, avec e-mail | `onOrderCreated` | Cliente | Confirmation : numéro, articles, total, livraison, lien de suivi |
| Changement de statut, avec e-mail | `onOrderStatusChanged` | Cliente | « Votre commande est confirmée / expédiée / livrée / annulée (motif) » |
| Réponse depuis l'admin | `sendCustomerEmail` (appelable, admin) | Cliente | Réponse rédigée dans le module Messages |

> Les clientes n'ont pas de compte : sans e-mail fourni, tout passe par WhatsApp. L'e-mail reste **facultatif** (minimisation des données, 🔒 D14).

### 5.3 Tâches e-mails
- [ ] `functions/src/mail/transport.ts` : création unique du transport nodemailer (réutilisé entre appels).
- [ ] `functions/src/mail/layout.ts` : gabarit HTML responsive à base de tableaux, **styles en ligne** (les clients mail ignorent les feuilles de style), largeur 600 px, fond `#140800`, carte `#1f0e03`, titres `#fdda4b`, texte `#fbf5ea`, bouton or `#efb830` / texte `#0d0500`, police `Arial` (les polices web ne sont pas fiables en e-mail), logo hébergé sur Cloudinary, pied : adresse, lien de désinscription des e-mails de suivi, mentions.
- [ ] `functions/src/mail/templates/` : `contact-owner.ts`, `contact-ack.ts`, `order-owner.ts`, `order-confirmation.ts`, `order-status.ts`, `customer-reply.ts` ; chacun produit `{ subject, html, text }` (version texte obligatoire).
- [ ] Échappement HTML de toutes les données clientes (déjà fait dans `onMessageCreated`).
- [ ] Mettre à jour `onMessageCreated` pour utiliser le gabarit + accusé de réception.
- [ ] `onOrderCreated` (lot 1 pour l'e-mail, lot 3 pour la validation du total) et `onOrderStatusChanged` (compare `before.status` / `after.status`).
- [ ] Idempotence : marquer `emailSentAt` sur le document pour ne pas renvoyer en cas de réexécution.
- [ ] Mettre à jour les **règles Firestore** : `customer.email` et `message.email` = chaîne ≤ 120 caractères au format e-mail, ou `null`.
- [ ] Tests dans l'émulateur avec un serveur SMTP de test (Mailpit ou Ethereal) : `SMTP_HOST` pointé dessus via `functions/.env.local`.

### 5.4 Délivrabilité (sinon les e-mails finissent en spam)
- [ ] Chez LWS, zone DNS de `celestebotcho.com` : vérifier / ajouter **SPF** (`v=spf1 include:<valeur LWS> ~all`), activer **DKIM** dans le panneau mail, ajouter **DMARC** (`v=DMARC1; p=none; rua=mailto:contact@celestebotcho.com`), à durcir en `quarantine` après un mois.
- [ ] Tester avec https://www.mail-tester.com : score ≥ 9/10.
- [ ] Vérifier la limite d'envoi horaire de l'offre LWS et la noter dans l'annexe.

**Livrable (fin du lot 1)** : site en ligne, commande reçue dans l'admin, sur WhatsApp et par e-mail.

---

## Phase 6 — Admin : gestion quotidienne

**Durée** : 6 jours. (Lot 2 du cahier des charges.)

### 6.1 Commandes
- [ ] Liste **en temps réel** (`onSnapshot` sur `new` + `confirmed`, 50 max) + historique paginé (25 par page, `startAfter`).
- [ ] **Alerte sonore** et notification du navigateur à chaque nouvelle commande (après une interaction utilisateur, exigence des navigateurs) ; badge dans l'onglet (`(3) Commandes`).
- [ ] Filtres : statut, période (aujourd'hui, 7 jours, mois, personnalisée), recherche par numéro ou téléphone.
- [ ] Détail : coordonnées, articles, totaux, **alerte d'écart** si le total recalculé depuis le catalogue diffère du total envoyé, historique des statuts, note interne.
- [ ] Changement de statut (transaction : commande + `orderTracking` + historique + décrément du stock au passage en « confirmée » + journal).
- [ ] Annulation avec motif obligatoire (jamais de suppression).
- [ ] « Écrire à la cliente sur WhatsApp » (message selon le statut), « Envoyer un e-mail » si e-mail fourni.
- [ ] Export CSV (séparateur `;`, UTF-8 avec BOM pour Excel) sur la période filtrée.
- [ ] Impression d'un bon de livraison (feuille de style `@media print`).

### 6.2 Messages
- [ ] Boîte de réception temps réel : nouveau / lu / traité ; passage automatique à « lu » à l'ouverture.
- [ ] Réponse par WhatsApp ou par e-mail (`sendCustomerEmail`) ; produit concerné affiché.

### 6.3 Promotions
- [ ] Liste (en cours, programmées, terminées) ; formulaire : titre, type (% / montant / prix fixe), valeur, portée (tout le site / catégorie / produit / format) avec sélecteur, code facultatif, dates de début et de fin, bannière, actif.
- [ ] Aperçu : liste des produits concernés avec ancien et nouveau prix.
- [ ] Avertissement si deux promos se chevauchent sur un même produit.

### 6.4 Tableau de bord
- [ ] Cartes : commandes du jour, chiffre du mois (commandes livrées), messages non lus, produits en rupture, promos actives (requêtes d'agrégation `count()` / `sum()`).
- [ ] Liste des 5 dernières commandes ; graphique simple des commandes sur 30 jours (SVG, pas de bibliothèque).

### 6.5 Comptes admin et journal (propriétaire)
- [ ] Liste des comptes, invitation (lot 1–2 : via `scripts/set-admin.ts` ; lot 3 : fonction `setAdminRole`), désactivation.
- [ ] Journal paginé, filtrable par action et par auteur.
- [ ] Bouton **« Exporter les données »** (commandes + catalogue en JSON) — sauvegarde hebdomadaire manuelle tant que l'export planifié n'est pas en place.

---

## Phase 7 — SEO et partage social

**Durée** : 3 jours. Objectif : chaque page a une URL propre, un titre, une description, un aperçu soigné sur WhatsApp / Facebook, et des données structurées.

### 7.1 Balises par page

Gabarit `<head>` commun (dans chaque `.html`, valeurs remplacées par le pré-rendu pour les fiches produit) :

```html
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{titre} | Céleste Bôtchô</title>
<meta name="description" content="{description 140–155 caractères}">
<link rel="canonical" href="https://celestebotcho.com/{chemin}">
<meta name="theme-color" content="#140800">
<meta name="robots" content="index, follow, max-image-preview:large">

<!-- Open Graph (Facebook, WhatsApp) -->
<meta property="og:type" content="website">            <!-- "product" sur les fiches -->
<meta property="og:site_name" content="Céleste Bôtchô">
<meta property="og:locale" content="fr_CI">
<meta property="og:title" content="{titre}">
<meta property="og:description" content="{description}">
<meta property="og:url" content="https://celestebotcho.com/{chemin}">
<meta property="og:image" content="{URL image OG 1200×630}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="{texte alternatif}">

<!-- Twitter / X -->
<meta name="twitter:card" content="summary_large_image">

<!-- Icônes et PWA -->
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
```

| Page | Titre (≤ 60 caractères) | Description |
|---|---|---|
| Accueil | Céleste Bôtchô — Plus de volume, plus de confiance | Boutique en ligne à Abidjan : Toffi Bassin & Fesses, Toffi Grossissant Corps et soins. Livraison à Abidjan et partout en Côte d'Ivoire. |
| Catalogue | Tous nos produits | Découvrez la gamme Céleste Bôtchô : formats 30, 55 et 115 boules, prix à jour et promos en cours. |
| Catalogue filtré | {Catégorie} | Description de la catégorie (champ admin) |
| Fiche | {seo.title} ou {nom} — {format le moins cher} | {seo.description} ou description courte |
| Commande | Finaliser ma commande | — + `noindex` |
| Suivi | Suivre ma commande | — + `noindex` |
| Contact | Contact et questions fréquentes | Numéros, WhatsApp, livraison et réponses aux questions fréquentes. |

- [ ] Les textes SEO **ne contiennent aucune allégation médicale ni promesse chiffrée** (Phase 12).
- [ ] Une seule balise `<h1>` par page ; hiérarchie H2/H3 respectée.
- [ ] `og:locale` `fr_CI` ; `<html lang="fr">`.

### 7.2 Images de partage (Open Graph)

Format : **1 200 × 630 px, JPEG, moins de 300 Ko** (au-delà, WhatsApp n'affiche pas toujours l'aperçu). URL absolue en `https`.

- [x] **Image par défaut du site** : `apps/public/public/og/og-default.jpg` (1 200 × 630, JPEG, 139 Ko), tirée de « Célèste Bôtchô, douceur dorée » : logo, slogan, boules Toffi, « Commandez sur WhatsApp · Livraison partout en Côte d'Ivoire ». Utilisée par l'accueil, le catalogue, le contact. Modifiable dans Configuration › SEO (`settings.seo.ogImageUrl`).
- [ ] **Image par produit, générée par Cloudinary** (aucun fichier à fabriquer) : photo du produit posée sur un fond chocolat, nom du produit et « à partir de X F » en surimpression. Fonction `ogImage(product)` dans `services/images.ts`, exemple de transformation :

  ```
  https://res.cloudinary.com/dwzhiapy0/image/upload/
    w_1200,h_630,c_fill,b_rgb:140800/
    l_{publicId produit},w_560,h_560,c_pad,b_rgb:140800/fl_layer_apply,g_east,x_40/
    l_text:Arial_56_bold:{nom encodé},co_rgb:fdda4b,w_560,c_fit/fl_layer_apply,g_west,x_60,y_-60/
    l_text:Arial_40:À%20partir%20de%20{prix}%20F,co_rgb:fbf5ea/fl_layer_apply,g_west,x_60,y_60/
    f_jpg,q_80/{publicId logo ou fond}
  ```
  (à mettre au point dans l'outil de transformation de Cloudinary, puis figer dans le code ; ajouter le logo en calque `g_north_west`).
- [ ] Image par catégorie : même principe avec l'image de couverture.
- [ ] Vérifier chaque type de page avec le **Facebook Sharing Debugger** (https://developers.facebook.com/tools/debug/) et en envoyant le lien dans une discussion WhatsApp.

### 7.3 Pré-rendu des fiches produit (`scripts/prerender.ts`)

Les robots de WhatsApp et Facebook n'exécutent pas le JavaScript : les balises doivent être dans le HTML.

- [ ] Après `vite build`, le script lit les produits publiés (Admin SDK, compte de service en CI).
- [ ] Pour chaque produit, il copie `dist/produit.html` vers `dist/produit/<slug>.html` en remplaçant : `<title>`, description, canonique, toutes les balises OG (`og:type=product`, `product:price:amount`, `product:price:currency=XOF`, `product:availability`), et ajoute le JSON-LD `Product` (§7.4).
- [ ] Il injecte aussi le contenu principal (nom, description, prix, image) dans `<main>` pour les moteurs et l'affichage instantané ; le JavaScript reprend ensuite la main.
- [ ] Il fait de même pour chaque catégorie (`dist/catalogue/<slug>.html`) — optionnel, si le SEO par catégorie est voulu.
- [ ] Il génère `dist/sitemap.xml` (§7.5).
- [ ] Un produit créé après le dernier déploiement reste accessible via la réécriture `/produit/** → /produit.html` (rendu côté navigateur) jusqu'au déploiement suivant.
- [ ] **Redéploiement automatique** à chaque publication de produit : en lot 2, bouton admin « Mettre à jour le site » qui déclenche le workflow GitHub (`repository_dispatch`) ; en lot 3, déclenchement par une Cloud Function sur `products/{id}` (avec temporisation de 10 min pour regrouper les modifications).

### 7.4 Données structurées (JSON-LD)

| Page | Types schema.org |
|---|---|
| Toutes | `Organization` (nom, logo, `sameAs` : Facebook, TikTok, Instagram, `contactPoint` téléphone) + `WebSite` |
| Accueil | `OnlineStore` / `LocalBusiness` (adresse Abidjan, `areaServed: CI`, horaires, téléphone) |
| Fiche produit | `Product` : `name`, `image[]`, `description`, `sku`, `brand`, `category`, et `offers` en `AggregateOffer` (`lowPrice`, `highPrice`, `priceCurrency: XOF`, `offerCount`, `availability`) ou un `Offer` par format ; `priceValidUntil` = fin de la promo si promo ; `shippingDetails` (tarifs livraison CI) ; `hasMerchantReturnPolicy` selon les CGV |
| Fiche, catalogue | `BreadcrumbList` (Accueil › Catégorie › Produit) |
| Contact | `FAQPage` (questions de `settings.faq`) |

- [ ] **Pas de `Review` / `AggregateRating`** tant qu'il n'y a pas de vrais avis vérifiables (règle « aucun faux avis »).
- [ ] Valider avec https://search.google.com/test/rich-results et https://validator.schema.org.

### 7.5 Sitemap, robots, indexation
- [ ] `sitemap.xml` généré au build : accueil, catalogue, contact, chaque produit publié (`lastmod` = `updatedAt`), avec la balise `image:image` pour les photos produit.
- [ ] `robots.txt` :
  ```
  User-agent: *
  Allow: /
  Disallow: /commande
  Disallow: /suivi
  Sitemap: https://celestebotcho.com/sitemap.xml
  ```
- [ ] Admin : `X-Robots-Tag: noindex, nofollow` (déjà dans `firebase.json`) + `<meta name="robots" content="noindex">` + `robots.txt` `Disallow: /`.
- [ ] Redirection du domaine `*.web.app` / `*.firebaseapp.com` vers le domaine principal (balise canonique + redirection 301 dans `firebase.json` quand le domaine est branché) pour éviter le contenu dupliqué.
- [ ] **Google Search Console** : valider le domaine (enregistrement DNS TXT chez LWS), soumettre le sitemap, surveiller la couverture et les Core Web Vitals.
- [ ] **Google Business Profile** (fiche Google Maps) : à créer par la vendeuse, liée au site — fort impact pour les recherches locales « Abidjan ».
- [ ] **Meta / Facebook** : lier le site à la page Facebook (domaine vérifié dans le Business Manager) ; ajouter le lien du site dans la bio Facebook, TikTok, Instagram et le statut WhatsApp Business.

### 7.6 Contenu
- [ ] Texte unique (non copié des affiches) pour chaque fiche produit : 150 à 300 mots, mots-clés naturels (« Toffi », « Abidjan », « livraison Côte d'Ivoire »), sans allégation.
- [ ] Texte alternatif descriptif sur chaque image (`alt` géré dans l'admin, obligatoire).
- [ ] URLs lisibles : `/produit/toffi-bassin-fesses`, jamais d'identifiant technique.

---

## Phase 8 — PWA et hors connexion

**Durée** : 2 jours.

- [ ] `manifest.webmanifest` : compléter les icônes (192, 512, 512 `maskable`), `screenshots` (mobile), `shortcuts` (Catalogue, Suivi), `categories: ["shopping"]`, `id: "/"`.
- [x] Icônes générées depuis le monogramme : `favicon.ico` (16/32/48), `icons/apple-touch-icon.png` (180), `icons/icon-192.png`, `icons/icon-512.png`, `icons/icon-maskable-512.png` — déclarées dans le manifest.
- [ ] Les régénérer depuis le logo SVG quand il sera fourni (🔒 D12), et ajouter `icons/icon.svg`.
- [ ] `vite-plugin-pwa` (Workbox) :
  - pré-cache : HTML, JS, CSS, polices, icônes ;
  - images Cloudinary : `CacheFirst`, 60 entrées, 30 jours ;
  - pages HTML : `NetworkFirst` (délai 3 s) avec repli sur le cache ;
  - **ne pas** mettre en cache les requêtes Firestore (le SDK gère son propre cache persistant).
- [ ] Page « Vous êtes hors connexion » de repli.
- [ ] Invitation à installer : bouton discret dans le pied de page / après une commande (évènement `beforeinstallprompt`), jamais en fenêtre surgissante à l'arrivée.
- [ ] Notification « Nouvelle version disponible » (mise à jour du service worker).
- [ ] **Recette** : première visite, puis mode avion → accueil, catalogue et fiches déjà vues s'affichent ; une commande passée hors connexion part au retour du réseau.

---

## Phase 9 — Performance

**Objectif** : LCP < 2,5 s sur 4G lente, Lighthouse mobile ≥ 90. **Durée** : 2 jours (+ vigilance continue).

**Budgets**

| Ressource | Budget |
|---|---|
| JavaScript initial par page (gzip) | ≤ 70 Ko (dont Firebase ≈ 50 Ko : importer uniquement `firebase/firestore/lite` là où le temps réel et le cache ne servent pas — à évaluer) |
| CSS (gzip) | ≤ 20 Ko |
| Image LCP | ≤ 120 Ko |
| Polices | ≤ 80 Ko au total |
| Requêtes Firestore par visite complète | ≈ 16 |

**Tâches**
- [ ] Image LCP : `fetchpriority="high"`, `srcset` + `sizes`, `<link rel="preload" as="image" imagesrcset>` sur l'accueil.
- [ ] `<link rel="preconnect">` vers `res.cloudinary.com` et `firestore.googleapis.com`.
- [ ] Afficher le contenu pré-rendu ou le squelette **avant** que Firebase soit chargé.
- [ ] Charger reCAPTCHA / App Check après le premier affichage (`requestIdleCallback`).
- [ ] Découpage par page (`import()` dynamique) ; vérifier avec `npx vite-bundle-visualizer`.
- [ ] En-têtes de cache dans `firebase.json` : fichiers à empreinte (`/assets/**`) `Cache-Control: public, max-age=31536000, immutable` ; HTML `no-cache`.
- [ ] `content-visibility: auto` sur les sections sous la ligne de flottaison.
- [ ] Mesures : Lighthouse mobile, PageSpeed Insights, WebPageTest (Lagos ou Johannesburg, profil 4G).

---

## Phase 10 — Accessibilité

**Objectif** : aucun défaut bloquant à l'audit Lighthouse ; utilisable au clavier. **Durée** : 1,5 jour.

- [ ] Contrastes (§4.1).
- [ ] Navigation clavier complète : ordre logique, focus visible, piège du focus dans le tiroir et les modales, Échap pour fermer.
- [ ] Lien « Aller au contenu ».
- [ ] Libellés `<label>` sur tous les champs ; erreurs reliées par `aria-describedby` et annoncées.
- [ ] Carrousel : boutons pause / précédent / suivant, `aria-roledescription="carrousel"`, pas de défilement automatique si `prefers-reduced-motion`.
- [ ] Sélecteur de format : groupe de boutons radio (`fieldset` + `legend`).
- [ ] Badge du panier : texte accessible (« Panier, 3 articles »).
- [ ] Images : `alt` pertinent, `alt=""` pour les décoratives.
- [ ] Taille de texte : zoom à 200 % sans perte de contenu ; jamais `user-scalable=no`.
- [ ] Test avec TalkBack (Android) sur le parcours de commande.

---

## Phase 11 — Sécurité

**Objectif** : note **A** sur securityheaders.com ; un compte non admin ne peut rien lire ni modifier, même en appelant la base directement. **Durée** : 1,5 jour.

- [ ] **CSP** (voir annexe D) ajoutée aux deux cibles dans `firebase.json`, d'abord en `Content-Security-Policy-Report-Only` pendant une semaine, puis appliquée.
- [ ] `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`.
- [ ] `Cross-Origin-Opener-Policy: same-origin`.
- [ ] **App Check** passé en mode « appliqué » sur Firestore et Functions, après vérification des métriques (plus de 95 % de requêtes vérifiées).
- [ ] Clé API Firebase restreinte dans Google Cloud Console › Identifiants : référents HTTP = domaines du site et de l'admin, `localhost` en dev ; API limitées à celles utilisées.
- [ ] Double authentification (SMS ou TOTP) pour le compte propriétaire (Firebase Auth MFA, ou à défaut mot de passe long + gestionnaire de mots de passe).
- [ ] Tests de règles (Phase 0.4) complétés pour les nouveaux champs (e-mail).
- [ ] Revue : aucune clé secrète dans le code client (`grep` dans `dist/`), `.env.local` et `.secret.local` ignorés par git.
- [ ] Limites connues documentées (total calculé par le navigateur, stock, débit) et parades en place (alerte d'écart dans l'admin, App Check).

---

## Phase 12 — Conformité et contenus légaux

**Durée** : 1 jour de développement ; le contenu légal est fourni par la vendeuse / un juriste.

### 12.1 Produits
- [ ] Champs obligatoires dans l'admin : composition complète, mode d'emploi, précautions et contre-indications (grossesse, allaitement, mineures, traitement médical en cours).
- [ ] **Liste de formules interdites** contrôlée à la saisie (avertissement dans l'admin) : « 100 % garanti », « résultats garantis », « résultats visibles et durables », « 100 % naturel et efficace », « guérit », « sans effet secondaire », toute promesse chiffrée (« +5 cm »). Utilisables seulement si la vendeuse peut les justifier.
- [ ] Mention « ne remplace pas un avis médical » sur chaque fiche et dans le pied de page.
- [ ] Témoignages : uniquement de vraies clientes avec accord écrit ; pas de section avis au lancement.
- [ ] 🔒 D8 : vérification auprès de l'**AIRP** pour les produits ingérés et les suppositoires **avant** leur publication.

### 12.2 Données personnelles (loi n° 2013-450, ARTCI)
- [ ] Pages : mentions légales, CGV, politique de confidentialité (finalités, données collectées, durée de conservation, droits d'accès / rectification / suppression, contact).
- [ ] Case de consentement non pré-cochée à la commande, horodatée (`consentAt`).
- [ ] E-mail cliente facultatif, utilisé uniquement pour le suivi de la commande.
- [ ] Purge des coordonnées après 🔒 D13 (24 mois proposés) : lot 1–2, bouton admin « Anonymiser les commandes anciennes » ; lot 3, fonction planifiée mensuelle.
- [ ] Demande de suppression d'une cliente : procédure dans l'admin (anonymiser ses commandes).
- [ ] Pas de traceur publicitaire ni d'analytics avec cookies au lancement → pas de bannière cookies nécessaire. Si un outil de mesure est ajouté plus tard, préférer une solution sans cookies.
- [ ] 🔒 D8 : déclaration ARTCI par la vendeuse.

---

## Phase 13 — Lot 3 : automatisation

**Durée** : 7 à 8 jours. Démarre seulement après validation du catalogue par Meta.

- [ ] `onOrderCreated` : recalcule le total depuis le catalogue et les promos (mêmes fonctions de `packages/shared/domain`, partagées avec `functions`), marque `verified: true` ou `totalMismatch`, décrémente le stock si suivi.
- [ ] `validateOrder` (appelable) : la création de commande passe par la fonction, avec quota par numéro de téléphone (ex. 5 commandes / heure) ; les règles interdisent alors la création directe.
- [ ] `setAdminRole` (appelable, propriétaire) : invite un compte (e-mail d'invitation), pose / retire le rôle.
- [ ] **API WhatsApp Business** :
  - [ ] Compte Meta Business vérifié, numéro dédié (le numéro branché sur l'API ne peut plus servir dans l'application).
  - [ ] Validation de la politique commerciale pour les produits de santé **avant tout développement**.
  - [ ] Modèles approuvés : `commande_recue`, `commande_confirmee`, `commande_expediee`, `commande_livree`.
  - [ ] Secret `WHATSAPP_TOKEN` (déjà déclaré dans `config.ts`), `WHATSAPP_PHONE_ID` en paramètre.
  - [ ] `whatsappWebhook` : vérification GET, signature `X-Hub-Signature-256` contrôlée, enregistrement des statuts de remise et des réponses.
  - [ ] Implémentation niveau 2 de `WhatsAppService` sans changer le parcours cliente.
- [ ] Journal d'audit alimenté côté serveur (déclencheurs) en plus du client.
- [ ] Export planifié de Firestore (Cloud Scheduler + bucket Cloud Storage, rétention 30 jours).
- [ ] Statistiques : ventes par produit / format / zone, taux d'annulation, panier moyen.
- [ ] Redéploiement automatique du pré-rendu à la publication d'un produit (§7.3).

---

## Phase 14 — Recette et mise en ligne

### 14.1 Domaine
- [ ] 🔒 D6 : `celestebotcho.com` (déjà utilisé pour la messagerie chez LWS).
- [ ] Firebase Hosting › Ajouter un domaine personnalisé : `celestebotcho.com` + `www` (redirection vers la racine) pour le site public, `admin.celestebotcho.com` pour l'admin.
- [ ] Ajouter chez LWS les enregistrements `A` / `TXT` fournis par Firebase **sans toucher aux enregistrements `MX`, SPF, DKIM** de la messagerie.
- [ ] Mettre à jour : domaines autorisés de Firebase Auth, domaines reCAPTCHA, restrictions de la clé API, CSP, URL canoniques, sitemap.

### 14.2 Liste de recette (sur un Android d'entrée de gamme, avec la vendeuse)
- [ ] Commande complète en moins de 2 minutes, sur 360 px de large.
- [ ] WhatsApp s'ouvre avec le bon message et le bon numéro.
- [ ] La commande apparaît en temps réel dans l'admin avec alerte sonore.
- [ ] E-mails reçus (propriétaire, cliente) et non classés en spam.
- [ ] Suivi de commande fonctionnel ; changement de statut visible côté cliente.
- [ ] Promo programmée : apparaît et disparaît aux bonnes dates, compte à rebours exact.
- [ ] Mode avion après une première visite : catalogue consultable.
- [ ] Aperçu correct d'un lien produit dans WhatsApp et Facebook.
- [ ] Lighthouse mobile ≥ 90 (performance, accessibilité, bonnes pratiques, SEO) sur accueil, catalogue, fiche.
- [ ] securityheaders.com : note A.
- [ ] Un compte non admin ne peut ni lire une commande ni modifier un produit (test avec la console du navigateur).
- [ ] Moins de 50 000 lectures Firestore / jour (console Firebase › Utilisation, après une semaine).
- [ ] Sauvegarde exportée et restaurée sur l'émulateur.

### 14.3 Après la mise en ligne
- [ ] Former la vendeuse (1 h) : catalogue, commandes, promos, messages ; lui remettre un guide d'une page.
- [ ] Soumettre le sitemap à Google ; partager les liens produits sur Facebook / WhatsApp pour tester les aperçus.
- [ ] Surveiller pendant 2 semaines : erreurs (console Functions), métriques App Check, Core Web Vitals, budget Blaze.

---

## Planning récapitulatif

Développeur seul à temps partiel. Les lots correspondent au cahier des charges.

| Phase | Contenu | Durée | Lot |
|---|---|---|---|
| 0 | Socle, CI, scripts, tests des règles | 3–4 j | 0 |
| 1 | Couche partagée | 4–5 j | 1 |
| 2 | Design system, coque publique | 3 j | 1 |
| 3 | Pages publiques | 6–7 j | 1 |
| 4 | Admin catalogue et configuration | 5 j | 1 |
| 5 | Commande, WhatsApp, e-mails | 4 j | 1 |
| — | **Mise en ligne du lot 1** (Phases 7.1–7.3, 11 et 12 minimales, 14) | 2 j | 1 |
| 6 | Admin gestion quotidienne | 6 j | 2 |
| 7 | SEO complet | 3 j | 2 |
| 8 | PWA | 2 j | 2 |
| 9 | Performance | 2 j | 2 |
| 10 | Accessibilité | 1,5 j | 2 |
| 11 | Sécurité complète (CSP appliquée, App Check appliqué) | 1,5 j | 2 |
| 12 | Conformité | 1 j | 2 |
| 13 | Automatisation | 7–8 j | 3 |

> Le minimum SEO (titres, descriptions, OG, pré-rendu des fiches) fait partie du lot 1 : sans lui, les liens partagés sur WhatsApp n'ont pas d'aperçu dès le lancement.

---

## Annexes

### A. Variables d'environnement et secrets

**Site et admin — `.env.local` (racine)**

| Variable | Rôle | Sensible |
|---|---|---|
| `VITE_FIREBASE_*` (7 variables) | Connexion Firebase | Non (public par nature) |
| `VITE_RECAPTCHA_SITE_KEY` | Clé du site reCAPTCHA v3 (App Check) | Non |
| `VITE_CLOUDINARY_CLOUD_NAME` | `dwzhiapy0` | Non |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | `celeste_admin_unsigned` | Non |
| `VITE_USE_EMULATORS` | `true` en local avec émulateurs | Non |
| `VITE_SITE_URL` (à ajouter) | `https://celestebotcho.com`, pour les URL canoniques et OG | Non |

**Cloud Functions — `functions/.env`** : `SMTP_HOST`, `SMTP_PORT`, `MAIL_FROM_NAME`, `MAIL_TO_OWNER`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` (+ `SITE_URL`, `ADMIN_URL` à ajouter pour les liens dans les e-mails).

**Secret Manager** (`firebase functions:secrets:set NOM`) : `SMTP_USER`, `SMTP_PASSWORD`, `CLOUDINARY_API_SECRET`, `RECAPTCHA_SECRET_KEY`, `WHATSAPP_TOKEN` (lot 3).

**GitHub Actions** : `FIREBASE_SERVICE_ACCOUNT` + toutes les `VITE_*`.

### B. Commandes utiles

```bash
npm run dev:public                 # site public  → http://localhost:5173
npm run dev:admin                  # admin        → http://localhost:5174
npm run emulators                  # émulateurs   → http://localhost:4000
npm run seed                       # jeu d'essai
npm run set-admin -- email owner   # donner un rôle admin
npm test                           # tests unitaires
npm run test:rules                 # tests des règles Firestore
npm run build && npm run prerender # build de production
firebase deploy --only firestore   # règles + index
firebase deploy --only functions
firebase deploy --only hosting:public
firebase deploy --only hosting:admin
firebase functions:secrets:set NOM # créer / modifier un secret
firebase functions:log             # journaux des fonctions
```

### C. Recettes d'URL Cloudinary

| Usage | Transformation |
|---|---|
| Carte produit (2 colonnes mobile) | `f_auto,q_auto,c_fill,ar_1:1,w_360` (+ `w_480`, `w_720` dans `srcset`) |
| Fiche produit, image principale | `f_auto,q_auto,c_pad,b_rgb:140800,ar_1:1,w_768` (+ 480, 1200) |
| Miniature galerie | `f_auto,q_auto,c_fill,ar_1:1,w_120` |
| Bannière accueil mobile | `f_auto,q_auto,c_fill,g_auto,ar_4:5,w_720` |
| Bannière accueil bureau | `f_auto,q_auto,c_fill,g_auto,ar_16:9,w_1600` |
| Couverture catégorie | `f_auto,q_auto,c_fill,g_auto,ar_3:2,w_600` |
| Image OG | `w_1200,h_630,c_fill,f_jpg,q_80` + calques (§7.2) |
| Logo dans les e-mails | `f_png,w_240` |
| Squelette flou (facultatif) | `w_24,e_blur:200,q_30` |

### D. Brouillon de Content-Security-Policy (site public)

```
default-src 'self';
script-src 'self' https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/;
frame-src https://www.google.com/recaptcha/ https://recaptcha.google.com/recaptcha/;
connect-src 'self' https://firestore.googleapis.com https://firebase.googleapis.com
  https://firebaseinstallations.googleapis.com https://content-firebaseappcheck.googleapis.com
  https://www.google.com/recaptcha/;
img-src 'self' data: blob: https://res.cloudinary.com;
style-src 'self' 'unsafe-inline';
font-src 'self';
manifest-src 'self';
worker-src 'self';
object-src 'none';
base-uri 'self';
form-action 'self';
frame-ancestors 'none';
upgrade-insecure-requests;
```

Admin : ajouter à `connect-src` `https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://api.cloudinary.com` et, pour les fonctions appelables, `https://africa-south1-celestebotcho-322a5.cloudfunctions.net`.

> `style-src 'unsafe-inline'` est nécessaire pour les styles posés par lit-html (`styleMap`) ; à retirer si aucun style en ligne n'est utilisé.

### E. Données de départ (seed et première saisie)

| Catégorie | Produits connus |
|---|---|
| Toffi Bassin & Fesses | Toffi Bassin & Fesses — 30 / 55 / 115 boules (🔒 D1, D3) |
| Toffi Grossissant Corps | Toffi Grossissant Corps — 30 / 55 / 115 boules |
| Soins & gamme spécifique | Sirop ventre plat, suppositoires (🔒 D8), crème réparatrice, crème rondeur |

Zones de livraison provisoires : Abidjan (toutes communes) 1 500 F · Intérieur du pays (expédition) 2 000 F (🔒 D5).
