import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const root = __dirname;

export default defineConfig({
  root,
  envDir: resolve(root, '../..'),
  resolve: {
    alias: { '@celeste/shared': resolve(root, '../../packages/shared/src') },
  },
  server: { port: 5173 },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      // site multi-pages : une entrée par page
      input: {
        index: resolve(root, 'index.html'),
        catalogue: resolve(root, 'catalogue.html'),
        produit: resolve(root, 'produit.html'),
        commande: resolve(root, 'commande.html'),
        suivi: resolve(root, 'suivi.html'),
        contact: resolve(root, 'contact.html'),
      },
    },
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: false, // public/manifest.webmanifest
    }),
  ],
});
