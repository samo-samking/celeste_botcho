// Jeu d'essai pour les émulateurs : vide la base et l'Auth, puis crée
// 3 catégories, 8 produits, settings/public, settings/legal, 2 promos, 10 commandes
// (+ leur orderTracking), 3 messages et 2 comptes admin de test.
// Usage : npm run emulators   (dans un autre terminal)  puis  npm run seed
//
// ⚠ Émulateurs uniquement. Les prix sont PROVISOIRES (🔒 D1) : données de test, rien d'autre.
import { createHash } from 'node:crypto';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { assertEmulatorsRunning, EMULATOR, initAdmin, projectId } from './lib/admin-sdk';

await assertEmulatorsRunning();

// --- 0. Remise à zéro (API REST des émulateurs)
await fetch(`http://${EMULATOR.firestore}/emulator/v1/projects/${projectId}/databases/(default)/documents`, {
  method: 'DELETE',
});
await fetch(`http://${EMULATOR.auth}/emulator/v1/projects/${projectId}/accounts`, { method: 'DELETE' });

const { auth, db } = initAdmin({ emulator: true });
const batch = db.batch();
const now = FieldValue.serverTimestamp();
const daysFromNow = (d: number) => Timestamp.fromMillis(Date.now() + d * 86_400_000);
const IMG = { url: '/og/og-default.jpg', width: 1200, height: 630 };

// --- 1. Comptes admin de test
const ADMINS = [
  { email: 'proprietaire@celeste.test', displayName: 'Propriétaire (test)', role: 'owner' },
  { email: 'gerant@celeste.test', displayName: 'Gérant (test)', role: 'manager' },
] as const;
const DEV_PASSWORD = 'celeste-dev';
for (const a of ADMINS) {
  const user = await auth.createUser({ email: a.email, password: DEV_PASSWORD, displayName: a.displayName });
  await auth.setCustomUserClaims(user.uid, { role: a.role });
  batch.set(db.doc(`admins/${user.uid}`), {
    displayName: a.displayName,
    email: a.email,
    role: a.role,
    isActive: true,
    lastLoginAt: null,
  });
}

// --- 2. Catégories
const CATEGORIES = [
  { id: 'cat-bassin-fesses', name: 'Toffi Bassin & Fesses', slug: 'toffi-bassin-fesses' },
  { id: 'cat-grossissant', name: 'Toffi Grossissant Corps', slug: 'toffi-grossissant-corps' },
  { id: 'cat-soins', name: 'Soins & gamme spécifique', slug: 'soins-gamme-specifique' },
];

// --- 3. Produits
type Variant = { sku: string; label: string; quantity: number; price: number; stock: number | null; isActive: boolean };
const toffiVariants = (code: string): Variant[] => [
  { sku: `TOF-${code}-030`, label: '30 boules', quantity: 30, price: 2500, stock: null, isActive: true },
  { sku: `TOF-${code}-055`, label: '55 boules', quantity: 55, price: 4000, stock: null, isActive: true },
  { sku: `TOF-${code}-115`, label: '115 boules', quantity: 115, price: 8500, stock: null, isActive: true },
];
const single = (sku: string, label: string, price: number, isActive = true): Variant[] => [
  { sku, label, quantity: 1, price, stock: null, isActive },
];

const PRODUCTS: {
  id: string; name: string; slug: string; categoryId: string; variants: Variant[];
  status: 'draft' | 'published' | 'archived'; isFeatured: boolean;
}[] = [
  { id: 'prod-toffi-bf', name: 'Toffi Bassin & Fesses', slug: 'toffi-bassin-fesses', categoryId: 'cat-bassin-fesses', variants: toffiVariants('BF'), status: 'published', isFeatured: true },
  { id: 'prod-toffi-gc', name: 'Toffi Grossissant Corps', slug: 'toffi-grossissant-corps', categoryId: 'cat-grossissant', variants: toffiVariants('GC'), status: 'published', isFeatured: true },
  { id: 'prod-sirop', name: 'Sirop ventre plat', slug: 'sirop-ventre-plat', categoryId: 'cat-soins', variants: single('SOI-SVP-001', 'Flacon', 5000), status: 'published', isFeatured: false },
  { id: 'prod-creme-rep', name: 'Crème réparatrice', slug: 'creme-reparatrice', categoryId: 'cat-soins', variants: single('SOI-CRP-001', 'Pot', 3500), status: 'published', isFeatured: false },
  { id: 'prod-creme-ron', name: 'Crème rondeur', slug: 'creme-rondeur', categoryId: 'cat-soins', variants: single('SOI-CRO-001', 'Pot', 4500), status: 'published', isFeatured: false },
  { id: 'prod-suppo', name: 'Suppositoires', slug: 'suppositoires', categoryId: 'cat-soins', variants: single('SOI-SUP-001', 'Boîte', 6000), status: 'draft', isFeatured: false },
  { id: 'prod-coffret', name: 'Coffret découverte (test)', slug: 'coffret-decouverte', categoryId: 'cat-bassin-fesses', variants: single('TOF-CDE-001', 'Coffret', 12000, false), status: 'draft', isFeatured: false },
  { id: 'prod-ancien', name: 'Ancienne formule (test)', slug: 'ancienne-formule', categoryId: 'cat-grossissant', variants: single('TOF-ANC-001', 'Boîte', 3000), status: 'archived', isFeatured: false },
];

PRODUCTS.forEach((p, i) => {
  const category = CATEGORIES.find((c) => c.id === p.categoryId)!;
  const active = p.variants.filter((v) => v.isActive);
  batch.set(db.doc(`products/${p.id}`), {
    name: p.name,
    slug: p.slug,
    categoryId: p.categoryId,
    categoryName: category.name,
    shortDescription: `${p.name} — description courte de test.`,
    description: `Description complète de test pour ${p.name}.`,
    composition: p.status === 'published' ? 'Composition de test (🔒 D7).' : '',
    usage: 'Mode d\'emploi de test.',
    precautions: p.status === 'published' ? 'Précautions de test (🔒 D7).' : '',
    images: p.status === 'published' ? [{ ...IMG, alt: p.name }] : [],
    variants: p.variants,
    minPrice: active.length ? Math.min(...active.map((v) => v.price)) : 0,
    status: p.status,
    isFeatured: p.isFeatured,
    inStock: active.length > 0,
    sortOrder: i,
    seo: { title: p.name, description: `${p.name} — Céleste Bôtchô` },
    createdAt: now,
    updatedAt: now,
  });
});

CATEGORIES.forEach((c, i) => {
  batch.set(db.doc(`categories/${c.id}`), {
    name: c.name,
    slug: c.slug,
    description: `Catégorie ${c.name}.`,
    imageUrl: IMG.url,
    sortOrder: i,
    isActive: true,
    productCount: PRODUCTS.filter((p) => p.categoryId === c.id && p.status === 'published').length,
    createdAt: now,
    updatedAt: now,
  });
});

// --- 4. Configuration
const ZONES = [
  { id: 'abidjan', name: 'Abidjan (toutes communes)', mode: 'local', fee: 1500 },
  { id: 'interieur', name: 'Intérieur du pays (expédition)', mode: 'shipping', fee: 2000 },
] as const;

batch.set(db.doc('settings/public'), {
  shopName: 'Céleste Bôtchô',
  slogan: 'Slogan de test',
  logoUrl: '/brand/logo.png',
  phones: ['+2250767107804', '+2250507884470', '+2250141047671'],
  whatsappNumber: '2250507884470',
  socials: { facebook: '', tiktok: '', instagram: '' },
  heroSlides: [{ imageUrl: IMG.url, title: 'Bienvenue (test)', subtitle: 'Carrousel de test', link: '/catalogue' }],
  deliveryZones: ZONES,
  faq: [{ question: 'Comment payer ? (test)', answer: 'À la livraison ou par mobile money.' }],
  announcement: 'Livraison à Abidjan : 1 500 F (test)',
  seo: { title: 'Céleste Bôtchô', description: 'Description SEO de test.', ogImageUrl: '/og/og-default.jpg' },
  contactEmail: 'contact@celestebotcho.com',
  businessHours: 'Lun–Sam, 8 h – 20 h (test)',
  address: 'Abidjan, Côte d\'Ivoire',
  geo: null,
  updatedAt: now,
});

batch.set(db.doc('settings/legal'), {
  mentionsLegales: '# Mentions légales\n\nTexte de test.',
  cgv: '# Conditions générales de vente\n\nTexte de test.',
  confidentialite: '# Politique de confidentialité\n\nTexte de test.',
  updatedAt: now,
});

// --- 5. Promotions
batch.set(db.doc('promotions/promo-bf-10'), {
  title: 'Promo exceptionnelle (test)',
  type: 'percent',
  value: 10,
  scope: 'category',
  targetIds: ['cat-bassin-fesses'],
  code: null,
  bannerImageUrl: null,
  startsAt: daysFromNow(-1),
  endsAt: daysFromNow(7),
  isActive: true,
  createdAt: now,
});
batch.set(db.doc('promotions/promo-bienvenue'), {
  title: 'Code de bienvenue (test)',
  type: 'amount',
  value: 500,
  scope: 'all',
  targetIds: [],
  code: 'BIENVENUE',
  bannerImageUrl: null,
  startsAt: daysFromNow(-10),
  endsAt: daysFromNow(30),
  isActive: true,
  createdAt: now,
});

// --- 6. Commandes (+ orderTracking)
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'; // sans 0/O/1/I/L
const STATUSES = ['new', 'new', 'new', 'confirmed', 'confirmed', 'preparing', 'shipped', 'delivered', 'delivered', 'cancelled'] as const;
const FLOW = ['new', 'confirmed', 'preparing', 'shipped', 'delivered'];
const CUSTOMERS = [
  { name: 'Awa Koné', phone: '+2250707000001', city: 'Abidjan', address: 'Cocody, Riviera 2' },
  { name: 'Mariam Traoré', phone: '+2250505000002', city: 'Abidjan', address: 'Yopougon, Selmer' },
  { name: 'Fatou Bamba', phone: '+2250101000003', city: 'Bouaké', address: 'Quartier Commerce' },
];

STATUSES.forEach((status, i) => {
  const created = Date.now() - (STATUSES.length - i) * 86_400_000;
  const d = new Date(created);
  const yymmdd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const suffix = Array.from({ length: 4 }, (_, k) => ALPHABET[(i * 7 + k * 13) % ALPHABET.length]).join('');
  const orderNumber = `CB-${yymmdd}-${suffix}`;
  const customer = CUSTOMERS[i % CUSTOMERS.length]!;
  const zone = customer.city === 'Abidjan' ? ZONES[0] : ZONES[1];
  const product = PRODUCTS[i % 3]!;
  const variant = product.variants[i % product.variants.length]!;
  const qty = (i % 2) + 1;
  const subtotal = variant.price * qty;
  const total = subtotal + zone.fee;
  const trackingId = createHash('sha256').update(`${orderNumber}|${customer.phone}`).digest('hex');
  const at = Timestamp.fromMillis(created);

  const reached = status === 'cancelled' ? ['new', 'cancelled'] : FLOW.slice(0, FLOW.indexOf(status) + 1);
  batch.set(db.doc(`orders/${orderNumber}`), {
    orderNumber,
    status,
    customer: { ...customer, email: null },
    emailNotifications: false,
    items: [{ productId: product.id, sku: variant.sku, name: product.name, variantLabel: variant.label, unitPrice: variant.price, qty, lineTotal: subtotal }],
    subtotal,
    discount: 0,
    promoCode: null,
    delivery: { mode: zone.mode, zoneId: zone.id, zoneName: zone.name, fee: zone.fee },
    total,
    payment: { method: i % 3 === 0 ? 'mobile_money' : 'cash_on_delivery', status: status === 'delivered' ? 'paid' : 'pending' },
    customerNote: i === 0 ? 'Appeler avant de livrer svp (test)' : '',
    adminNote: '',
    cancelReason: status === 'cancelled' ? 'Cliente injoignable (test)' : null,
    statusHistory: reached.map((s, k) => ({ status: s, at: Timestamp.fromMillis(created + k * 3_600_000), by: k === 0 ? 'customer' : 'seed' })),
    trackingId,
    consentAt: at,
    createdAt: at,
    updatedAt: at,
  });
  batch.set(db.doc(`orderTracking/${trackingId}`), { orderNumber, status, updatedAt: at });
});

// --- 7. Messages
[
  { name: 'Aminata', phone: '+2250707000010', subject: 'Livraison à Yamoussoukro ?', body: 'Bonjour, livrez-vous à Yamoussoukro ? (test)', status: 'new' },
  { name: 'Kadi', phone: '+2250505000011', subject: 'Mode d\'emploi', body: 'Combien de boules par jour ? (test)', status: 'read' },
  { name: 'Salimata', phone: '+2250101000012', subject: 'Merci', body: 'Commande bien reçue, merci ! (test)', status: 'done' },
].forEach((m, i) => {
  batch.set(db.doc(`messages/msg-${i + 1}`), { ...m, email: null, productId: null, createdAt: daysFromNow(-i) });
});

await batch.commit();

console.log(`✓ Jeu d'essai chargé dans les émulateurs (${projectId}) :`);
console.log(`  ${CATEGORIES.length} catégories, ${PRODUCTS.length} produits, 2 promos, ${STATUSES.length} commandes, 3 messages`);
console.log(`  Comptes admin (mot de passe « ${DEV_PASSWORD} ») : ${ADMINS.map((a) => `${a.email} [${a.role}]`).join(', ')}`);
console.log('  Interface des émulateurs : http://localhost:4000');
