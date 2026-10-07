// Tests des règles Firestore (§0.4) — lancés par `npm run test:rules` dans l'émulateur.
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  setLogLevel,
  updateDoc,
} from "firebase/firestore";

let env: RulesTestEnvironment;

const ORDER_ID = "CB-261007-AB2C";

function validOrder(overrides: Record<string, unknown> = {}) {
  return {
    orderNumber: ORDER_ID,
    status: "new",
    createdAt: serverTimestamp(),
    adminNote: "",
    items: [{ productId: "p1", sku: "p1-30", qty: 1, unitPrice: 2500 }],
    total: 4000,
    customer: { name: "Awa Koné", phone: "+2250507884470", email: null },
    ...overrides,
  };
}

const visitor = () => env.unauthenticatedContext().firestore();
const owner = () => env.authenticatedContext("owner-uid", { role: "owner" }).firestore();
const manager = () => env.authenticatedContext("manager-uid", { role: "manager" }).firestore();
const customerAccount = () => env.authenticatedContext("random-uid").firestore();

beforeAll(async () => {
  setLogLevel("silent"); // les refus attendus (PERMISSION_DENIED) polluent la sortie
  env = await initializeTestEnvironment({
    projectId: "demo-celeste-rules",
    firestore: { rules: readFileSync("firebase/firestore.rules", "utf8") },
  });
});

afterAll(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "products/published"), { status: "published", name: "Savon" });
    await setDoc(doc(db, "products/draft"), { status: "draft", name: "Brouillon" });
    await setDoc(doc(db, "categories/active"), { isActive: true });
    await setDoc(doc(db, "categories/hidden"), { isActive: false });
    await setDoc(doc(db, "settings/public"), { whatsapp: "2250507884470" });
    await setDoc(doc(db, `orders/${ORDER_ID}`), { ...validOrder(), createdAt: new Date() });
    await setDoc(doc(db, "orderTracking/abc"), { status: "new" });
    await setDoc(doc(db, "auditLogs/log1"), { action: "test" });
    await setDoc(doc(db, "admins/owner-uid"), { role: "owner" });
  });
});

describe("visiteur — interdictions", () => {
  it("ne peut pas lire une commande", async () => {
    await assertFails(getDoc(doc(visitor(), `orders/${ORDER_ID}`)));
  });
  it("ne peut pas lister orderTracking", async () => {
    await assertFails(getDocs(collection(visitor(), "orderTracking")));
  });
  it("ne peut pas lire un produit brouillon", async () => {
    await assertFails(getDoc(doc(visitor(), "products/draft")));
  });
  it("ne peut pas lire une catégorie inactive", async () => {
    await assertFails(getDoc(doc(visitor(), "categories/hidden")));
  });
  it("ne peut pas écrire un produit", async () => {
    await assertFails(setDoc(doc(visitor(), "products/new"), { status: "published" }));
  });
  it("ne peut pas écrire settings", async () => {
    await assertFails(setDoc(doc(visitor(), "settings/public"), { whatsapp: "x" }));
  });
  it("ne peut pas supprimer une commande", async () => {
    await assertFails(deleteDoc(doc(visitor(), `orders/${ORDER_ID}`)));
  });
  it("ne peut pas modifier une commande", async () => {
    await assertFails(updateDoc(doc(visitor(), `orders/${ORDER_ID}`), { status: "confirmed" }));
  });
  it("un compte connecté sans rôle n'est pas admin", async () => {
    await assertFails(getDoc(doc(customerAccount(), `orders/${ORDER_ID}`)));
    await assertFails(getDoc(doc(customerAccount(), "products/draft")));
  });
});

describe("visiteur — autorisations", () => {
  it("lit un produit publié, une catégorie active, les settings et un suivi", async () => {
    await assertSucceeds(getDoc(doc(visitor(), "products/published")));
    await assertSucceeds(getDoc(doc(visitor(), "categories/active")));
    await assertSucceeds(getDoc(doc(visitor(), "settings/public")));
    await assertSucceeds(getDoc(doc(visitor(), "orderTracking/abc")));
  });
});

describe("visiteur — création de commande", () => {
  const ID = "CB-261007-XY3Z";
  const create = (data: Record<string, unknown>) => setDoc(doc(visitor(), `orders/${ID}`), data);

  it("crée une commande valide", async () => {
    await assertSucceeds(create(validOrder({ orderNumber: ID })));
  });
  it("refuse un statut différent de 'new'", async () => {
    await assertFails(create(validOrder({ orderNumber: ID, status: "confirmed" })));
  });
  it("refuse un total non entier", async () => {
    await assertFails(create(validOrder({ orderNumber: ID, total: 4000.5 })));
  });
  it("refuse plus de 20 articles", async () => {
    const items = Array.from({ length: 21 }, (_, i) => ({ productId: `p${i}`, sku: `s${i}`, qty: 1 }));
    await assertFails(create(validOrder({ orderNumber: ID, items })));
  });
  it("refuse un panier vide", async () => {
    await assertFails(create(validOrder({ orderNumber: ID, items: [] })));
  });
  it("refuse un téléphone mal formé", async () => {
    await assertFails(
      create(validOrder({ orderNumber: ID, customer: { name: "Awa", phone: "0507884470", email: null } })),
    );
  });
  it("refuse une adminNote remplie", async () => {
    await assertFails(create(validOrder({ orderNumber: ID, adminNote: "remise 50 %" })));
  });
  it("refuse un numéro de commande différent de l'identifiant", async () => {
    await assertFails(create(validOrder({ orderNumber: "CB-000000-AAAA" })));
  });
  it("refuse une date de création fournie par le client", async () => {
    await assertFails(create(validOrder({ orderNumber: ID, createdAt: new Date() })));
  });
});

describe("manager", () => {
  it("lit et met à jour les commandes", async () => {
    await assertSucceeds(getDoc(doc(manager(), `orders/${ORDER_ID}`)));
    await assertSucceeds(updateDoc(doc(manager(), `orders/${ORDER_ID}`), { status: "confirmed" }));
  });
  it("ne peut pas supprimer une commande", async () => {
    await assertFails(deleteDoc(doc(manager(), `orders/${ORDER_ID}`)));
  });
  it("ne peut pas écrire settings", async () => {
    await assertFails(setDoc(doc(manager(), "settings/public"), { whatsapp: "x" }));
  });
  it("ne peut pas écrire admins", async () => {
    await assertFails(setDoc(doc(manager(), "admins/manager-uid"), { role: "owner" }));
  });
  it("met à jour sa propre date de connexion (heure serveur), rien d'autre", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "admins/manager-uid"), { role: "manager", isActive: true, lastLoginAt: null });
    });
    await assertSucceeds(updateDoc(doc(manager(), "admins/manager-uid"), { lastLoginAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(manager(), "admins/manager-uid"), { lastLoginAt: new Date() }));
    await assertFails(updateDoc(doc(manager(), "admins/manager-uid"), { role: "owner", lastLoginAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(manager(), "admins/owner-uid"), { lastLoginAt: serverTimestamp() }));
  });
  it("ne peut pas lire auditLogs", async () => {
    await assertFails(getDoc(doc(manager(), "auditLogs/log1")));
  });
});

describe("propriétaire", () => {
  it("écrit settings et admins, lit auditLogs", async () => {
    await assertSucceeds(setDoc(doc(owner(), "settings/public"), { whatsapp: "2250507884470" }));
    await assertSucceeds(setDoc(doc(owner(), "admins/manager-uid"), { role: "manager" }));
    await assertSucceeds(getDoc(doc(owner(), "auditLogs/log1")));
  });
});

describe("auditLogs — inaltérables", () => {
  it("personne ne modifie ni ne supprime un journal", async () => {
    await assertFails(updateDoc(doc(owner(), "auditLogs/log1"), { action: "x" }));
    await assertFails(deleteDoc(doc(owner(), "auditLogs/log1")));
    await assertFails(updateDoc(doc(manager(), "auditLogs/log1"), { action: "x" }));
    await assertFails(deleteDoc(doc(manager(), "auditLogs/log1")));
  });
});
