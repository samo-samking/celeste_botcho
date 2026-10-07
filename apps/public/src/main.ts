// Point d'entrée commun à toutes les pages du site public : styles globaux, bandeau cookies.
import './styles/fonts.css';
import './styles/tokens.css';
import './styles/base.css';
import './components/cookie-banner/cookie-banner.css';
import { mountCookieBanner } from './components/cookie-banner/cookie-banner';

mountCookieBanner();
