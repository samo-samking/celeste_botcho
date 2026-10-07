// Panier : uniquement des identifiants et des quantités, conservés sur le téléphone (localStorage).
// Les prix et les noms sont TOUJOURS relus du catalogue (règle « le prix vient du catalogue »).
// Synchronisé entre onglets. Aucune dépendance à Firebase : le compteur de l'en-tête reste léger.
import { computed, signal } from '@preact/signals-core';

export interface CartLine {
  productId: string;
  sku: string;
  qty: number;
}

const KEY = 'cb-cart-v1'; // la version permet de migrer le format plus tard
export const MAX_QTY = 10;
export const MAX_LINES = 20; // même limite que les règles Firestore d'une commande

const valid = (l: unknown): l is CartLine =>
  !!l && typeof (l as CartLine).productId === 'string' && typeof (l as CartLine).sku === 'string' && Number.isInteger((l as CartLine).qty);

function read(): CartLine[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(raw) ? raw.filter(valid).map((l) => ({ ...l, qty: Math.min(MAX_QTY, Math.max(1, l.qty)) })).slice(0, MAX_LINES) : [];
  } catch {
    return [];
  }
}

export const cartLines = signal<CartLine[]>(read());
export const cartCount = computed(() => cartLines.value.reduce((n, l) => n + l.qty, 0));
/** Panneau du panier ouvert. */
export const cartOpen = signal(false);

function save(lines: CartLine[]) {
  cartLines.value = lines;
  try {
    localStorage.setItem(KEY, JSON.stringify(lines));
  } catch {
    /* stockage indisponible (navigation privée) : le panier vit le temps de la page */
  }
}

const same = (l: CartLine, productId: string, sku: string) => l.productId === productId && l.sku === sku;

/** Ajoute (ou augmente) une ligne ; renvoie false si le panier est plein. */
export function addToCart(productId: string, sku: string, qty = 1): boolean {
  const lines = cartLines.value;
  const existing = lines.find((l) => same(l, productId, sku));
  if (existing) {
    save(lines.map((l) => (l === existing ? { ...l, qty: Math.min(MAX_QTY, l.qty + qty) } : l)));
    return true;
  }
  if (lines.length >= MAX_LINES) return false;
  save([...lines, { productId, sku, qty: Math.min(MAX_QTY, qty) }]);
  return true;
}

export function setQty(productId: string, sku: string, qty: number) {
  save(cartLines.value.map((l) => (same(l, productId, sku) ? { ...l, qty: Math.min(MAX_QTY, Math.max(1, qty)) } : l)));
}

export function removeLine(productId: string, sku: string) {
  save(cartLines.value.filter((l) => !same(l, productId, sku)));
}

export function clearCart() {
  save([]);
}

// un ajout dans un autre onglet met ce panier à jour
window.addEventListener('storage', (e) => {
  if (e.key === KEY) cartLines.value = read();
});
