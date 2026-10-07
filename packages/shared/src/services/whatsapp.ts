// WhatsApp niveau 1 : liens wa.me pré-remplis (§1.6). Les autres constructeurs
// (buildOrderLink, buildProductLink, buildCustomerLink) arrivent avec les modèles en Phase 1.

/** Lien vers la boutique. `shopNumber` au format international sans « + » : '2250507884470'. */
export function buildContactLink(shopNumber: string, text?: string): string {
  const base = `https://wa.me/${shopNumber.replace(/\D/g, '')}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
