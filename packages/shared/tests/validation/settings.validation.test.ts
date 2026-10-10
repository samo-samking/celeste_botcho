import { describe, expect, it } from 'vitest';
import { normalizeSocialUrl, validatePublicSettings, type PublicSettingsInput } from '../../src/validation/settings.validation';

const base = (): PublicSettingsInput => ({
  shopName: 'Céleste Bôtchô',
  slogan: '',
  phones: ['05 07 88 44 70', ''],
  whatsappNumber: '05 07 88 44 70',
  contactEmail: 'Contact@CelesteBotcho.com',
  address: '',
  businessHours: '',
  socials: { facebook: 'facebook.com/celestebotcho', tiktok: '', instagram: '' },
  faq: [{ question: ' Comment payer ? ', answer: 'À la livraison.' }, { question: '', answer: '' }],
  announcement: '  ',
  seo: { title: 'Céleste Bôtchô', description: '', ogImageUrl: '' },
  festive: 'auto',
});

describe('normalizeSocialUrl', () => {
  it('ajoute https et accepte les bons domaines', () => {
    expect(normalizeSocialUrl('facebook', 'facebook.com/celeste')).toBe('https://facebook.com/celeste');
    expect(normalizeSocialUrl('tiktok', 'https://www.tiktok.com/@celeste')).toBe('https://www.tiktok.com/@celeste');
    expect(normalizeSocialUrl('instagram', '')).toBe('');
  });
  it('refuse un lien d’un autre site ou sans compte', () => {
    expect(normalizeSocialUrl('facebook', 'https://www.tiktok.com/@celeste')).toBeNull();
    expect(normalizeSocialUrl('facebook', 'https://facebook.com/')).toBeNull();
    expect(normalizeSocialUrl('tiktok', 'pas un lien')).toBeNull();
  });
});

describe('validatePublicSettings', () => {
  it('normalise téléphones, WhatsApp, e-mail, liens, FAQ et annonce vide', () => {
    const r = validatePublicSettings(base());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.phones).toEqual(['+2250507884470']);
    expect(r.value.whatsappNumber).toBe('2250507884470');
    expect(r.value.contactEmail).toBe('contact@celestebotcho.com');
    expect(r.value.socials.facebook).toBe('https://facebook.com/celestebotcho');
    expect(r.value.faq).toEqual([{ question: 'Comment payer ?', answer: 'À la livraison.' }]);
    expect(r.value.announcement).toBeNull();
  });

  it('signale chaque erreur sur son champ', () => {
    const input = base();
    input.shopName = ' ';
    input.phones = ['05 07 88 44 70', '0507884470', '12'];
    input.whatsappNumber = '0907884470';
    input.contactEmail = 'pas-un-email';
    input.socials.tiktok = 'https://facebook.com/x';
    input.faq = [{ question: 'Question sans réponse', answer: '' }];
    const r = validatePublicSettings(input);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(Object.keys(r.errors).sort()).toEqual(
      ['contactEmail', 'faq.0.answer', 'phones.1', 'phones.2', 'shopName', 'socials.tiktok', 'whatsappNumber'].sort(),
    );
    expect(r.errors['phones.1']).toBe('Numéro en double.');
  });
});
