import { describe, expect, it } from 'vitest';
import { buildContactLink, buildCustomerLink } from '../../src/services/whatsapp';

describe('whatsapp', () => {
  it('buildContactLink sans texte', () => {
    expect(buildContactLink('2250507884470')).toBe('https://wa.me/2250507884470');
  });
  it('retire « + » et espaces du numéro', () => {
    expect(buildContactLink('+225 05 07 88 44 70')).toBe('https://wa.me/2250507884470');
  });
  it('encode les caractères spéciaux', () => {
    const url = buildContactLink('2250507884470', 'Toffi Bassin & Fesses : 2 500 F ?');
    expect(url).toBe('https://wa.me/2250507884470?text=Toffi%20Bassin%20%26%20Fesses%20%3A%202%20500%20F%20%3F');
  });
  it('les sauts de ligne sont conservés', () => {
    expect(buildContactLink('225', 'a\nb')).toBe('https://wa.me/225?text=a%0Ab');
  });
  it('les emoji sont encodés correctement', () => {
    const url = buildContactLink('225', 'Merci 🙏');
    expect(decodeURIComponent(url.split('text=')[1]!)).toBe('Merci 🙏');
  });
  it('buildCustomerLink écrit au numéro de la cliente', () => {
    expect(buildCustomerLink('+2250707000001', 'Bonjour')).toBe('https://wa.me/2250707000001?text=Bonjour');
  });
  it.todo('buildOrderLink, buildProductLink (avec le formulaire de commande)');
});
