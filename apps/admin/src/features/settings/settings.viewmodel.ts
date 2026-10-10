// ViewModel de la Configuration (propriétaire) : lit settings/public et settings/legal, tient le
// formulaire (textes tels que saisis), détecte les modifications et enregistre les deux documents.
import { computed, signal } from '@preact/signals-core';
import type { LegalSettings, PublicSettings } from '@celeste/shared/models';
import type { FestiveMode } from '@celeste/shared/domain/festive';
import { settingsRepository } from '@celeste/shared/repositories/settings.repository';
import { formatPhone } from '@celeste/shared/utils/phone';
import {
  validateLegalSettings,
  validatePublicSettings,
  type LegalSettingsInput,
  type PublicSettingsInput,
} from '@celeste/shared/validation/settings.validation';

export interface FaqRow {
  key: number;
  question: string;
  answer: string;
}

export interface SettingsForm {
  shopName: string;
  slogan: string;
  phones: string[]; // affichés « 05 07 88 44 70 »
  whatsappNumber: string;
  contactEmail: string;
  address: string;
  businessHours: string;
  facebook: string;
  tiktok: string;
  instagram: string;
  announcement: string;
  faq: FaqRow[];
  seoTitle: string;
  seoDescription: string;
  ogImageUrl: string;
  festive: FestiveMode;
  mentionsLegales: string;
  cgv: string;
  confidentialite: string;
}

let faqKey = 0;
export const newFaqRow = (question = '', answer = ''): FaqRow => ({ key: ++faqKey, question, answer });

function toForm(p: PublicSettings, l: LegalSettings): SettingsForm {
  return {
    shopName: p.shopName,
    slogan: p.slogan,
    phones: p.phones.length ? p.phones.map(formatPhone) : [''],
    whatsappNumber: p.whatsappNumber ? formatPhone(`+${p.whatsappNumber}`) : '',
    contactEmail: p.contactEmail,
    address: p.address,
    businessHours: p.businessHours,
    facebook: p.socials.facebook,
    tiktok: p.socials.tiktok,
    instagram: p.socials.instagram,
    announcement: p.announcement ?? '',
    faq: p.faq.map((f) => newFaqRow(f.question, f.answer)),
    seoTitle: p.seo.title,
    seoDescription: p.seo.description,
    ogImageUrl: p.seo.ogImageUrl,
    festive: p.festive,
    mentionsLegales: l.mentionsLegales,
    cgv: l.cgv,
    confidentialite: l.confidentialite,
  };
}

const publicInput = (f: SettingsForm): PublicSettingsInput => ({
  shopName: f.shopName,
  slogan: f.slogan,
  phones: f.phones,
  whatsappNumber: f.whatsappNumber,
  contactEmail: f.contactEmail,
  address: f.address,
  businessHours: f.businessHours,
  socials: { facebook: f.facebook, tiktok: f.tiktok, instagram: f.instagram },
  faq: f.faq.map(({ question, answer }) => ({ question, answer })),
  announcement: f.announcement,
  seo: { title: f.seoTitle, description: f.seoDescription, ogImageUrl: f.ogImageUrl },
  festive: f.festive,
});
const legalInput = (f: SettingsForm): LegalSettingsInput => ({
  mentionsLegales: f.mentionsLegales,
  cgv: f.cgv,
  confidentialite: f.confidentialite,
});

/** Empreinte comparable (les clés techniques des lignes FAQ ne comptent pas). */
const fingerprint = (part: object) => JSON.stringify(part);

export class SettingsViewModel {
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly saving = signal(false);
  readonly errors = signal<Record<string, string>>({});
  /** Le formulaire est muté directement par la vue ; `version` force le recalcul. */
  readonly version = signal(0);
  form: SettingsForm | null = null;
  private savedPublic = '';
  private savedLegal = '';

  readonly publicDirty = computed(() => {
    void this.version.value;
    return !!this.form && fingerprint(publicInput(this.form)) !== this.savedPublic;
  });
  readonly legalDirty = computed(() => {
    void this.version.value;
    return !!this.form && fingerprint(legalInput(this.form)) !== this.savedLegal;
  });
  readonly dirty = computed(() => this.publicDirty.value || this.legalDirty.value);

  async load() {
    this.loading.value = true;
    this.error.value = null;
    try {
      const [p, l] = await Promise.all([settingsRepository.getPublic(), settingsRepository.getLegal()]);
      this.setForm(toForm(p, l));
    } catch {
      this.error.value = 'Impossible de charger la configuration. Vérifiez votre connexion.';
    } finally {
      this.loading.value = false;
    }
  }

  private setForm(form: SettingsForm) {
    this.form = form;
    this.savedPublic = fingerprint(publicInput(form));
    this.savedLegal = fingerprint(legalInput(form));
    this.errors.value = {};
    this.touch();
  }

  /** Signale une modification du formulaire (peek : utilisable depuis un effet sans s'y abonner). */
  touch() {
    this.version.value = this.version.peek() + 1;
  }

  /** Annule les modifications en cours (relit les valeurs enregistrées). */
  async reset() {
    await this.load();
  }

  /** Enregistre ; renvoie false s'il y a des erreurs (affichées par champ). */
  async save(): Promise<boolean> {
    if (!this.form || !this.dirty.value) return true;
    const p = validatePublicSettings(publicInput(this.form));
    const l = validateLegalSettings(legalInput(this.form));
    const errors = { ...(p.ok ? {} : p.errors), ...(l.ok ? {} : l.errors) };
    this.errors.value = errors;
    if (!p.ok || !l.ok) return false;

    this.saving.value = true;
    try {
      const changed = [this.publicDirty.value ? 'boutique' : '', this.legalDirty.value ? 'textes légaux' : ''].filter(Boolean);
      await settingsRepository.save({
        publicInput: this.publicDirty.value ? p.value : undefined,
        legalInput: this.legalDirty.value ? l.value : undefined,
        summary: `Configuration mise à jour : ${changed.join(', ')}`,
      });
      // les valeurs normalisées (téléphones, liens) deviennent la nouvelle référence
      const [pub, legal] = await Promise.all([settingsRepository.getPublic(), settingsRepository.getLegal()]);
      this.setForm(toForm(pub, legal));
      return true;
    } finally {
      this.saving.value = false;
    }
  }
}
