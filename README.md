# Capsurlebourget

Crée une application web complète « Cap sur le Bourget » : une plateforme citoyenne et bénévole de covoiturage pour se rendre à un grand rassemblement politique. Toute l'interface est en français.

## CONTEXTE
- Événement : « Convention & Grand Meeting – Présentation de L'Avenir en commun », avec Jean-Luc Mélenchon.
- Date : samedi 7 novembre 2026. Portes à 13h00, début à 15h00. Gratuit et ouvert à toutes et tous.
- Lieu : Parc des expositions Paris Le Bourget, Hall d'exposition principal, Carrefour Charles Lindbergh, 93350 Le Bourget. Accès : RER B (gare du Bourget) puis navettes ou bus 350 ; autoroute A1 sortie 5 ; parking sur place.
- Conseil à afficher partout où c'est pertinent : « Portes ouvertes dès 13h00 : prévoyez d'arriver tôt ! »
- Toutes ces informations (nom, date, horaires, lieu, textes légaux) doivent être centralisées dans UN SEUL fichier de configuration pour être modifiables facilement.
- Mentions obligatoires, toujours visibles dans un bandeau fin en haut de chaque page : « Site indépendant, créé par des citoyens. Non affilié officiellement à La France insoumise. Retrouvez les informations officielles de l'événement sur les canaux de LFI. » et « Informations à confirmer sur les canaux officiels. »
- Aucun paiement en ligne. Rappel visible : « Plateforme citoyenne et bénévole : la participation aux frais se fait de la main à la main, dans la limite stricte du partage des coûts réels de carburant et de péage (aucun bénéfice). »

## DESIGN
- Thème sombre, sobre et premium, style « titane / verre précis » façon Apple.
- Fond de page #05070E. Cartes : fond #0C101D, bordure fine blanche à 8 % d'opacité, léger reflet intérieur en haut, ombre douce ; au survol la bordure passe à 16 %. Carte active : fond #111729 avec bordure rouge à 40 %.
- Couleur d'accent : rouge #E4002B (boutons principaux, badges, focus). Ambre (#F59E0B / #FBBF24) pour les mises en garde, l'initiative citoyenne et la page « Pourquoi ce site ». Vert émeraude pour les états validés (email vérifié, réservation confirmée). Texte principal #F1F5F9, texte secondaire en gris ardoise.
- Typographies Google Fonts : Outfit (titres, en gras ou extra-gras, MAJUSCULES, interlettrage serré), Plus Jakarta Sans (texte), Bebas Neue (grands chiffres décoratifs). Petites étiquettes en police monospace, majuscules, 10 à 11 px.
- Titres de héros en grand (jusqu'à 8xl), avec dégradé de texte blanc vers rouge (« crimson glow ») sur les mots clés. Coins très arrondis (rounded-xl / 2xl). Boutons principaux rouges, en majuscules, gras.
- Animations discrètes avec Framer Motion (apparition en fondu, léger zoom au survol, retour tactile au clic). Anneau de focus rouge visible au clavier. Contrastes accessibles.
- Mobile d'abord : barre de navigation fixe en bas sur mobile (Accueil, Trajets, bouton central rouge surélevé « Proposer », Messages avec pastille de non-lus, Profil). Sur ordinateur : barre supérieure collante avec logo « 7N » dans un carré rouge dégradé, nom « CAP SUR LE BOURGET » + badge « 7 NOV », sous-titre « Plateforme citoyenne solidaire · 100 % bénévole ».
- Lecteur de musique flottant en bas à gauche, en forme de pilule (« L'Autoradio populaire : Rød – L'Avenir en commun »), qui s'ouvre en petit lecteur YouTube intégré (vidéo ID ysF7Tcw4HbY) avec lecture/pause.

## PAGES
1. **Accueil** : héros avec le titre de l'événement, date, horaires, lieu ; formulaire de recherche rapide (ville de départ, date, nombre de places) ; bloc « Comment ça marche » en 3 étapes ; aperçu des prochains trajets ; carte d'infos pratiques de l'événement ; appel à proposer un trajet ; rappel du conseil d'arriver tôt.
2. **Recherche / Résultats** : liste de cartes de trajets avec filtres (type : aller-retour, aller simple, retour simple ; date ; accessible PMR ; non-fumeur ; café à bord) et tri (heure, prix, places restantes). Chaque carte : ville de départ → Le Bourget, heure de départ, places restantes, prix par place, conducteur avec note, étiquettes d'ambiance. État vide soigné.
3. **Détail d'un trajet** : conducteur (prénom, bio, note, avis), véhicule, points de rendez-vous, étapes intermédiaires, horaires aller et retour, règles de bord (bagages, animaux, musique, non-fumeur, PMR), étiquettes d'ambiance, distance. Bouton « Réserver » ouvrant une fenêtre (nombre de places avec prix total, message optionnel au conducteur). Bouton « Contacter le conducteur ». Lien « Signaler ce trajet ». Le numéro de téléphone du conducteur est masqué (cadenas + explication) tant que la réservation n'est pas confirmée, puis affiché.
4. **Proposer un trajet** (connexion et email vérifié requis) : ville et adresse de rendez-vous, étapes (séparées par des virgules), date et heure d'aller, retour optionnel, type de trajet, places (1 à 8), véhicule, prix par place, description, règles (bagages : petits sacs / sacs à dos et valises cabine / grands bagages ; non-fumeur ; animaux ; PMR ; musique ou podcast) et ambiance (☕ Café thermos, 📻 Playlist & débats, 🥐 Pause croissants, 🚩 Banderoles ok). Intègre le **calculateur de prix juste**.
5. **Calculateur de prix juste** : choix d'une ville (distances routières approximatives jusqu'au Bourget pour ~60 grandes villes de France : Paris 15 km, Lille 210, Rouen 135, Lyon 475, Toulouse 690, etc.) ou saisie de la distance, prix du carburant (1,85 €/L), consommation (6,2 L/100), péage estimé, nombre d'occupants. Calcule le coût réel par personne et applique un **plafond strict de 0,08 € par km et par passager** (et jamais plus de 45 €). Bouton « Appliquer ce prix » et message d'alerte si le prix saisi dépasse le plafond.
6. **Mes trajets** : onglets « Mes réservations » (statut, téléphone du conducteur si confirmé, bouton Annuler, bouton Message) et « Mes annonces » (liste de mes trajets avec demandes reçues à accepter ou refuser, numéro du passager, bouton Supprimer l'annonce).
7. **Messagerie** : liste des conversations à gauche, fil de discussion à droite, une conversation par trajet et par paire d'utilisateurs, messages en temps réel, indicateur de non-lus, réponses rapides (« Je suis en route ! », « Où est le point de rendez-vous ? », etc.).
8. **Profil** : prénom, nom, téléphone (format français valide), véhicule, ville, bio ; statut email vérifié ou non (avec « Renvoyer l'email » et « J'ai cliqué sur le lien ») ; note et avis reçus.
9. **Plan d'accès France** : carte des grands axes (Nord A1, Normandie A13/A15, Ouest A11/A10, Sud A6, Est A4, etc.) avec villes principales, distance et durée moyennes, heure de départ conseillée, péage estimé, point de ralliement, conseil de trajet ; cliquer sur un axe filtre les trajets.
10. **Pourquoi ce site** : texte sur la liberté de réunion, le caractère citoyen, indépendant et bénévole de l'initiative, l'absence de profit.
11. **Signalement** : formulaire (trajet ou utilisateur, motif : prix excessif, spam, propos inappropriés, faux profil, sécurité ; détails). Réservé aux membres connectés.
12. **Mentions légales et règles d'usage**.
Pied de page : mentions, liens officiels (lafranceinsoumise.fr, actionpopulaire.fr), liens vers les pages ci-dessus.

## COMPTES ET DONNÉES (backend réel, pas de données de test)
- Active Lovable Cloud (Supabase) : authentification par email et mot de passe avec **confirmation d'email réelle** (lien envoyé), réinitialisation de mot de passe, inscription avec prénom, nom, téléphone.
- Les pages Proposer, Mes trajets, Messagerie, Profil et Signalement demandent d'être connecté (sinon écran d'invitation à se connecter). La recherche et le détail des trajets sont publics.
- Sans email vérifié : impossible de publier, réserver ou écrire.
- Tables : profiles, trips, bookings, conversations, messages, reports. Le téléphone est stocké dans une table privée séparée : lisible uniquement par son propriétaire et par l'autre partie d'une réservation **confirmée**. Un passager ne voit jamais le téléphone avant confirmation.
- Sécurité (Row Level Security) : chacun ne modifie que ses propres données ; un passager ne peut réserver qu'une fois par trajet, jamais son propre trajet, jamais plus que les places disponibles ; les places restantes sont décrémentées à la réservation et rétablies à l'annulation ou au refus (utilise une fonction SQL transactionnelle pour éviter les surréservations) ; seuls les participants lisent une conversation ; les signalements ne sont lisibles que par un rôle admin.
- Temps réel pour les messages et les places disponibles.
- Démarrage à vide : aucune donnée fictive.

## QUALITÉ
- Tout en français, orthographe soignée, messages d'erreur clairs et bienveillants (ton chaleureux, fraternel, tutoiement).
- Notifications toast pour les actions importantes.
- Responsive impeccable de 360 px à grand écran.
- Validation des formulaires (téléphone français, dates cohérentes, prix plafonné).

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://capsurlebourget.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/633ed69a-2565-4976-a936-9847cb4123e4).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
