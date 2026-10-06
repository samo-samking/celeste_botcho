// Régénère packages/shared/src/icons/index.ts à partir des fichiers SVG (interface, signature, brands).
// Usage : npm run icons
import { readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = join(import.meta.dirname, '../packages/shared/src/icons');
const camel = (s: string) => s.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());

const lines = ['// Généré depuis interface/, signature/ et brands/ — ne pas modifier à la main.', '// Régénérer : npm run icons', ''];
for (const family of ['interface', 'signature', 'brands']) {
  for (const file of readdirSync(join(dir, family)).filter(f => f.endsWith('.svg')).sort()) {
    lines.push(`export { default as ${camel(file.slice(0, -4))} } from './${family}/${file}?raw';`);
  }
}
writeFileSync(join(dir, 'index.ts'), lines.join('\n') + '\n');
console.log(`${lines.length - 3} icônes indexées`);
