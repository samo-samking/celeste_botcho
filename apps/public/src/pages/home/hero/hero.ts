// Hero : séquence d'images pilotée par le défilement.
// p = défilement parcouru dans .hero / (hauteur de .hero - hauteur du cadre), borné à [0, 1].
// À chaque défilement (dans requestAnimationFrame), on dessine l'image Math.round(p × (n - 1)).
// Aucune lecture automatique : remonter rejoue la séquence à l'envers.
import { COLORS, HERO, MOBILE_QUERY, REDUCED_MOTION_QUERY, type FrameSequence } from '../config';

export interface HeroController {
  /** Fait défiler la page jusqu'à la progression p (utile au clavier). */
  scrollToProgress(p: number): void;
  destroy(): void;
}

/** onProgress(null) : animation désactivée (prefers-reduced-motion), retirer les styles en ligne. */
export type ProgressListener = (p: number | null) => void;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Ordre de chargement : la 1re image, puis de grossier à fin (1 sur 32, 1 sur 16…)
 *  pour qu'un défilement rapide trouve vite des images proches. */
function loadOrder(count: number): number[] {
  const order = [0];
  const seen = new Set(order);
  for (let step = 32; step >= 1; step /= 2) {
    for (let i = 0; i < count; i += step) {
      if (!seen.has(i)) {
        seen.add(i);
        order.push(i);
      }
    }
  }
  return order;
}

export function initHero(root: HTMLElement, onProgress: ProgressListener): HeroController {
  const sticky = root.querySelector<HTMLElement>('.hero__sticky')!;
  const canvas = root.querySelector<HTMLCanvasElement>('.hero__canvas')!;
  const still = root.querySelector<HTMLImageElement>('.hero__still')!;
  const ctx = canvas.getContext('2d', { alpha: false })!;
  const mobileMq = matchMedia(MOBILE_QUERY);
  const reducedMq = matchMedia(REDUCED_MOTION_QUERY);

  let seq: FrameSequence = HERO.sequences.desktop;
  let frames: (HTMLImageElement | undefined)[] = [];
  let generation = 0; // invalide les chargements d'une séquence abandonnée
  let shown: HTMLImageElement | undefined; // dernière image dessinée
  let target = 0;
  let p = 0;
  let range = 1;
  let ticking = false;
  let active = false;
  const view = { w: 0, h: 0, dpr: 1, x: 0, y: 0, dw: 0, dh: 0 };

  const frameUrl = (i: number) => `${seq.path}frame_${String(i + 1).padStart(4, '0')}.webp`;

  function loadFrame(i: number, gen: number, priority: 'high' | 'low'): Promise<void> {
    const img = new Image();
    img.decoding = 'async';
    img.fetchPriority = priority;
    img.src = frameUrl(i);
    return img
      .decode()
      .then(() => {
        if (gen !== generation) return;
        frames[i] = img;
        if (i === target) draw();
      })
      .catch(() => undefined); // image manquante : on garde la précédente
  }

  async function loadSequence() {
    const gen = ++generation;
    seq = mobileMq.matches ? HERO.sequences.mobile : HERO.sequences.desktop;
    frames = new Array(seq.count);
    shown = undefined;
    root.classList.toggle('hero--no-cube', !seq.hasCube);
    resize();

    const [first, ...rest] = loadOrder(seq.count);
    await loadFrame(first!, gen, 'high');
    // le reste en arrière-plan, 4 téléchargements à la fois
    const queue = rest;
    const worker = async () => {
      while (queue.length && gen === generation) await loadFrame(queue.shift()!, gen, 'low');
    };
    await Promise.all([worker(), worker(), worker(), worker()]);
  }

  function resize() {
    view.dpr = Math.min(window.devicePixelRatio || 1, 2);
    view.w = sticky.clientWidth;
    view.h = sticky.clientHeight;
    canvas.width = Math.round(view.w * view.dpr);
    canvas.height = Math.round(view.h * view.dpr);

    // mode « cover » centré, sans déformation
    const scale = Math.max(view.w / seq.width, view.h / seq.height);
    view.dw = seq.width * scale;
    view.dh = seq.height * scale;
    view.x = (view.w - view.dw) / 2;
    view.y = (view.h - view.dh) / 2;
    // position de l'image dessinée, pour caler le masque du cube (hero.css)
    sticky.style.setProperty('--img-x', `${view.x}px`);
    sticky.style.setProperty('--img-w', `${view.dw}px`);

    range = Math.max(1, root.offsetHeight - sticky.offsetHeight);
    paint(shown);
  }

  function paint(img: HTMLImageElement | undefined) {
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, view.w, view.h);
    if (!img) return;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, view.x, view.y, view.dw, view.dh);
  }

  function draw() {
    const img = frames[target];
    if (!img || img === shown) return; // pas encore prête : on garde la dernière affichée
    shown = img;
    paint(img);
  }

  function update() {
    ticking = false;
    if (!active) return;
    p = clamp01(-root.getBoundingClientRect().top / range);
    target = Math.round(p * (seq.count - 1));
    draw();
    onProgress(p);
  }

  function requestUpdate() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }

  function start() {
    active = true;
    still.removeAttribute('src');
    void loadSequence();
    requestUpdate();
  }

  function showStill() {
    const mobile = mobileMq.matches;
    still.src = mobile ? HERO.stillFrame.mobile : HERO.stillFrame.desktop;
    still.width = mobile ? HERO.sequences.mobile.width : HERO.sequences.desktop.width;
    still.height = mobile ? HERO.sequences.mobile.height : HERO.sequences.desktop.height;
    root.classList.toggle('hero--no-cube', mobile);
  }

  function stop() {
    active = false;
    generation++;
    frames = [];
    shown = undefined;
    showStill();
    onProgress(null);
  }

  const onResize = () => {
    if (!active) return;
    resize();
    requestUpdate();
  };
  const onMobileChange = () => (active ? void loadSequence().then(requestUpdate) : showStill());
  const onReducedChange = () => (reducedMq.matches ? stop() : start());

  const resizeObserver = new ResizeObserver(onResize);
  resizeObserver.observe(sticky);
  window.addEventListener('scroll', requestUpdate, { passive: true });
  mobileMq.addEventListener('change', onMobileChange);
  reducedMq.addEventListener('change', onReducedChange);

  if (reducedMq.matches) stop();
  else start();

  return {
    scrollToProgress(value: number) {
      const top = root.getBoundingClientRect().top + window.scrollY + clamp01(value) * range;
      window.scrollTo({ top, behavior: 'instant' });
    },
    destroy() {
      generation++;
      resizeObserver.disconnect();
      window.removeEventListener('scroll', requestUpdate);
      mobileMq.removeEventListener('change', onMobileChange);
      reducedMq.removeEventListener('change', onReducedChange);
    },
  };
}
