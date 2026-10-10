// Point d'entrée commun à toutes les pages du site public : styles globaux, bandeau cookies,
// barre des réseaux sociaux.
import './styles/fonts.css';
import './styles/tokens.css';
import './styles/base.css';
import './components/cookie-banner/cookie-banner.css';
import { mountCookieBanner } from './components/cookie-banner/cookie-banner';
import './components/social-rail/social-rail.css';
import { mountSocialRail } from './components/social-rail/social-rail';
import { loadSiteSettings, useConfiguredWhatsappNumber } from './stores/settings.store';
import './components/festive/festive.css';
import { initFestive } from './components/festive/festive-entry';

mountCookieBanner();
mountSocialRail();
useConfiguredWhatsappNumber();
initFestive(); // décors de fête (Noël, Nouvel An, Indépendance) selon la Configuration
// coordonnées de la Configuration : lues quand la page est au repos (après le premier affichage)
if (typeof requestIdleCallback === 'function') requestIdleCallback(loadSiteSettings, { timeout: 3000 });
else setTimeout(loadSiteSettings, 1500); // Safari
