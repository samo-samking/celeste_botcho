// Décor de fête de la boutique (Noël, Nouvel An, Indépendance) : ruban sous le menu, particules
// légères (flocons ou confettis) dessinées sur un canvas, petit message de vœux qu'on peut fermer.
// Ce module n'est chargé que si une fête est active. Rien n'intercepte les clics ; animations
// réduites : ni particules ni mouvement, seuls le ruban et les vœux restent.
import { html, nothing, render } from 'lit-html';
import { icon } from '@celeste/shared/icons/icon';
import { close } from '@celeste/shared/icons';
import { isNewYearSide, newYearOf, type FestiveTheme } from '@celeste/shared/domain/festive';

interface Particle {
  x: number;
  y: number;
  r: number; // taille
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  color: string;
  phase: number;
}

const PALETTES: Record<FestiveTheme, string[]> = {
  yearend: ['#ffffff', '#f5efe6', '#e8eef5'], // flocons ; quelques paillettes dorées s'y mêlent
  independence: ['#f77f00', '#ffffff', '#009e60'],
};
const GOLD = ['#f5b800', '#ffd95a', '#fff3c4'];

const GREETINGS: Record<FestiveTheme, (d: Date) => { emoji: string; title: string; text: string }> = {
  yearend: (d) =>
    isNewYearSide(d)
      ? { emoji: '🥂', title: `Bonne année ${newYearOf(d)} !`, text: 'Merci pour votre confiance. Plein de belles choses pour cette nouvelle année.' }
      : { emoji: '🎄', title: 'Joyeux Noël et bonnes fêtes !', text: 'Toute l’équipe Céleste Bôtchô vous souhaite de belles fêtes de fin d’année.' },
  // drapeau dessiné (l'emoji 🇨🇮 s'affiche « CI » sous Windows)
  independence: () => ({ emoji: '', title: 'Bonne fête de l’Indépendance !', text: 'Joyeux 7 août à toute la Côte d’Ivoire.' }),
};

let host: HTMLElement | null = null;
let greetEl: HTMLElement | null = null;
let timers: number[] = [];
let stopParticles: (() => void) | null = null;

/** Particules : flocons qui tombent (Noël) ou confettis qui virevoltent (Nouvel An, Indépendance). */
function startParticles(canvas: HTMLCanvasElement, theme: FestiveTheme): () => void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => undefined;
  const snow = theme === 'yearend';
  const colors = PALETTES[theme];
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let w = 0;
  let h = 0;
  let parts: Particle[] = [];
  let raf = 0;
  let last = performance.now();

  const spawn = (anywhere: boolean): Particle => ({
    x: Math.random() * w,
    y: anywhere ? Math.random() * h : -20,
    r: snow ? 1.2 + Math.random() * 2.6 : 3 + Math.random() * 4,
    vx: (Math.random() - 0.5) * (snow ? 12 : 30),
    vy: snow ? 18 + Math.random() * 30 : 40 + Math.random() * 50,
    rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 4,
    // fin d'année : un flocon sur six est une paillette dorée
    color: snow && Math.random() < 0.17 ? GOLD[Math.floor(Math.random() * GOLD.length)]! : colors[Math.floor(Math.random() * colors.length)]!,
    phase: Math.random() * Math.PI * 2,
  });

  const resize = () => {
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // densité selon l'écran, plafonnée : léger sur téléphone
    const count = Math.round(Math.min(snow ? 70 : 45, (w * h) / (snow ? 22000 : 32000)));
    parts = Array.from({ length: count }, () => spawn(true));
  };

  const frame = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    ctx.clearRect(0, 0, w, h);
    for (const p of parts) {
      p.phase += dt;
      p.x += (p.vx + Math.sin(p.phase * 1.3) * (snow ? 10 : 18)) * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      if (p.y > h + 20 || p.x < -30 || p.x > w + 30) Object.assign(p, spawn(false));
      ctx.globalAlpha = snow ? 0.75 : 0.9;
      ctx.fillStyle = p.color;
      if (snow) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // confetti : petit rectangle qui tourne (largeur variable = effet 3D)
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillRect(-p.r / 2, (-p.r / 4) * Math.abs(Math.cos(p.phase * 3)), p.r, (p.r / 2) * Math.abs(Math.cos(p.phase * 3)) + 1);
        ctx.restore();
      }
    }
    raf = requestAnimationFrame(frame);
  };

  const onVisibility = () => {
    cancelAnimationFrame(raf);
    if (!document.hidden) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  };

  resize();
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', onVisibility);
  raf = requestAnimationFrame(frame);
  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}

export function mountFestive(theme: FestiveTheme) {
  unmountFestive();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const greeting = GREETINGS[theme](new Date());
  const dismissKey = `cb-festive-${theme}-${newYearOf(new Date())}`;
  let showGreeting = true;
  try {
    showGreeting = !sessionStorage.getItem(dismissKey);
  } catch {
    /* sans conséquence */
  }

  document.documentElement.dataset.festive = theme; // accessoires en CSS (bonnets de Noël sur les boutons…)
  host = document.createElement('div');
  host.className = `festive festive--${theme}`;
  host.setAttribute('aria-hidden', 'true'); // décor : les vœux ont leur propre zone annoncée
  document.body.append(host);

  const greet = (greetEl = document.createElement('div'));
  greet.className = 'festive-greet';
  greet.setAttribute('role', 'status');

  const draw = () => {
    render(html`<div class="festive__ribbon"></div>${reduced ? nothing : html`<canvas class="festive__canvas"></canvas>`}`, host!);
    render(
      showGreeting
        ? html`<div class="festive-greet__card festive-greet__card--${theme}">
            <span class="festive-greet__emoji" aria-hidden="true">${greeting.emoji || html`<span class="festive-flag"></span>`}</span>
            <span class="festive-greet__text"><strong>${greeting.title}</strong>${greeting.text}</span>
            <button class="festive-greet__close" type="button" @click=${() => {
              showGreeting = false;
              try {
                sessionStorage.setItem(dismissKey, '1');
              } catch {
                /* sans conséquence */
              }
              draw();
            }}>${icon(close, { label: 'Fermer les vœux' })}</button>
          </div>`
        : nothing,
      greet,
    );
  };
  draw();
  document.body.append(greet);
  // les vœux apparaissent après l'arrivée sur la page, puis s'effacent seuls
  timers = [window.setTimeout(() => greet.classList.add('is-visible'), 2200), window.setTimeout(() => greet.classList.remove('is-visible'), 14000)];

  const canvas = host.querySelector<HTMLCanvasElement>('.festive__canvas');
  if (canvas) stopParticles = startParticles(canvas, theme);
}

export function unmountFestive() {
  stopParticles?.();
  stopParticles = null;
  timers.forEach((t) => window.clearTimeout(t));
  timers = [];
  greetEl?.remove();
  greetEl = null;
  host?.remove();
  host = null;
  delete document.documentElement.dataset.festive;
}
