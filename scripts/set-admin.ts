// Donne un rôle admin (custom claim `role`) à un compte et crée/met à jour `admins/{uid}`.
// Usage :
//   npm run set-admin -- <email> owner|manager              → projet réel
//   npm run set-admin -- <email> owner|manager --emulator   → émulateurs
// Sur le projet réel, le compte doit déjà exister (console Firebase › Authentication ›
// Ajouter un utilisateur) : l'inscription publique est désactivée.
// La personne doit se déconnecter / reconnecter pour que le nouveau rôle soit pris en compte.
import { FieldValue } from 'firebase-admin/firestore';
import { assertEmulatorsRunning, initAdmin, projectId } from './lib/admin-sdk';

const ROLES = ['owner', 'manager'] as const;
type Role = (typeof ROLES)[number];

const args = process.argv.slice(2);
const emulator = args.includes('--emulator');
const [email, role] = args.filter((a) => !a.startsWith('--'));

if (!email || !ROLES.includes(role as Role)) {
  console.error('Usage : npm run set-admin -- <email> owner|manager [--emulator]');
  process.exit(1);
}

if (emulator) await assertEmulatorsRunning();
const { auth, db } = initAdmin({ emulator });

const user = await auth.getUserByEmail(email).catch(() => null);
if (!user) {
  console.error(
    `Aucun compte ${email} dans ${emulator ? "l'émulateur" : projectId}.\n` +
      (emulator
        ? 'Lancer npm run seed (crée les comptes de test) ou créer le compte dans http://localhost:4000/auth.'
        : 'Le créer d\'abord : console Firebase › Authentication › Utilisateurs › Ajouter un utilisateur.'),
  );
  process.exit(1);
}

await auth.setCustomUserClaims(user.uid, { ...user.customClaims, role });

const ref = db.doc(`admins/${user.uid}`);
const existing = await ref.get();
await ref.set(
  {
    displayName: user.displayName ?? email.split('@')[0],
    email,
    role,
    isActive: true,
    ...(existing.exists ? {} : { lastLoginAt: null, createdAt: FieldValue.serverTimestamp() }),
  },
  { merge: true },
);

console.log(`✓ ${email} (${user.uid}) → rôle « ${role} » sur ${emulator ? 'les émulateurs' : projectId}.`);
console.log('  Se déconnecter puis se reconnecter à l\'admin pour que le rôle soit pris en compte.');
