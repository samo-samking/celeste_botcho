// Active le décor de fête selon le réglage de l'admin (automatique, désactivé ou thème forcé) ;
// ?fete=noel|nouvel-an|independance|aucune dans l'adresse : aperçu pour cet onglet seulement.
// Le module du décor n'est chargé que si une fête est active.
import { effect } from '@preact/signals-core';
import { activeFestiveTheme, FESTIVE_PREVIEW_PARAM, FESTIVE_PREVIEW_VALUES, type FestiveTheme } from '@celeste/shared/domain/festive';
import { siteContact } from '../../stores/settings.store';

const PREVIEW_KEY = 'cb-festive-preview';

function previewTheme(): FestiveTheme | 'off' | null {
  const value = new URLSearchParams(location.search).get(FESTIVE_PREVIEW_PARAM);
  try {
    if (value !== null) {
      const theme = FESTIVE_PREVIEW_VALUES[value] ?? null;
      if (theme) sessionStorage.setItem(PREVIEW_KEY, theme);
      else sessionStorage.removeItem(PREVIEW_KEY); // ?fete=auto (ou autre) : fin de l'aperçu
      return theme;
    }
    return (sessionStorage.getItem(PREVIEW_KEY) as FestiveTheme | 'off' | null) ?? null;
  } catch {
    return value ? (FESTIVE_PREVIEW_VALUES[value] ?? null) : null;
  }
}

export function initFestive() {
  const preview = previewTheme();
  let current: FestiveTheme | null = null;
  effect(() => {
    const theme = activeFestiveTheme(siteContact.value.festive, new Date(), preview);
    if (theme === current) return;
    current = theme;
    void import('./festive').then((m) => (theme ? m.mountFestive(theme) : m.unmountFestive()));
  });
}
