// Écran Configuration (propriétaire) : six onglets (Boutique, Réseaux sociaux, Annonce, FAQ,
// Textes légaux, Référencement), une barre d'enregistrement qui apparaît dès qu'on modifie quelque chose.
import { html, nothing, render, type TemplateResult } from 'lit-html';
import { effect } from '@preact/signals-core';
import { icon } from '@celeste/shared/icons/icon';
import {
  alertCircle,
  alertTriangle,
  chevronDown,
  chevronUp,
  clock,
  externalLink,
  facebook,
  globe,
  instagram,
  mail,
  mapPin,
  megaphone,
  phone,
  plus,
  refresh,
  tiktok,
  trash,
  whatsapp,
} from '@celeste/shared/icons';
import { MAX_FAQ, MAX_PHONES } from '@celeste/shared/models';
import { cld } from '@celeste/shared/services/images';
import { normalizeSocialUrl, SETTINGS_LIMITS as L } from '@celeste/shared/validation/settings.validation';
import { festiveThemeOn, FESTIVE_LABELS, FESTIVE_PERIODS, type FestiveMode, type FestiveTheme } from '@celeste/shared/domain/festive';
import { pageHead, type Page } from '../../app/shell.view';
import { formField } from '../../components/form-field/form-field';
import { ImageUploader } from '../../components/image-uploader/image-uploader';
import { confirmDialog } from '../../components/modal/modal';
import { errorMessage, toast } from '../../components/toast/toast';
import { newFaqRow, SettingsViewModel, type SettingsForm } from './settings.viewmodel';

type TabId = 'boutique' | 'reseaux' | 'annonce' | 'fetes' | 'faq' | 'legal' | 'seo';
const TABS: { id: TabId; label: string; keys: RegExp }[] = [
  { id: 'boutique', label: 'Boutique', keys: /^(shopName|slogan|phones|whatsappNumber|contactEmail|address|businessHours)/ },
  { id: 'reseaux', label: 'Réseaux sociaux', keys: /^socials\./ },
  { id: 'annonce', label: 'Annonce', keys: /^announcement/ },
  { id: 'fetes', label: 'Fêtes', keys: /^festive/ },
  { id: 'faq', label: 'FAQ', keys: /^faq/ },
  { id: 'legal', label: 'Textes légaux', keys: /^(mentionsLegales|cgv|confidentialite)/ },
  { id: 'seo', label: 'Référencement', keys: /^seo\./ },
];
const LEGAL: { key: 'mentionsLegales' | 'cgv' | 'confidentialite'; label: string; hint: string }[] = [
  { key: 'mentionsLegales', label: 'Mentions légales', hint: 'Éditeur du site, hébergeur, contact.' },
  { key: 'cgv', label: 'Conditions générales de vente', hint: 'Commande, prix, livraison, paiement à la livraison, retours.' },
  { key: 'confidentialite', label: 'Politique de confidentialité', hint: 'Données collectées (nom, téléphone, adresse), usage, durée de conservation, droits.' },
];
const SITE_DOMAIN = 'celestebotcho.com';
/** Boutique où prévisualiser les décors (en local : la boutique de développement ou compilée). */
const SHOP_URL =
  location.hostname === 'localhost' ? `${location.protocol}//localhost:${location.port === '5174' ? '5173' : '4173'}` : 'https://celestebotcho-322a5.web.app';
const PREVIEW_SLUG: Record<FestiveTheme, string> = { yearend: 'fin-annee', independence: 'independance' };
const FESTIVE_DESC: Record<FestiveTheme, string> = {
  yearend: 'Flocons et paillettes dorées, guirlande lumineuse sous le menu ; vœux « Joyeux Noël » jusqu’au 25 décembre, puis « Bonne année ».',
  independence: 'Ruban orange, blanc, vert sous le menu, confettis aux couleurs du drapeau, vœux du 7 août.',
};
const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const dayLabel = ([m, d]: [number, number]) => `${d === 1 ? '1er' : d} ${MONTHS[m - 1]}`;

export function settingsPage(): Page {
  return {
    title: 'Configuration',
    mount(outlet) {
      const vm = new SettingsViewModel();
      let tab: TabId = 'boutique';
      let uploader: ImageUploader | null = null;
      let stopUploader: (() => void) | null = null;

      /** Image de partage : un envoi unique, recréé à chaque chargement des réglages. */
      const resetUploader = () => {
        stopUploader?.();
        uploader?.dispose();
        const url = vm.form?.ogImageUrl;
        uploader = new ImageUploader({
          id: 'og-image',
          folder: 'celeste/seo',
          max: 1,
          initial: url ? [{ url, width: 1200, height: 630, alt: '' }] : [],
        });
        stopUploader = effect(() => {
          void uploader!.items.value;
          if (vm.form && !uploader!.busy) {
            const next = uploader!.photos[0]?.url ?? '';
            if (next !== vm.form.ogImageUrl) {
              vm.form.ogImageUrl = next;
              vm.touch();
            }
          }
          vm.touch();
        });
      };

      void vm.load().then(resetUploader);

      const set = <K extends keyof SettingsForm>(key: K, value: SettingsForm[K]) => {
        vm.form![key] = value;
        vm.touch();
      };
      const err = (key: string) => vm.errors.value[key];

      const save = async () => {
        if (uploader?.busy) {
          toast.info("Patientez : l'image est encore en cours d'envoi.");
          return;
        }
        try {
          const ok = await vm.save();
          if (!ok) {
            const first = TABS.find((t) => Object.keys(vm.errors.value).some((k) => t.keys.test(k)));
            if (first) tab = first.id;
            vm.touch();
            toast.error('Certains champs sont à corriger (onglets marqués d’un point rouge).');
            return;
          }
          resetUploader();
          toast.success('Configuration enregistrée. La boutique l’affiche dès la prochaine visite.');
        } catch (e) {
          toast.error(errorMessage(e));
        }
      };

      const cancel = async () => {
        const ok = await confirmDialog({
          title: 'Annuler les modifications ?',
          message: 'Les changements non enregistrés seront perdus.',
          confirmLabel: 'Annuler les modifications',
          danger: true,
        });
        if (!ok) return;
        await vm.reset();
        resetUploader();
      };

      // quitter l'onglet du navigateur avec des modifications : avertissement natif
      const onBeforeUnload = (e: BeforeUnloadEvent) => {
        if (vm.dirty.value) e.preventDefault();
      };
      window.addEventListener('beforeunload', onBeforeUnload);

      // --- Onglets ------------------------------------------------------------------------
      const card = (title: string, intro: string | TemplateResult, body: unknown) => html`
        <section class="set-card">
          <h2 class="set-card__title">${title}</h2>
          <p class="set-card__intro">${intro}</p>
          <div class="set-card__body">${body}</div>
        </section>
      `;

      const boutique = (f: SettingsForm) => html`
        ${card(
          'Identité',
          'Le nom et le slogan apparaissent dans le pied de page et les aperçus de liens.',
          html`
            ${formField({ id: 'set-name', label: 'Nom de la boutique', value: f.shopName, maxLength: L.shopName, required: true, error: err('shopName'), onInput: (v) => set('shopName', v) })}
            ${formField({ id: 'set-slogan', label: 'Slogan', value: f.slogan, maxLength: L.slogan, optional: true, error: err('slogan'), onInput: (v) => set('slogan', v) })}
          `,
        )}
        ${card(
          'Contact',
          'Ces coordonnées remplacent celles du site : pied de page, boutons WhatsApp, appels.',
          html`
            <div class="field">
              <p class="field__label" id="set-phones-label">Téléphones affichés</p>
              <ul class="set-list" aria-labelledby="set-phones-label">
                ${f.phones.map(
                  (p, i) => html`
                    <li class="set-list__row">
                      ${formField({
                        id: `set-phone-${i}`,
                        label: `Numéro ${i + 1}`,
                        value: p,
                        inputmode: 'numeric',
                        placeholder: '05 07 88 44 70',
                        leadingIcon: phone,
                        error: err(`phones.${i}`),
                        onInput: (v) => {
                          f.phones[i] = v;
                          vm.touch();
                        },
                      })}
                      <button class="icon-btn icon-btn--danger set-list__remove" type="button" ?disabled=${f.phones.length === 1}
                        @click=${() => {
                          f.phones.splice(i, 1);
                          vm.touch();
                        }}>
                        ${icon(trash, { label: `Retirer le numéro ${i + 1}` })}
                      </button>
                    </li>
                  `,
                )}
              </ul>
              ${err('phones') ? html`<p class="field__error">${err('phones')}</p>` : nothing}
              ${f.phones.length < MAX_PHONES
                ? html`<button class="btn btn--secondary btn--sm set-add" type="button" @click=${() => {
                    f.phones.push('');
                    vm.touch();
                    queueMicrotask(() => document.getElementById(`set-phone-${f.phones.length - 1}`)?.focus());
                  }}>${icon(plus)} Ajouter un numéro</button>`
                : nothing}
            </div>
            ${formField({
              id: 'set-whatsapp',
              label: 'Numéro WhatsApp de la boutique',
              value: f.whatsappNumber,
              inputmode: 'numeric',
              placeholder: '05 07 88 44 70',
              leadingIcon: whatsapp,
              required: true,
              hint: 'Reçoit les commandes et les questions envoyées depuis le site.',
              error: err('whatsappNumber'),
              onInput: (v) => set('whatsappNumber', v),
            })}
            ${formField({ id: 'set-email', label: 'E-mail de contact', type: 'email', value: f.contactEmail, leadingIcon: mail, optional: true, error: err('contactEmail'), onInput: (v) => set('contactEmail', v) })}
            ${formField({ id: 'set-address', label: 'Adresse', value: f.address, leadingIcon: mapPin, maxLength: L.address, optional: true, placeholder: "Cocody, Abidjan, Côte d'Ivoire", error: err('address'), onInput: (v) => set('address', v) })}
            ${formField({ id: 'set-hours', label: 'Horaires', value: f.businessHours, leadingIcon: clock, maxLength: L.businessHours, optional: true, placeholder: 'Lun – Sam, 8 h – 20 h', error: err('businessHours'), onInput: (v) => set('businessHours', v) })}
          `,
        )}
      `;

      const social = (f: SettingsForm, key: 'facebook' | 'tiktok' | 'instagram', label: string, ico: string, example: string) => {
        const url = normalizeSocialUrl(key, f[key]);
        return formField({
          id: `set-${key}`,
          label,
          value: f[key],
          leadingIcon: ico,
          optional: true,
          placeholder: example,
          error: err(`socials.${key}`),
          hint: 'Laissez vide si vous n’avez pas de compte : l’icône ne sera pas affichée.',
          trailing: url
            ? html`<a class="field__action" href=${url} target="_blank" rel="noopener" title="Ouvrir le lien">${icon(externalLink, { label: `Ouvrir le lien ${label}` })}</a>`
            : undefined,
          onInput: (v) => set(key, v),
        });
      };
      const reseaux = (f: SettingsForm) =>
        card(
          'Réseaux sociaux',
          'Les icônes apparaissent à gauche de l’écran et dans le pied de page de la boutique.',
          html`
            ${social(f, 'facebook', 'Page Facebook', facebook, 'https://www.facebook.com/celestebotcho')}
            ${social(f, 'tiktok', 'Compte TikTok', tiktok, 'https://www.tiktok.com/@celestebotcho')}
            ${social(f, 'instagram', 'Compte Instagram', instagram, 'https://www.instagram.com/celestebotcho')}
          `,
        );

      const annonce = (f: SettingsForm) =>
        card(
          'Bandeau d’annonce',
          'Une phrase courte en haut de la boutique : promotion, délai de livraison, fermeture exceptionnelle… Laissez vide pour ne rien afficher.',
          html`
            ${formField({
              id: 'set-announcement',
              label: 'Texte de l’annonce',
              value: f.announcement,
              leadingIcon: megaphone,
              maxLength: L.announcement,
              optional: true,
              placeholder: 'Livraison offerte à Abidjan ce week-end',
              error: err('announcement'),
              onInput: (v) => set('announcement', v),
            })}
            <div class="set-preview">
              <p class="set-preview__label">Aperçu</p>
              ${f.announcement.trim()
                ? html`<div class="announce-preview">${icon(megaphone)}<span>${f.announcement.trim()}</span></div>`
                : html`<p class="set-preview__empty">Aucun bandeau affiché.</p>`}
            </div>
          `,
        );

      const fetes = (f: SettingsForm) => {
        const today = festiveThemeOn(new Date());
        const option = (mode: FestiveMode, title: string, desc: string) => html`
          <label class="fest-opt ${f.festive === mode ? 'is-active' : ''}">
            <input type="radio" name="festive" .checked=${f.festive === mode} @change=${() => set('festive', mode)} />
            <span><strong>${title}</strong><small>${desc}</small></span>
          </label>
        `;
        return html`
          ${card(
            'Décors de fête',
            'Le site s’habille pour les fêtes : décor léger, qui ne gêne pas la navigation, et immobile pour les personnes qui ont réduit les animations.',
            html`
              <div class="fest-opts" role="radiogroup" aria-label="Mode des décors">
                ${option('auto', 'Automatique (conseillé)', `Selon les dates ci-dessous. Aujourd’hui : ${today ? FESTIVE_LABELS[today] : 'aucune fête'}.`)}
                ${option('off', 'Désactivé', 'Aucun décor, même pendant les fêtes.')}
                ${(Object.keys(FESTIVE_LABELS) as FestiveTheme[]).map((t) =>
                  option(t, `Toujours : ${FESTIVE_LABELS[t]}`, 'Affiché sur la boutique jusqu’à ce que vous changiez de mode.'),
                )}
              </div>
            `,
          )}
          ${card(
            'Les thèmes',
            'Prévisualisez un décor : il ne s’affiche que pour vous, dans l’onglet ouvert. Rien ne change pour les clientes.',
            html`<ul class="fest-list">
              ${FESTIVE_PERIODS.map(
                (p) => html`<li class="fest fest--${p.theme}">
                  <span class="fest__swatch" aria-hidden="true"></span>
                  <div class="fest__main">
                    <p class="fest__name">${p.label}</p>
                    <p class="fest__dates">Du ${dayLabel(p.from)} au ${dayLabel(p.to)}</p>
                    <p class="fest__desc">${FESTIVE_DESC[p.theme]}</p>
                  </div>
                  <a class="btn btn--secondary btn--sm" href="${SHOP_URL}/?fete=${PREVIEW_SLUG[p.theme]}" target="_blank" rel="noopener">
                    ${icon(externalLink)} Prévisualiser
                  </a>
                </li>`,
              )}
            </ul>`,
          )}
        `;
      };

      const moveFaq = (f: SettingsForm, i: number, to: number) => {
        if (to < 0 || to >= f.faq.length) return;
        f.faq.splice(to, 0, f.faq.splice(i, 1)[0]!);
        vm.touch();
        queueMicrotask(() => document.querySelector<HTMLElement>(`[data-faq="${f.faq[to]!.key}"] .faq-row__move--${to < i ? 'up' : 'down'}`)?.focus());
      };
      const faq = (f: SettingsForm) =>
        card(
          'Questions fréquentes',
          'Affichées sur la page Contact, dans l’ordre de cette liste. Réponses courtes et concrètes : paiement, délais, discrétion de l’emballage…',
          html`
            ${f.faq.length
              ? html`<ol class="faq-list">
                  ${f.faq.map(
                    (row, i) => html`
                      <li class="faq-row" data-faq=${row.key}>
                        <span class="faq-row__num" aria-hidden="true">${i + 1}</span>
                        <div class="faq-row__fields">
                          ${formField({ id: `faq-${row.key}-q`, label: `Question ${i + 1}`, value: row.question, maxLength: L.question, error: err(`faq.${i}.question`), onInput: (v) => { row.question = v; vm.touch(); } })}
                          ${formField({ id: `faq-${row.key}-a`, label: 'Réponse', value: row.answer, multiline: true, rows: 3, maxLength: L.answer, error: err(`faq.${i}.answer`), onInput: (v) => { row.answer = v; vm.touch(); } })}
                        </div>
                        <div class="faq-row__tools">
                          <button class="icon-btn faq-row__move--up" type="button" ?disabled=${i === 0} @click=${() => moveFaq(f, i, i - 1)}>${icon(chevronUp, { label: `Monter la question ${i + 1}` })}</button>
                          <button class="icon-btn faq-row__move--down" type="button" ?disabled=${i === f.faq.length - 1} @click=${() => moveFaq(f, i, i + 1)}>${icon(chevronDown, { label: `Descendre la question ${i + 1}` })}</button>
                          <button class="icon-btn icon-btn--danger" type="button" @click=${() => { f.faq.splice(i, 1); vm.touch(); }}>${icon(trash, { label: `Supprimer la question ${i + 1}` })}</button>
                        </div>
                      </li>
                    `,
                  )}
                </ol>`
              : html`<p class="set-preview__empty">Aucune question pour l’instant.</p>`}
            ${err('faq') ? html`<p class="field__error">${err('faq')}</p>` : nothing}
            ${f.faq.length < MAX_FAQ
              ? html`<button class="btn btn--secondary btn--sm set-add" type="button" @click=${() => {
                  const row = newFaqRow();
                  f.faq.push(row);
                  vm.touch();
                  queueMicrotask(() => document.getElementById(`faq-${row.key}-q`)?.focus());
                }}>${icon(plus)} Ajouter une question</button>`
              : nothing}
          `,
        );

      const legal = (f: SettingsForm) =>
        card(
          'Textes légaux',
          html`Obligatoires pour vendre en ligne. Mise en forme simple : <code># Titre</code>, <code>**gras**</code>, <code>- liste</code>.`,
          LEGAL.map(({ key, label, hint }) =>
            formField({ id: `set-${key}`, label, value: f[key], multiline: true, rows: 10, hint, error: err(key), onInput: (v) => set(key, v) }),
          ),
        );

      const seo = (f: SettingsForm) => {
        const title = f.seoTitle.trim() || f.shopName;
        const desc = f.seoDescription.trim();
        return html`
          ${card(
            'Google et aperçus de liens',
            'Titre et description de la page d’accueil dans Google, et l’aperçu qui s’affiche quand on partage le lien du site sur WhatsApp ou Facebook.',
            html`
              ${formField({ id: 'set-seo-title', label: 'Titre', value: f.seoTitle, maxLength: L.seoTitle, error: err('seo.title'), onInput: (v) => set('seoTitle', v) })}
              ${formField({ id: 'set-seo-desc', label: 'Description', value: f.seoDescription, multiline: true, rows: 3, maxLength: L.seoDescription, error: err('seo.description'), onInput: (v) => set('seoDescription', v) })}
              <div class="field">
                <p class="field__label">Image de partage</p>
                <p class="field__hint">Format paysage 1 200 × 630 px conseillé.</p>
                ${uploader?.template() ?? nothing}
              </div>
            `,
          )}
          <section class="set-card">
            <h2 class="set-card__title">Aperçu du partage</h2>
            <div class="share-preview">
              ${f.ogImageUrl
                ? html`<img class="share-preview__img" src=${cld(f.ogImageUrl, 'c_fill,w_600,h_315')} alt="" />`
                : html`<div class="share-preview__img share-preview__img--empty">${icon(globe)}</div>`}
              <div class="share-preview__text">
                <p class="share-preview__domain">${SITE_DOMAIN}</p>
                <p class="share-preview__title">${title}</p>
                ${desc ? html`<p class="share-preview__desc">${desc}</p>` : nothing}
              </div>
            </div>
          </section>
        `;
      };

      const content = (f: SettingsForm) => {
        switch (tab) {
          case 'boutique': return boutique(f);
          case 'reseaux': return reseaux(f);
          case 'annonce': return annonce(f);
          case 'fetes': return fetes(f);
          case 'faq': return faq(f);
          case 'legal': return legal(f);
          case 'seo': return seo(f);
        }
      };

      const tabWithErrors = (t: (typeof TABS)[number]) => Object.keys(vm.errors.value).some((k) => t.keys.test(k));

      const dispose = effect(() => {
        void vm.version.value;
        const f = vm.form;
        const errorCount = Object.keys(vm.errors.value).length;
        render(
          html`
            ${pageHead('Configuration', 'Coordonnées, réseaux sociaux, annonce, FAQ, textes légaux et référencement de la boutique.')}
            ${vm.error.value
              ? html`<div class="callout callout--error" role="alert">
                  ${icon(alertTriangle)}<span>${vm.error.value}</span>
                  <button class="btn btn--secondary btn--sm" type="button" @click=${() => vm.load().then(resetUploader)}>${icon(refresh)} Réessayer</button>
                </div>`
              : nothing}
            ${vm.loading.value && !f
              ? html`<div class="set-card set-card--skeleton" aria-busy="true"><span class="skeleton-line"></span><span class="skeleton-line"></span></div>`
              : f
                ? html`
                    <div class="tabs set-tabs" role="tablist" aria-label="Sections de la configuration">
                      ${TABS.map(
                        (t) => html`
                          <button class="tab ${tab === t.id ? 'is-active' : ''}" type="button" role="tab" id="set-tab-${t.id}"
                            aria-selected=${tab === t.id ? 'true' : 'false'} aria-controls="set-panel"
                            @click=${() => { tab = t.id; vm.touch(); }}>
                            ${t.label}
                            ${tabWithErrors(t) ? html`<span class="set-tabs__dot" title="À corriger"><span class="visually-hidden">(à corriger)</span></span>` : nothing}
                          </button>
                        `,
                      )}
                    </div>
                    <div class="set-panel" id="set-panel" role="tabpanel" aria-labelledby="set-tab-${tab}">${content(f)}</div>

                    <div class="set-bar ${vm.dirty.value || vm.saving.value ? 'is-visible' : ''}" role="region" aria-label="Enregistrement">
                      <p class="set-bar__text">
                        ${errorCount
                          ? html`${icon(alertCircle)} ${errorCount > 1 ? `${errorCount} champs à corriger` : 'Un champ à corriger'}`
                          : 'Modifications non enregistrées'}
                      </p>
                      <button class="btn btn--secondary" type="button" ?disabled=${vm.saving.value} @click=${cancel}>Annuler</button>
                      <button class="btn btn--primary" type="button" ?disabled=${vm.saving.value} @click=${save}>
                        ${vm.saving.value ? 'Enregistrement…' : 'Enregistrer'}
                      </button>
                    </div>
                  `
                : nothing}
          `,
          outlet,
        );
      });

      return () => {
        dispose();
        stopUploader?.();
        uploader?.dispose();
        window.removeEventListener('beforeunload', onBeforeUnload);
      };
    },
  };
}
