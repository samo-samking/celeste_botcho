// ViewModel de l'accueil.
// Les produits sont pour l'instant un tableau statique au format des cartes ; en Phase 3 ils
// viendront de productRepository.listPublished() (Firestore), sans changer la vue.
import { signal } from '@preact/signals-core';
import { buildContactLink } from '@celeste/shared/services/whatsapp';
import { formatFcfa } from '@celeste/shared/utils/format-fcfa';
import type { ProductCardData } from '../../components/product-card/product-card';
import { WHATSAPP_MESSAGES, WHATSAPP_NUMBER } from './config';

// ⚠ PROVISOIRE : prix (🔒 D1), formats (🔒 D3) et correspondance photo ↔ format à confirmer.
const STATIC_PRODUCTS: ProductCardData[] = [
  {
    id: 'toffi-30',
    name: 'Bonbons Toffi',
    format: 'Petit pot · 30 boules',
    price: 2500,
    image: { src: '/produits/pot-blanc.webp', alt: 'Pot haut à couvercle blanc rempli de bonbons Toffi Céleste Bôtchô', width: 292, height: 560 },
  },
  {
    id: 'toffi-55',
    name: 'Bonbons Toffi',
    format: 'Pot moyen · 55 boules',
    price: 4000,
    image: { src: '/produits/pot-bas.webp', alt: 'Pot rond et bas rempli de bonbons Toffi Céleste Bôtchô', width: 660, height: 560 },
  },
  {
    id: 'toffi-115',
    name: 'Bonbons Toffi',
    format: 'Grand pot · 115 boules',
    price: 8500,
    image: { src: '/produits/pot-rose.webp', alt: 'Pot transparent à couvercle rose rempli de bonbons Toffi Céleste Bôtchô', width: 424, height: 560 },
  },
];

export class HomeViewModel {
  readonly products = signal<ProductCardData[]>(STATIC_PRODUCTS);
  readonly whatsappHref = buildContactLink(WHATSAPP_NUMBER, WHATSAPP_MESSAGES.general);

  orderHref(product: ProductCardData): string {
    const label = `${product.name}, ${product.format.toLowerCase()}`;
    return buildContactLink(WHATSAPP_NUMBER, WHATSAPP_MESSAGES.product(label, formatFcfa(product.price)));
  }
}
