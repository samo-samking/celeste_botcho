// Génère les images du hero de l'accueil à partir des sources de packages/shared/src :
//   - séquence desktop : 114 WebP 1280×720 (images 1 à 228 de la vidéo, une sur deux)
//   - séquence mobile  : 57 WebP 540×720, recadrées au centre sur la femme (une sur quatre) ;
//     le cube de faux produits (75–96 % de la largeur) sort du cadre, aucun masque n'est nécessaire
//   - photos produits  : WebP détourés (alpha conservé), 560 px de haut
// Usage : npm run hero-assets
//
// Commandes ffmpeg équivalentes (depuis la racine du dépôt) :
//   ffmpeg -i packages/shared/src/videos/hero.mp4 -an -vf "select='lt(n,228)*not(mod(n,2))'" -fps_mode vfr \
//     -c:v libwebp -quality 80 -compression_level 6 apps/public/public/hero/desktop/frame_%04d.webp
//   ffmpeg -i packages/shared/src/videos/hero.mp4 -an -vf "select='lt(n,228)*not(mod(n,4))',crop=540:720:370:0" -fps_mode vfr \
//     -c:v libwebp -quality 80 -compression_level 6 apps/public/public/hero/mobile/frame_%04d.webp
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import ffmpeg from 'ffmpeg-static';

const root = join(import.meta.dirname, '..');
const src = join(root, 'packages/shared/src');
const out = join(root, 'apps/public/public');

const SEQUENCES = [
  { name: 'desktop', filter: "select='lt(n,228)*not(mod(n,2))'", expected: 114 },
  { name: 'mobile', filter: "select='lt(n,228)*not(mod(n,4))',crop=540:720:370:0", expected: 57 },
];

const sizeKb = (dir: string) =>
  Math.round(readdirSync(dir).reduce((s, f) => s + statSync(join(dir, f)).size, 0) / 1024);

for (const seq of SEQUENCES) {
  const dir = join(out, 'hero', seq.name);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  execFileSync(ffmpeg as unknown as string, [
    '-hide_banner', '-v', 'error',
    '-i', join(src, 'videos/hero.mp4'),
    '-an', '-vf', seq.filter, '-fps_mode', 'vfr',
    '-c:v', 'libwebp', '-quality', '80', '-compression_level', '6',
    join(dir, 'frame_%04d.webp'),
  ]);
  const count = readdirSync(dir).length;
  if (count !== seq.expected) throw new Error(`${seq.name} : ${count} images au lieu de ${seq.expected}`);
  console.log(`✓ hero/${seq.name} : ${count} images, ${sizeKb(dir)} Ko`);
}

const productsDir = join(out, 'produits');
mkdirSync(productsDir, { recursive: true });
for (const name of ['pot-rose', 'pot-bas', 'pot-blanc']) {
  const file = join(productsDir, `${name}.webp`);
  execFileSync(ffmpeg as unknown as string, [
    '-hide_banner', '-v', 'error', '-y',
    '-i', join(src, `images/${name}.png`),
    '-vf', 'scale=-2:560:flags=lanczos', '-pix_fmt', 'yuva420p',
    '-c:v', 'libwebp', '-quality', '80', '-compression_level', '6',
    file,
  ]);
  console.log(`✓ produits/${name}.webp : ${Math.round(statSync(file).size / 1024)} Ko`);
}
