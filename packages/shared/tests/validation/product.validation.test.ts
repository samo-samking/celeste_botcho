import { describe, expect, it } from 'vitest';
import { validateProduct, type ProductInput } from '../../src/validation/product.validation';
import { validateCategory } from '../../src/validation/category.validation';

const product = (over: Partial<ProductInput> = {}): ProductInput => ({
  name: 'Toffi Bassin & Fesses',
  slug: 'toffi-bassin-fesses',
  categoryId: 'c1',
  shortDescription: '',
  description: '',
  composition: '',
  usage: '',
  precautions: '',
  images: [],
  variants: [{ sku: 'TOF-BF-030', label: '30 boules', quantity: 30, price: 2500, stock: null, isActive: true }],
  status: 'draft',
  isFeatured: false,
  sortOrder: 0,
  seo: { title: '', description: '' },
  ...over,
});

describe('validateProduct', () => {
  it('un brouillon incomplet est valide', () => {
    expect(validateProduct(product()).ok).toBe(true);
  });
  it('publier exige photo, composition et précautions', () => {
    const r = validateProduct(product({ status: 'published' }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.status).toBe('Pour publier, il manque : au moins une photo, la composition, les précautions.');
  });
  it('prix non entier, SKU en double, trop de formats', () => {
    const variant = product().variants[0]!;
    const r = validateProduct(product({ variants: [variant, { ...variant, price: 2500.5 }] }));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors['variants.1.price']).toBeDefined();
      expect(r.errors['variants.1.sku']).toBe('SKU en double.');
    }
    const r2 = validateProduct(product({ variants: Array.from({ length: 7 }, (_, i) => ({ ...variant, sku: `S${i}` })) }));
    expect(!r2.ok && r2.errors.variants).toBe('6 formats maximum.');
  });
  it('slug et longueurs SEO', () => {
    const r = validateProduct(product({ slug: 'Pas Bon', seo: { title: 'x'.repeat(61), description: '' } }));
    expect(!r.ok && Object.keys(r.errors).sort()).toEqual(['seo.title', 'slug']);
  });
});

describe('validateCategory', () => {
  it('nom et slug', () => {
    expect(validateCategory({ name: 'Soins', slug: 'soins', description: '', imageUrl: '', color: '#2F6B4F', isActive: true }).ok).toBe(true);
    const r = validateCategory({ name: 'S', slug: 'soins!', description: '', imageUrl: '', color: 'vert', isActive: true });
    expect(!r.ok && Object.keys(r.errors).sort()).toEqual(['color', 'name', 'slug']);
  });
});
