// Génère l'animation Lottie du bandeau cookies : un cookie caramel qui rebondit, se fait croquer
// (croc + miettes), puis rapetisse et revient. Boucle de 3 s, 200 × 200, fond transparent, vectoriel pur
// (compatible avec le lecteur lottie « light » : ni expressions, ni effets, ni images).
//   node design/lotties/generer-cookie.mjs  →  packages/shared/src/lotties/cookie.json
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT = join(import.meta.dirname, '../../packages/shared/src/lotties/cookie.json');
const FPS = 30;
const END = 90; // 3 s

// Couleurs de la charte (0 → 1)
const hex = (h) => [1, 3, 5].map((i) => +(parseInt(h.slice(i, i + 2), 16) / 255).toFixed(4)).concat(1);
const C = {
  dough: hex('#d39a3a'), // pâte dorée
  edge: hex('#a9581f'), // bord caramel
  chip: hex('#5a2c0d'), // pépites
  shine: hex('#ffd95a'), // reflet
  crumb: hex('#c98a00'),
  sparkle: hex('#ffd95a'),
};

// --- Briques Lottie -------------------------------------------------------------------------
const still = (k) => ({ a: 0, k });
const ease = { i: { x: [0.45], y: [1] }, o: { x: [0.55], y: [0] } };
/** Propriété animée : [[image, valeur], …] ; « hold » = changement instantané. */
const anim = (keys, { hold = false } = {}) => ({
  a: 1,
  k: keys.map(([t, v], idx) => {
    const s = Array.isArray(v) ? v : [v];
    return idx === keys.length - 1 ? { t, s } : { t, s, ...(hold ? { h: 1 } : ease) };
  }),
});
const transform = (o = {}) => ({
  ty: 'tr',
  p: o.p ?? still([0, 0]),
  a: still([0, 0]),
  s: o.s ?? still([100, 100]),
  r: o.r ?? still(0),
  o: o.o ?? still(100),
  sk: still(0),
  sa: still(0),
});
const ellipse = (x, y, w, h) => ({ ty: 'el', d: 1, p: still([x, y]), s: still([w, h]) });
const fill = (c, o = 100) => ({ ty: 'fl', c: still(c), o: still(o), r: 1 });
const stroke = (c, w) => ({ ty: 'st', c: still(c), o: still(100), w: still(w), lc: 2, lj: 2 });
const group = (nm, items, tr) => ({ ty: 'gr', nm, it: [...items, tr ?? transform()] });

/** Cercle en courbes de Bézier (pour le masque « croc »). */
function circlePath(cx, cy, r) {
  const k = 0.5523 * r;
  return {
    c: true,
    v: [[cx, cy - r], [cx + r, cy], [cx, cy + r], [cx - r, cy]],
    i: [[-k, 0], [0, -k], [k, 0], [0, k]],
    o: [[k, 0], [0, k], [-k, 0], [0, -k]],
  };
}

const layer = (ind, nm, ks, shapes, extra = {}) => ({
  ddd: 0, ind, ty: 4, nm, sr: 1, ao: 0, ip: 0, op: END, st: 0, bm: 0,
  ks: { a: still([0, 0, 0]), p: still([100, 100, 0]), s: still([100, 100, 100]), r: still(0), o: still(100), ...ks },
  shapes,
  ...extra,
});

// --- Cookie ----------------------------------------------------------------------------------
const CHIPS = [
  [-22, -18, 13, 11], [12, -30, 10, 9], [24, 6, 14, 12], [-8, 14, 11, 10],
  [-30, 16, 9, 8], [6, 34, 10, 9], [-38, -6, 7, 7], [34, -12, 8, 7],
];
const cookie = layer(
  3,
  'Cookie',
  {
    // pop d'entrée, petit rebond, écrasement au croc, puis disparition avant la boucle
    p: anim([[0, [100, 104, 0]], [14, [100, 96, 0]], [24, [100, 101, 0]], [44, [100, 98, 0]], [66, [100, 102, 0]], [90, [100, 104, 0]]]),
    s: anim([[0, [1, 1, 100]], [9, [108, 108, 100]], [14, [100, 100, 100]], [24, [100, 100, 100]], [27, [107, 93, 100]], [31, [97, 103, 100]], [35, [100, 100, 100]], [74, [100, 100, 100]], [84, [1, 1, 100]], [90, [1, 1, 100]]]), // jamais 0 : le masque « croc » inverse cette échelle
    r: anim([[0, -8], [45, 6], [84, -4], [90, -8]]),
  },
  [
    group('Reflet', [ellipse(-18, -30, 34, 12), fill(C.shine, 45)]),
    group('Pépites', CHIPS.map(([x, y, w, h]) => ellipse(x, y, w, h)).concat(fill(C.chip))),
    group('Pâte', [ellipse(0, 0, 120, 120), fill(C.dough), stroke(C.edge, 5)]),
  ],
  {
    hasMask: true,
    // le croc : un disque soustrait en haut à droite, qui apparaît d'un coup au moment du croc
    masksProperties: [
      { nm: 'Croc', inv: false, mode: 's', pt: still(circlePath(46, -46, 25)), o: anim([[0, 0], [26, 100], [90, 100]], { hold: true }), x: still(0) },
    ],
  },
);

// --- Miettes : tombent du croc et s'effacent ---------------------------------------------------
const crumb = (nm, size, from, to, start) =>
  group(nm, [ellipse(0, 0, size, size), fill(C.crumb)], transform({
    p: anim([[start, from], [start + 30, to]]),
    o: anim([[0, 0], [start, 0], [start + 2, 100], [start + 22, 100], [start + 30, 0]], { hold: false }),
    r: anim([[start, 0], [start + 30, 140]]),
  }));
const crumbs = layer(2, 'Miettes', {}, [
  crumb('Miette 1', 10, [142, 58], [158, 168], 26),
  crumb('Miette 2', 8, [150, 64], [176, 160], 27),
  crumb('Miette 3', 9, [136, 52], [128, 172], 28),
  crumb('Miette 4', 6, [146, 50], [168, 128], 29),
], { ks: { a: still([0, 0, 0]), p: still([0, 0, 0]), s: still([100, 100, 100]), r: still(0), o: still(100) } });

// --- Petites étincelles au moment du croc --------------------------------------------------------
const sparkle = (nm, x, y, start) =>
  group(nm, [
    { ty: 'sr', sy: 1, d: 1, pt: still(4), p: still([0, 0]), r: still(0), ir: still(2), is: still(0), or: still(7), os: still(0) },
    fill(C.sparkle),
  ], transform({
    p: still([x, y]),
    s: anim([[0, [0, 0]], [start, [0, 0]], [start + 6, [110, 110]], [start + 14, [0, 0]]]),
  }));
const sparkles = layer(1, 'Étincelles', { p: still([0, 0, 0]) }, [
  sparkle('Étincelle 1', 170, 40, 25),
  sparkle('Étincelle 2', 158, 22, 28),
  sparkle('Étincelle 3', 182, 70, 30),
]);

const animation = {
  v: '5.12.2',
  fr: FPS,
  ip: 0,
  op: END,
  w: 200,
  h: 200,
  nm: 'Cookie croqué',
  ddd: 0,
  assets: [],
  layers: [sparkles, crumbs, cookie], // le premier calque est dessiné au-dessus
  markers: [],
};

writeFileSync(OUT, JSON.stringify(animation));
console.log(`✓ ${OUT} (${(JSON.stringify(animation).length / 1024).toFixed(1)} Ko)`);
