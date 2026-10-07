// Envoi de photos vers Cloudinary : glisser-déposer ou choix de fichiers, contrôle du format et du poids,
// réduction dans le navigateur, barre de progression, aperçu immédiat, ordre (← →), suppression, texte
// alternatif. L'état est un signal : la vue qui l'affiche se redessine d'elle-même.
import { html, nothing } from 'lit-html';
import { live } from 'lit-html/directives/live.js';
import { signal } from '@preact/signals-core';
import { icon } from '@celeste/shared/icons/icon';
import { alertCircle, chevronLeft, chevronRight, image, trash, upload } from '@celeste/shared/icons';
import { ACCEPTED_TYPES, MAX_FILE_MB, cld, compressImage, uploadImage } from '@celeste/shared/services/images';

export interface UploadedPhoto {
  url: string;
  width: number;
  height: number;
  alt: string;
}

interface Item extends Partial<UploadedPhoto> {
  key: string;
  preview?: string; // aperçu local pendant l'envoi
  progress?: number; // 0 → 1 ; absent = terminé
  error?: string;
}

let seq = 0;
const newKey = () => `img-${++seq}`;

export class ImageUploader {
  readonly items = signal<Item[]>([]);
  private dragKey: string | null = null;

  constructor(
    private readonly opts: {
      id: string;
      folder: string;
      max: number;
      /** Champ « texte alternatif » sous chaque photo. */
      withAlt?: boolean;
      initial?: UploadedPhoto[];
    },
  ) {
    this.items.value = (opts.initial ?? []).map((p) => ({ ...p, key: newKey() }));
  }

  /** Photos envoyées, dans l'ordre. */
  get photos(): UploadedPhoto[] {
    return this.items.value
      .filter((i) => i.url && i.progress === undefined && !i.error)
      .map((i) => ({ url: i.url!, width: i.width ?? 0, height: i.height ?? 0, alt: i.alt ?? '' }));
  }

  get busy(): boolean {
    return this.items.value.some((i) => i.progress !== undefined);
  }

  private patch(key: string, change: Partial<Item>) {
    this.items.value = this.items.value.map((i) => (i.key === key ? { ...i, ...change } : i));
  }

  addFiles(files: FileList | File[]) {
    const room = this.opts.max - this.items.value.filter((i) => !i.error).length;
    const list = [...files].slice(0, Math.max(0, room));
    const single = this.opts.max === 1;
    if (single && list.length) {
      // une seule image : la nouvelle remplace l'ancienne
      this.items.value.forEach((i) => i.preview && URL.revokeObjectURL(i.preview));
      this.items.value = [];
    }
    for (const file of single ? [...files].slice(0, 1) : list) {
      const key = newKey();
      const error = !ACCEPTED_TYPES.includes(file.type)
        ? 'Format non accepté (JPG, PNG ou WebP).'
        : file.size > MAX_FILE_MB * 1024 * 1024
          ? `Fichier trop lourd (${MAX_FILE_MB} Mo maximum).`
          : undefined;
      const preview = error ? undefined : URL.createObjectURL(file);
      this.items.value = [...this.items.value, { key, preview, progress: error ? undefined : 0, error, alt: '' }];
      if (!error) void this.send(key, file);
    }
  }

  private async send(key: string, file: File) {
    try {
      const blob = await compressImage(file);
      const res = await uploadImage(blob, { folder: this.opts.folder, onProgress: (r) => this.patch(key, { progress: Math.min(r, 0.99) }) });
      this.patch(key, { url: res.url, width: res.width, height: res.height, progress: undefined });
    } catch (e) {
      this.patch(key, { progress: undefined, error: e instanceof Error ? e.message : "L'envoi a échoué." });
    }
  }

  remove(key: string) {
    const item = this.items.value.find((i) => i.key === key);
    if (item?.preview) URL.revokeObjectURL(item.preview);
    this.items.value = this.items.value.filter((i) => i.key !== key);
  }

  move(key: string, delta: number) {
    const list = [...this.items.value];
    const from = list.findIndex((i) => i.key === key);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= list.length) return;
    list.splice(to, 0, list.splice(from, 1)[0]!);
    this.items.value = list;
  }

  dispose() {
    this.items.value.forEach((i) => i.preview && URL.revokeObjectURL(i.preview));
  }

  template() {
    const items = this.items.value;
    const full = items.filter((i) => !i.error).length >= this.opts.max;
    const single = this.opts.max === 1;
    const inputId = `${this.opts.id}-input`;

    const dropzone = html`
      <label class="uploader__drop" for=${inputId}
        @dragover=${(e: DragEvent) => {
          if (this.dragKey) return; // réordonnancement interne
          e.preventDefault();
          (e.currentTarget as HTMLElement).classList.add('is-over');
        }}
        @dragleave=${(e: DragEvent) => (e.currentTarget as HTMLElement).classList.remove('is-over')}
        @drop=${(e: DragEvent) => {
          if (this.dragKey) return;
          e.preventDefault();
          (e.currentTarget as HTMLElement).classList.remove('is-over');
          if (e.dataTransfer?.files.length) this.addFiles(e.dataTransfer.files);
        }}>
        <span class="uploader__drop-icon">${icon(upload)}</span>
        <span class="uploader__drop-title">${single ? (items.length ? "Remplacer l'image" : 'Ajouter une image') : 'Ajouter des photos'}</span>
        <span class="uploader__drop-hint">Glissez-déposez ou cliquez · JPG, PNG, WebP · ${MAX_FILE_MB} Mo max${single ? '' : ` · ${this.opts.max} photos max`}</span>
        <input class="visually-hidden" id=${inputId} type="file" accept=${ACCEPTED_TYPES.join(',')} ?multiple=${!single}
          @change=${(e: Event) => {
            const input = e.target as HTMLInputElement;
            if (input.files?.length) this.addFiles(input.files);
            input.value = '';
          }} />
      </label>
    `;

    return html`
      <div class="uploader ${single ? 'uploader--single' : ''}">
        ${items.length
          ? html`<ol class="uploader__grid">
              ${items.map(
                (item, index) => html`
                  <li class="uploader__item ${item.error ? 'has-error' : ''}" draggable=${!single && !item.error ? 'true' : 'false'}
                    @dragstart=${(e: DragEvent) => {
                      this.dragKey = item.key;
                      e.dataTransfer?.setData('text/plain', item.key);
                    }}
                    @dragend=${() => (this.dragKey = null)}
                    @dragover=${(e: DragEvent) => this.dragKey && e.preventDefault()}
                    @drop=${(e: DragEvent) => {
                      e.preventDefault();
                      if (!this.dragKey || this.dragKey === item.key) return;
                      const list = [...this.items.value];
                      const from = list.findIndex((i) => i.key === this.dragKey);
                      list.splice(index, 0, list.splice(from, 1)[0]!);
                      this.items.value = list;
                      this.dragKey = null;
                    }}>
                    <div class="uploader__thumb">
                      ${item.error
                        ? html`<span class="uploader__error">${icon(alertCircle)}<span>${item.error}</span></span>`
                        : item.preview || item.url
                          ? html`<img src=${item.preview ?? cld(item.url!, 'c_fill,ar_1:1,w_320')} alt="" />`
                          : html`<span class="uploader__placeholder">${icon(image)}</span>`}
                      ${item.progress !== undefined
                        ? html`<span class="uploader__progress" role="progressbar" aria-label="Envoi de la photo"
                            aria-valuemin="0" aria-valuemax="100" aria-valuenow=${Math.round(item.progress * 100)}>
                            <span style="transform: scaleX(${item.progress})"></span>
                          </span>`
                        : nothing}
                      ${!single && index === 0 && !item.error ? html`<span class="uploader__badge">Principale</span>` : nothing}
                      <div class="uploader__tools">
                        ${!single && !item.error
                          ? html`
                              <button type="button" class="uploader__tool" ?disabled=${index === 0} @click=${() => this.move(item.key, -1)}>
                                ${icon(chevronLeft, { label: 'Déplacer vers la gauche' })}
                              </button>
                              <button type="button" class="uploader__tool" ?disabled=${index === items.length - 1} @click=${() => this.move(item.key, 1)}>
                                ${icon(chevronRight, { label: 'Déplacer vers la droite' })}
                              </button>
                            `
                          : nothing}
                        <button type="button" class="uploader__tool uploader__tool--danger" @click=${() => this.remove(item.key)}>
                          ${icon(trash, { label: 'Retirer la photo' })}
                        </button>
                      </div>
                    </div>
                    ${this.opts.withAlt && !item.error
                      ? html`<input class="uploader__alt" type="text" placeholder="Description de la photo" aria-label="Description de la photo ${index + 1} (pour les lecteurs d'écran)"
                          .value=${live(item.alt ?? '')} @input=${(e: InputEvent) => this.patch(item.key, { alt: (e.target as HTMLInputElement).value })} />`
                      : nothing}
                  </li>
                `,
              )}
            </ol>`
          : nothing}
        ${full && !single ? html`<p class="uploader__full">Nombre maximum de photos atteint.</p>` : dropzone}
      </div>
    `;
  }
}
