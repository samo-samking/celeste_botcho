// Animation d'attente de la vitrine (pot de bonbons, Lottie 19 Ko), via le lecteur partagé.
import candyJarUrl from '@celeste/shared/lotties/candy-jar.json?url';
import { mountLottie } from '../../../components/lottie/lottie-player';

export function mountCandyJar(container: HTMLElement) {
  // image fixe (animations réduites) : pot rempli, bonbons posés
  return mountLottie(container, candyJarUrl, { stillFrame: 60 });
}
