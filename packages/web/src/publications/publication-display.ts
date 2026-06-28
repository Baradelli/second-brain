import type {
  PublicationFormatInput,
  PublicationResponse,
  PublicationSourceTypeInput,
  PublicationStageInput,
} from '@cerebro/shared';

/**
 * Lógica pura de exibição/derivação de publicações (pipeline idea→draft→
 * published). Sem React aqui — só funções puras testáveis com Vitest,
 * espelhando a semântica do mobile (PublicationsPage). O FUNIL só avança e
 * publicado é o fim da linha; aqui só DERIVAMOS rótulos/transições, sem efeitos
 * colaterais (a tela faz as chamadas de endpoint).
 */

/** As etapas do funil, em ordem. */
export const PUBLICATION_STAGES: PublicationStageInput[] = [
  'idea',
  'draft',
  'published',
];

/** Os formatos oferecidos (mesma ordem do mobile). */
export const PUBLICATION_FORMATS: PublicationFormatInput[] = [
  'linkedin',
  'substack',
  'blog',
  'lesson',
  'video',
];

/** Título visível de uma publicação: o título, ou um fallback se vazio. */
export function publicationLabel(
  publication: Pick<PublicationResponse, 'title'>,
  fallback: string,
): string {
  return publication.title.trim() || fallback;
}

/**
 * Próxima etapa do funil (idea→draft→published). Publicado é o fim da linha →
 * `null`. Espelha o `NEXT_STAGE` do mobile, mas como função pura testável: o
 * funil NUNCA retrocede.
 */
export function nextStage(
  stage: PublicationStageInput,
): PublicationStageInput | null {
  switch (stage) {
    case 'idea':
      return 'draft';
    case 'draft':
      return 'published';
    case 'published':
      return null;
  }
}

/** Chave i18n (em `publish.stage.*`) do rótulo de uma etapa. */
export function stageLabelKey(stage: PublicationStageInput): string {
  return `publish.stage.${stage}`;
}

/** Chave i18n (em `publish.format.*`) do rótulo de um formato. */
export function formatLabelKey(format: PublicationFormatInput): string {
  return `publish.format.${format}`;
}

/** Chave i18n (em `publish.source.*`) do rótulo de uma fonte. */
export function sourceLabelKey(source: PublicationSourceTypeInput): string {
  return `publish.source.${source}`;
}

/**
 * Chave i18n da AÇÃO que avança o funil a partir desta etapa. `idea`→"para
 * rascunho", `draft`→"marcar como publicado". Etapa final → `null` (sem ação).
 * Espelha a decisão de rótulo do mobile, mas como forma pura.
 */
export function advanceActionKey(stage: PublicationStageInput): string | null {
  const next = nextStage(stage);
  if (!next) return null;
  return next === 'draft'
    ? 'publish.action.toDraft'
    : 'publish.action.toPublished';
}
