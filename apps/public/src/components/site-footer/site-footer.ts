// Pied de page : contacts, réseaux sociaux (affichés seulement si renseignés), mention santé.
import { html, nothing } from 'lit-html';
import { icon } from '@celeste/shared/icons/icon';
import { facebook, instagram, phone, tiktok, whatsapp } from '@celeste/shared/icons';

export interface FooterData {
  phones: string[]; // +225XXXXXXXXXX
  whatsappHref: string;
  socials: { facebook: string; instagram: string; tiktok: string };
}

/** +2250507884470 → 05 07 88 44 70 */
const displayPhone = (e164: string) => e164.replace(/^\+225/, '').replace(/(\d{2})(?=\d)/g, '$1 ');

const SOCIAL_ICONS = { facebook, instagram, tiktok } as const;
const SOCIAL_LABELS = { facebook: 'Facebook', instagram: 'Instagram', tiktok: 'TikTok' } as const;

export function siteFooter({ phones, whatsappHref, socials }: FooterData) {
  const socialLinks = (Object.keys(socials) as (keyof typeof socials)[]).filter((k) => socials[k]);
  return html`
    <footer class="site-footer" id="contact">
      <div class="container site-footer__grid">
        <div>
          <img class="site-footer__logo" src="/brand/logo-hd.webp" alt="Céleste Bôtchô" width="426" height="168" loading="lazy" />
          <p class="site-footer__tagline">Plus de volume, plus de confiance. Abidjan, Côte d'Ivoire.</p>
        </div>

        <div>
          <h2 class="site-footer__title">Contact</h2>
          <ul class="site-footer__list">
            ${phones.map(
              (p) => html`<li><a href="tel:${p}">${icon(phone)} ${displayPhone(p)}</a></li>`,
            )}
            <li><a href=${whatsappHref} target="_blank" rel="noopener">${icon(whatsapp)} Écrire sur WhatsApp</a></li>
          </ul>
        </div>

        ${socialLinks.length
          ? html`
              <div>
                <h2 class="site-footer__title">Réseaux</h2>
                <ul class="site-footer__list">
                  ${socialLinks.map(
                    (k) => html`<li><a href=${socials[k]} target="_blank" rel="noopener">${icon(SOCIAL_ICONS[k])} ${SOCIAL_LABELS[k]}</a></li>`,
                  )}
                </ul>
              </div>
            `
          : nothing}
      </div>

      <div class="container site-footer__legal">
        <p>Nos produits ne remplacent pas un avis médical. En cas de doute, demandez conseil à un professionnel de santé.</p>
        <p>© ${new Date().getFullYear()} Céleste Bôtchô</p>
      </div>
    </footer>
  `;
}
