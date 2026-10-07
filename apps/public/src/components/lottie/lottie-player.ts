// Lecteur Lottie partagé (version « light », rendu SVG), chargé à la demande : il ne pèse rien
// sur une page qui ne montre aucune animation. Respecte prefers-reduced-motion (image fixe) et ne
// joue que lorsque l'animation est à l'écran.

export interface LottieOptions {
  /** Image affichée quand les animations sont réduites, et à la fin si `plays` est fini. */
  stillFrame: number;
  /** Nombre de lectures avant de s'arrêter sur `stillFrame` ; Infinity = en boucle. */
  plays?: number;
}

/** Monte l'animation dans `container` ; renvoie une fonction d'arrêt. En cas d'échec, ne fait rien. */
export async function mountLottie(container: HTMLElement, url: string, { stillFrame, plays = Infinity }: LottieOptions): Promise<() => void> {
  try {
    const [{ default: lottie }, animationData] = await Promise.all([
      import('lottie-web/build/player/lottie_light'),
      fetch(url).then((r) => r.json()),
    ]);
    if (!container.isConnected) return () => undefined;
    const anim = lottie.loadAnimation({
      container,
      renderer: 'svg',
      loop: plays === Infinity,
      autoplay: false,
      animationData,
      rendererSettings: { preserveAspectRatio: 'xMidYMid meet', progressiveLoad: true },
    });

    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let visible = false;
    let remaining = plays;
    let done = false;

    const sync = () => {
      if (reduced.matches || done) anim.goToAndStop(stillFrame, true);
      else if (visible) anim.play();
      else anim.pause();
    };
    // lectures limitées : on rejoue jusqu'au compte, puis image fixe
    anim.addEventListener('complete', () => {
      remaining--;
      if (remaining > 0) anim.goToAndPlay(0, true);
      else {
        done = true;
        sync();
      }
    });
    const observer = new IntersectionObserver(([entry]) => {
      visible = !!entry?.isIntersecting;
      sync();
    });
    observer.observe(container);
    reduced.addEventListener('change', sync);
    container.classList.add('is-animated');
    sync();

    return () => {
      observer.disconnect();
      reduced.removeEventListener('change', sync);
      anim.destroy();
    };
  } catch {
    return () => undefined; // animation indisponible : le contenu de repli reste affiché
  }
}
