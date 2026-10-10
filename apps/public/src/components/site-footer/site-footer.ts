// Pied de page : bandeau d'appel WhatsApp, puis 4 colonnes — marque et réseaux, raccourcis de la
// boutique, contact (avec horaires), informations légales (ouvertes dans un panneau de lecture).
// Barre du bas : mention santé, ©, cookies, crédit du développeur.
import { html, nothing } from 'lit-html';
import { formatPhone } from '@celeste/shared/utils/phone';
import { icon } from '@celeste/shared/icons/icon';
import { arrowRight, clock, facebook, instagram, mail, phone, tiktok, whatsapp } from '@celeste/shared/icons';
import { LEGAL_PAGES, openLegal } from '../legal-dialog/legal-dialog';

export interface FooterData {
  phones: string[]; // +225XXXXXXXXXX
  email: string;
  whatsappHref: string;
  /** Numéro WhatsApp affiché (+225XXXXXXXXXX). */
  whatsappPhone: string;
  socials: { facebook: string; instagram: string; tiktok: string };
  businessHours: string;
  slogan: string;
}

const SOCIALS = [
  { key: 'facebook', label: 'Facebook', ico: facebook },
  { key: 'tiktok', label: 'TikTok', ico: tiktok },
  { key: 'instagram', label: 'Instagram', ico: instagram },
] as const;

const SHOP_LINKS = [
  { href: '#produits', label: 'Nos produits' },
  { href: '#commander', label: 'Comment commander' },
  { href: '#faq', label: 'Questions fréquentes' },
];

export function siteFooter({ phones, email, whatsappHref, whatsappPhone, socials, businessHours, slogan }: FooterData) {
  const networks = SOCIALS.filter((s) => socials[s.key]);
  return html`
    <footer class="site-footer" id="contact">
      <!-- bandeau d'appel -->
      <div class="container">
        <div class="footer-cta">
          <!-- bulle de discussion animée (Lottie), montée par home.view.ts -->
          <span class="footer-cta__visual" aria-hidden="true"></span>
          <div class="footer-cta__copy">
            <p class="footer-cta__title">Une question ? Une commande ?</p>
            <p class="footer-cta__text">Réponse rapide sur WhatsApp${businessHours ? ` · ${businessHours}` : ''}.</p>
          </div>
          <a class="btn btn--primary footer-cta__btn" href=${whatsappHref} target="_blank" rel="noopener">${icon(whatsapp)} Écrire sur WhatsApp</a>
        </div>
      </div>

      <div class="container site-footer__grid">
        <div class="site-footer__brand">
          <img class="site-footer__logo" src="/brand/logo-hd.webp" alt="Céleste Bôtchô" width="426" height="168" loading="lazy" />
          <p class="site-footer__tagline">${slogan}<br />Abidjan, Côte d'Ivoire.</p>
          <ul class="site-footer__socials" aria-label="Réseaux sociaux">
            ${networks.map(
              (s) => html`<li><a href=${socials[s.key]} target="_blank" rel="noopener" aria-label="Céleste Bôtchô sur ${s.label}" title=${s.label}>${icon(s.ico)}</a></li>`,
            )}
            <li><a href=${whatsappHref} target="_blank" rel="noopener" aria-label="Nous écrire sur WhatsApp" title="WhatsApp">${icon(whatsapp)}</a></li>
          </ul>
        </div>

        <nav aria-labelledby="footer-shop">
          <h2 class="site-footer__title" id="footer-shop">Boutique</h2>
          <ul class="site-footer__links">
            ${SHOP_LINKS.map((l) => html`<li><a href=${l.href}>${l.label}</a></li>`)}
          </ul>
        </nav>

        <div>
          <h2 class="site-footer__title">Contact</h2>
          <ul class="site-footer__contact">
            ${phones.map((p) => html`<li><a href="tel:${p}">${icon(phone)} ${formatPhone(p)}</a></li>`)}
            <li>
              <a href=${whatsappHref} target="_blank" rel="noopener">
                ${icon(whatsapp)} ${formatPhone(whatsappPhone)} <span class="site-footer__arrow" aria-hidden="true">${icon(arrowRight)}</span>
                <span class="visually-hidden">(WhatsApp)</span>
              </a>
            </li>
            ${email ? html`<li><a href="mailto:${email}">${icon(mail)} ${email}</a></li>` : nothing}
            ${businessHours ? html`<li class="site-footer__hours">${icon(clock)} ${businessHours}</li>` : nothing}
          </ul>
        </div>

        <nav aria-labelledby="footer-legal">
          <h2 class="site-footer__title" id="footer-legal">Informations</h2>
          <ul class="site-footer__links">
            ${LEGAL_PAGES.map(
              (p) => html`<li><a href="#${p.hash}" @click=${(e: MouseEvent) => { e.preventDefault(); openLegal(p.key, email); }}>${p.title}</a></li>`,
            )}
            <li><button class="site-footer__linkbtn" type="button" data-cookie-settings>Gérer les cookies</button></li>
          </ul>
        </nav>
      </div>

      <div class="container site-footer__legal">
        <p>Nos produits ne remplacent pas un avis médical. En cas de doute, demandez conseil à un professionnel de santé.</p>
        <p>© ${new Date().getFullYear()} Céleste Bôtchô · Tous droits réservés</p>
        <p class="site-footer__credit">Site conçu et développé par <strong>DevAlpha</strong>, développeur freelance</p>
      </div>
    </footer>
  `;
}
