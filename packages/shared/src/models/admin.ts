export interface Admin {
  displayName: string;
  email: string;
  role: 'owner' | 'manager'; // miroir du custom claim, pour l'affichage
  isActive: boolean;
  lastLoginAt: Date | null;
}
