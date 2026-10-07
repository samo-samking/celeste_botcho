// Carte produit : photo, nom, format, prix, bouton WhatsApp pré-rempli.
import { html } from 'lit-html';
import { formatFcfa } from '@celeste/shared/utils/format-fcfa';
import { icon } from '@celeste/shared/icons/icon';
import { whatsapp } from '@celeste/shared/icons';

export interface ProductCardData {
  id: string;
  name: string;
  format: string;
  price: number;
  image: { src: string; alt: string; width: number; height: number };
}

export function productCard(product: ProductCardData, orderHref: string) {
  return html`
    <article class="product-card" aria-labelledby="product-${product.id}">
      <div class="product-card__media">
        <img src=${product.image.src} alt=${product.image.alt} width=${product.image.width} height=${product.image.height} loading="lazy" decoding="async" />
      </div>
      <div class="product-card__body">
        <h3 class="product-card__name" id="product-${product.id}">${product.name}</h3>
        <p class="product-card__format">${product.format}</p>
        <p class="product-card__price">${formatFcfa(product.price)}</p>
        <a class="btn btn--primary product-card__cta" href=${orderHref} target="_blank" rel="noopener">
          ${icon(whatsapp)} Commander<span class="visually-hidden"> ${product.name}, ${product.format}</span>
        </a>
      </div>
    </article>
  `;
}
