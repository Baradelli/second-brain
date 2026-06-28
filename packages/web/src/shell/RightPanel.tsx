import type {
  BacklinkResponse,
  GoalResponse,
  NoteResponse,
  NoteType,
  PublicationResponse,
  RecallConfidenceInput,
  ResourceResponse,
  StudyItemResponse,
} from '@cerebro/shared';
import {
  flattenLabels,
  getBacklinks,
  getResource,
  listActiveGoals,
  listLabels,
} from '@cerebro/shared/client';
import { EmptyState } from '@cerebro/ui';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useActiveGoals } from '../goals/active-goal-context.js';
import {
  cadenceDescriptor,
  goalLabel,
  goalProgressPercent,
} from '../goals/goal-display.js';
import { useActiveNotes } from '../notes/active-note-context.js';
import { backlinkDisplayTitle } from '../notes/backlink-display.js';
import { extractOutline, type OutlineHeading } from '../notes/outline.js';
import { useActivePublications } from '../publications/active-publication-context.js';
import {
  formatLabelKey,
  sourceLabelKey,
  stageLabelKey,
} from '../publications/publication-display.js';
import { useActiveResources } from '../resources/active-resource-context.js';
import { resourceLabel } from '../resources/resource-display.js';
import { useActiveStudy } from '../study/active-study-context.js';
import {
  confidenceSummary,
  durabilityKey,
  recallsDone,
} from '../study/study-display.js';
import { useTabs } from '../tabs/tabs-context.js';
import { CollapsibleSection } from './CollapsibleSection.js';

const LABEL_BY_TYPE: Record<NoteType, string> = {
  DEVOTIONAL: 'editor.type.devotional',
  REFLECTION: 'editor.type.reflection',
  STUDY_NOTE: 'editor.type.study',
  NOTE: 'editor.type.note',
};

/**
 * Painel direito, contextual à aba ativa. Para uma nota mostra Propriedades
 * (tipo/escopo/labels/vínculos), Outline (títulos extraídos do doc, clicáveis)
 * e Backlinks (notas que mencionam esta, clicáveis). Lê a nota ativa do
 * ActiveNotesContext pela id do descriptor da aba ativa.
 */
export function RightPanel() {
  const { t } = useTranslation();
  const { activeTab } = useTabs();

  if (activeTab?.descriptor.kind === 'note') {
    return <NotePanel noteId={activeTab.descriptor.id} />;
  }
  if (activeTab?.descriptor.kind === 'resource') {
    return <ResourcePanel resourceId={activeTab.descriptor.id} />;
  }
  if (activeTab?.descriptor.kind === 'goal') {
    return <GoalPanel goalId={activeTab.descriptor.id} />;
  }
  if (activeTab?.descriptor.kind === 'studyItem') {
    return <StudyPanel studyItemId={activeTab.descriptor.id} />;
  }
  if (activeTab?.descriptor.kind === 'publication') {
    return <PublicationPanel publicationId={activeTab.descriptor.id} />;
  }

  return (
    <aside className="flex h-full items-center justify-center bg-bg text-fg">
      <EmptyState title={t('shell.rightPanelEmpty')} />
    </aside>
  );
}

/** Painel direito de uma nota: propriedades, outline e backlinks. */
function NotePanel({ noteId }: { noteId: string }) {
  const { t } = useTranslation();
  const { get, scrollToHeading } = useActiveNotes();
  const active = get(noteId);

  return (
    <aside className="flex h-full flex-col gap-1 overflow-y-auto bg-bg p-2 text-fg">
      <CollapsibleSection
        storageKey="web.shell.right.properties"
        label={t('shell.properties')}
      >
        {active?.note ? (
          <Properties note={active.note} />
        ) : (
          <p className="px-2 py-2 text-xs text-muted">{t('agenda.loading')}</p>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        storageKey="web.shell.right.outline"
        label={t('shell.outline')}
      >
        <Outline
          doc={active?.doc}
          onSelect={(h) => scrollToHeading(noteId, h.index)}
        />
      </CollapsibleSection>

      <CollapsibleSection
        storageKey="web.shell.right.backlinks"
        label={t('shell.backlinks')}
      >
        <Backlinks noteId={noteId} />
      </CollapsibleSection>
    </aside>
  );
}

// ── Backlinks ─────────────────────────────────────────────────────────────────

/**
 * Backlinks da nota ativa: as notas que mencionam esta (via menção `@` no doc),
 * vindas do grafo materializado no backend (`getBacklinks`). Read-only — cada
 * linha abre a aba da nota de origem (que se auto-titula pelo rename). Recarrega
 * ao trocar de nota; os links de ENTRADA só mudam quando OUTRA nota edita a
 * menção, então buscar ao abrir basta (sem refetch a cada salvar). Estados
 * calmos: vazio é normal, não assustador.
 */
function Backlinks({ noteId }: { noteId: string }) {
  const { t } = useTranslation();
  const { openTab } = useTabs();
  const [state, setState] = useState<
    | { kind: 'loading' }
    | { kind: 'error' }
    | { kind: 'ready'; backlinks: BacklinkResponse[] }
  >({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ kind: 'loading' });
    getBacklinks(noteId)
      .then((backlinks) => {
        if (!cancelled) setState({ kind: 'ready', backlinks });
      })
      .catch(() => {
        if (!cancelled) setState({ kind: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, [noteId]);

  if (state.kind === 'loading') {
    return (
      <p className="px-2 py-2 text-xs text-muted">{t('agenda.loading')}</p>
    );
  }
  if (state.kind === 'error') {
    return (
      <p className="px-2 py-2 text-xs text-muted">{t('shell.backlinksError')}</p>
    );
  }
  if (state.backlinks.length === 0) {
    return (
      <p className="px-2 py-2 text-xs text-muted">
        {t('shell.backlinksEmpty')}
      </p>
    );
  }

  return (
    <ul className="flex flex-col px-1 py-1">
      {state.backlinks.map((backlink) => {
        const title = backlinkDisplayTitle(backlink, t('notes.untitled'));
        return (
          <li key={backlink.id}>
            <button
              type="button"
              onClick={() =>
                openTab({ kind: 'note', id: backlink.id, title })
              }
              className="block w-full truncate rounded px-2 py-1 text-left text-xs text-muted transition-colors hover:bg-card hover:text-fg"
            >
              {title}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

// ── Propriedades ──────────────────────────────────────────────────────────────

function Properties({ note }: { note: NoteResponse }) {
  const { t } = useTranslation();
  const [labelNames, setLabelNames] = useState<string[]>([]);

  useEffect(() => {
    const ids = note.labelIds ?? [];
    if (ids.length === 0) {
      setLabelNames([]);
      return;
    }
    let cancelled = false;
    listLabels()
      .then((tree) => {
        if (cancelled) return;
        const flat = flattenLabels(tree);
        const byId = new Map(flat.map((l) => [l.id, l.name]));
        setLabelNames(ids.map((id) => byId.get(id) ?? id));
      })
      .catch(() => {
        if (!cancelled) setLabelNames(ids);
      });
    return () => {
      cancelled = true;
    };
  }, [note.labelIds]);

  return (
    <dl className="flex flex-col gap-2 px-2 py-1">
      <Row label={t('shell.prop.type')}>{t(LABEL_BY_TYPE[note.type])}</Row>
      <Row label={t('shell.prop.scope')}>
        {t(`shell.prop.scope.${note.scope}`)}
      </Row>
      {note.resourceId && (
        <Row label={t('shell.prop.resource')}>
          <ResourceLink resourceId={note.resourceId} />
        </Row>
      )}
      {note.goalId && (
        <Row label={t('shell.prop.goal')}>
          <GoalLink goalId={note.goalId} />
        </Row>
      )}
      <Row label={t('shell.labels')}>
        {labelNames.length > 0 ? labelNames.join(', ') : '—'}
      </Row>
    </dl>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-faint">
        {label}
      </dt>
      <dd className="truncate text-xs text-fg">{children}</dd>
    </div>
  );
}

/**
 * Vínculo "Recurso" no painel de uma nota: resolve o `resourceId` para o título
 * do recurso (via `getResource`, reusando o cache do `ActiveResourcesContext`
 * quando o recurso já está aberto) e abre a aba do recurso ao clicar. Resolve a
 * lacuna deixada na Fase 1.1, onde só mostrávamos o id cru.
 */
function ResourceLink({ resourceId }: { resourceId: string }) {
  const { t } = useTranslation();
  const { openTab } = useTabs();
  const { get } = useActiveResources();
  const cached = get(resourceId)?.resource;
  const [title, setTitle] = useState<string | null>(
    cached ? resourceLabel(cached, t('library.untitled')) : null,
  );

  useEffect(() => {
    if (cached) {
      setTitle(resourceLabel(cached, t('library.untitled')));
      return;
    }
    let cancelled = false;
    getResource(resourceId)
      .then((r) => {
        if (!cancelled) setTitle(resourceLabel(r, t('library.untitled')));
      })
      .catch(() => {
        // Em falha, deixamos cair no fallback (o id) abaixo.
        if (!cancelled) setTitle(null);
      });
    return () => {
      cancelled = true;
    };
  }, [resourceId, cached, t]);

  return (
    <button
      type="button"
      onClick={() =>
        openTab({
          kind: 'resource',
          id: resourceId,
          title: title ?? t('library.untitled'),
        })
      }
      className="max-w-full truncate text-left text-xs text-accent transition-colors hover:underline"
    >
      {title ?? resourceId}
    </button>
  );
}

/**
 * Vínculo "Objetivo" no painel de uma nota: resolve o `goalId` para o título do
 * objetivo (procurando na lista de objetivos ativos, reusando o cache do
 * `ActiveGoalsContext` quando o objetivo já está aberto) e abre a aba do objetivo
 * ao clicar. Espelha o `ResourceLink`, resolvendo a lacuna onde a nota só mostrava
 * o id cru do objetivo.
 */
function GoalLink({ goalId }: { goalId: string }) {
  const { t } = useTranslation();
  const { openTab } = useTabs();
  const { get } = useActiveGoals();
  const cached = get(goalId)?.goal;
  const [title, setTitle] = useState<string | null>(
    cached ? goalLabel(cached, t('goals.create.title')) : null,
  );

  useEffect(() => {
    if (cached) {
      setTitle(goalLabel(cached, t('goals.create.title')));
      return;
    }
    let cancelled = false;
    listActiveGoals()
      .then((goals) => {
        if (cancelled) return;
        const found = goals.find((g) => g.id === goalId);
        setTitle(found ? goalLabel(found, t('goals.create.title')) : null);
      })
      .catch(() => {
        if (!cancelled) setTitle(null);
      });
    return () => {
      cancelled = true;
    };
  }, [goalId, cached, t]);

  return (
    <button
      type="button"
      onClick={() =>
        openTab({
          kind: 'goal',
          id: goalId,
          title: title ?? t('goals.create.title'),
        })
      }
      className="max-w-full truncate text-left text-xs text-accent transition-colors hover:underline"
    >
      {title ?? goalId}
    </button>
  );
}

// ── Painel de Objetivo ────────────────────────────────────────────────────────

/** Painel direito de um objetivo: progresso (calculado) + cadência. */
function GoalPanel({ goalId }: { goalId: string }) {
  const { t } = useTranslation();
  const { get } = useActiveGoals();
  const active = get(goalId);

  return (
    <aside className="flex h-full flex-col gap-1 overflow-y-auto bg-bg p-2 text-fg">
      <CollapsibleSection
        storageKey="web.shell.right.goalProperties"
        label={t('shell.properties')}
      >
        {active ? (
          <GoalProperties
            goal={active.goal}
            percent={goalProgressPercent(active.progress)}
          />
        ) : (
          <p className="px-2 py-2 text-xs text-muted">{t('agenda.loading')}</p>
        )}
      </CollapsibleSection>
    </aside>
  );
}

function GoalProperties({
  goal,
  percent,
}: {
  goal: GoalResponse;
  percent: number;
}) {
  const { t, i18n } = useTranslation();
  const [labelNames, setLabelNames] = useState<string[]>([]);

  useEffect(() => {
    const ids = goal.labelIds;
    if (ids.length === 0) {
      setLabelNames([]);
      return;
    }
    let cancelled = false;
    listLabels()
      .then((tree) => {
        if (cancelled) return;
        const byId = new Map(flattenLabels(tree).map((l) => [l.id, l.name]));
        setLabelNames(ids.map((id) => byId.get(id) ?? id));
      })
      .catch(() => {
        if (!cancelled) setLabelNames(ids);
      });
    return () => {
      cancelled = true;
    };
  }, [goal.labelIds]);

  return (
    <dl className="flex flex-col gap-2 px-2 py-1">
      <Row label={t('shell.prop.type')}>{t(`goal.type.${goal.type}`)}</Row>
      <Row label={t('shell.prop.progress')}>
        {t('goals.progress.label', { percent })}
      </Row>
      <Row label={t('shell.prop.cadence')}>
        {cadenceSummary(goal, t, i18n.language)}
      </Row>
      <Row label={t('shell.labels')}>
        {labelNames.length > 0 ? labelNames.join(', ') : '—'}
      </Row>
    </dl>
  );
}

/** Resumo textual da cadência para o painel (lê a forma pura `cadenceDescriptor`). */
function cadenceSummary(
  goal: GoalResponse,
  t: (key: string) => string,
  lang: string,
): string {
  const desc = cadenceDescriptor(goal);
  if (desc.kind === 'weekdays') {
    if (desc.weekdays.length === 0) return t('goal.cadence.weekdays');
    return desc.weekdays
      .map((idx) =>
        new Date(2026, 5, 7 + idx).toLocaleDateString(lang, {
          weekday: 'short',
        }),
      )
      .join(', ');
  }
  if (desc.kind === 'period') {
    return `${desc.times ?? '?'}× / ${t(`goal.period.${desc.period}`)}`;
  }
  if (desc.kind === 'target') {
    if (desc.targetValue == null) return '—';
    return `${desc.targetValue}${desc.unit ? ` ${desc.unit}` : ''}`;
  }
  return '—';
}

// ── Painel de Estudo (Leitura Retentiva) ─────────────────────────────────────

/**
 * Painel direito de um item de estudo: durabilidade, próxima revisão (do
 * `schedule` CALCULADO pelo backend — nunca recomputado), progresso na escada,
 * recurso vinculado e o resumo de confiança A/B/C registrado nesta sessão (a
 * API não expõe o log de recalls). Consistente com note/resource/goal.
 */
function StudyPanel({ studyItemId }: { studyItemId: string }) {
  const { t } = useTranslation();
  const { get } = useActiveStudy();
  const active = get(studyItemId);

  return (
    <aside className="flex h-full flex-col gap-1 overflow-y-auto bg-bg p-2 text-fg">
      <CollapsibleSection
        storageKey="web.shell.right.studyProperties"
        label={t('shell.properties')}
      >
        {active ? (
          <StudyProperties
            item={active.item}
            confidences={active.confidences}
          />
        ) : (
          <p className="px-2 py-2 text-xs text-muted">{t('agenda.loading')}</p>
        )}
      </CollapsibleSection>
    </aside>
  );
}

function StudyProperties({
  item,
  confidences,
}: {
  item: StudyItemResponse;
  confidences: RecallConfidenceInput[];
}) {
  const { t, i18n } = useTranslation();
  const summary = confidenceSummary(confidences);
  const nextReview =
    item.schedule.consolidated || !item.schedule.nextRecallAt
      ? '—'
      : new Date(item.schedule.nextRecallAt).toLocaleDateString(i18n.language, {
          day: 'numeric',
          month: 'short',
        });

  return (
    <dl className="flex flex-col gap-2 px-2 py-1">
      <Row label={t('shell.prop.durability')}>
        {t(`study.durability.${durabilityKey(item)}`)}
      </Row>
      <Row label={t('shell.prop.nextReview')}>{nextReview}</Row>
      <Row label={t('shell.prop.recallProgress')}>
        {t('study.detail.recallProgress', {
          done: recallsDone(item.schedule),
          total: 3,
        })}
      </Row>
      {item.resourceId && (
        <Row label={t('shell.prop.resource')}>
          <ResourceLink resourceId={item.resourceId} />
        </Row>
      )}
      <Row label={t('shell.prop.confidence')}>
        {summary
          ? `A ${summary.A} · B ${summary.B} · C ${summary.C}`
          : t('study.detail.noConfidenceYet')}
      </Row>
    </dl>
  );
}

// ── Painel de Publicação ──────────────────────────────────────────────────────

/**
 * Painel direito de uma publicação: etapa do funil, formato, fonte e o rascunho
 * vinculado (uma Note — abre a aba dela ao clicar, reusando o editor de notas).
 * Consistente com note/resource/goal/study.
 */
function PublicationPanel({ publicationId }: { publicationId: string }) {
  const { t } = useTranslation();
  const { get } = useActivePublications();
  const active = get(publicationId);

  return (
    <aside className="flex h-full flex-col gap-1 overflow-y-auto bg-bg p-2 text-fg">
      <CollapsibleSection
        storageKey="web.shell.right.publicationProperties"
        label={t('shell.properties')}
      >
        {active ? (
          <PublicationProperties publication={active.publication} />
        ) : (
          <p className="px-2 py-2 text-xs text-muted">{t('agenda.loading')}</p>
        )}
      </CollapsibleSection>
    </aside>
  );
}

function PublicationProperties({
  publication,
}: {
  publication: PublicationResponse;
}) {
  const { t } = useTranslation();
  const { openTab } = useTabs();

  return (
    <dl className="flex flex-col gap-2 px-2 py-1">
      <Row label={t('shell.prop.stage')}>
        {t(stageLabelKey(publication.stage))}
      </Row>
      <Row label={t('shell.prop.format')}>
        {t(formatLabelKey(publication.format))}
      </Row>
      <Row label={t('shell.prop.source')}>
        {t(sourceLabelKey(publication.sourceType))}
      </Row>
      <Row label={t('shell.prop.draft')}>
        {publication.noteId ? (
          <button
            type="button"
            onClick={() =>
              openTab({
                kind: 'note',
                id: publication.noteId as string,
                title: publication.title,
              })
            }
            className="max-w-full truncate text-left text-xs text-accent transition-colors hover:underline"
          >
            {t('publish.draft.open')}
          </button>
        ) : (
          '—'
        )}
      </Row>
    </dl>
  );
}

// ── Painel de Recurso ───────────────────────────────────────────────────────

/** Painel direito de um recurso: propriedades (tipo, stage, labels, vínculos). */
function ResourcePanel({ resourceId }: { resourceId: string }) {
  const { t } = useTranslation();
  const { get } = useActiveResources();
  const active = get(resourceId);

  return (
    <aside className="flex h-full flex-col gap-1 overflow-y-auto bg-bg p-2 text-fg">
      <CollapsibleSection
        storageKey="web.shell.right.resourceProperties"
        label={t('shell.properties')}
      >
        {active ? (
          <ResourceProperties
            resource={active.resource}
            noteCount={active.noteCount}
          />
        ) : (
          <p className="px-2 py-2 text-xs text-muted">{t('agenda.loading')}</p>
        )}
      </CollapsibleSection>
    </aside>
  );
}

function ResourceProperties({
  resource,
  noteCount,
}: {
  resource: ResourceResponse;
  noteCount: number;
}) {
  const { t } = useTranslation();
  const [labelNames, setLabelNames] = useState<string[]>([]);

  useEffect(() => {
    const ids = resource.labelIds;
    if (ids.length === 0) {
      setLabelNames([]);
      return;
    }
    let cancelled = false;
    listLabels()
      .then((tree) => {
        if (cancelled) return;
        const byId = new Map(flattenLabels(tree).map((l) => [l.id, l.name]));
        setLabelNames(ids.map((id) => byId.get(id) ?? id));
      })
      .catch(() => {
        if (!cancelled) setLabelNames(ids);
      });
    return () => {
      cancelled = true;
    };
  }, [resource.labelIds]);

  return (
    <dl className="flex flex-col gap-2 px-2 py-1">
      <Row label={t('shell.prop.type')}>
        {t(`resource.type.${resource.type}`)}
      </Row>
      <Row label={t('shell.prop.stage')}>
        {t(`resource.stage.${resource.stage}`)}
      </Row>
      {resource.author && (
        <Row label={t('resource.field.author')}>{resource.author}</Row>
      )}
      <Row label={t('shell.labels')}>
        {labelNames.length > 0 ? labelNames.join(', ') : '—'}
      </Row>
      <Row label={t('resource.notes.title')}>{noteCount}</Row>
    </dl>
  );
}

// ── Outline ───────────────────────────────────────────────────────────────────

function Outline({
  doc,
  onSelect,
}: {
  doc: Record<string, unknown> | undefined;
  onSelect: (heading: OutlineHeading) => void;
}) {
  const { t } = useTranslation();
  const headings = extractOutline(doc);

  if (headings.length === 0) {
    return (
      <p className="px-2 py-2 text-xs text-muted">{t('shell.outlineEmpty')}</p>
    );
  }

  return (
    <ul className="flex flex-col px-1 py-1">
      {headings.map((h) => (
        <li key={h.id}>
          <button
            type="button"
            onClick={() => onSelect(h)}
            className="block w-full truncate rounded px-2 py-1 text-left text-xs text-muted transition-colors hover:bg-card hover:text-fg"
            style={{ paddingLeft: `${0.5 + (h.level - 1) * 0.75}rem` }}
          >
            {h.text}
          </button>
        </li>
      ))}
    </ul>
  );
}
