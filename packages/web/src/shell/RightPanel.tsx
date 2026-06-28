import type { NoteResponse, NoteType } from '@cerebro/shared';
import { flattenLabels, listLabels } from '@cerebro/shared/client';
import { EmptyState } from '@cerebro/ui';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useActiveNotes } from '../notes/active-note-context.js';
import { extractOutline, type OutlineHeading } from '../notes/outline.js';
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
 * e Backlinks (placeholder até a Fase 4). Lê a nota ativa do ActiveNotesContext
 * pela id do descriptor da aba ativa.
 */
export function RightPanel() {
  const { t } = useTranslation();
  const { activeTab } = useTabs();
  const { get, scrollToHeading } = useActiveNotes();

  if (activeTab?.descriptor.kind !== 'note') {
    return (
      <aside className="flex h-full items-center justify-center bg-bg text-fg">
        <EmptyState title={t('shell.rightPanelEmpty')} />
      </aside>
    );
  }

  const noteId = activeTab.descriptor.id;
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
        <p className="px-2 py-2 text-xs text-muted">{t('shell.comingSoon')}</p>
      </CollapsibleSection>
    </aside>
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
        <Row label={t('shell.prop.resource')}>{note.resourceId}</Row>
      )}
      {note.goalId && <Row label={t('shell.prop.goal')}>{note.goalId}</Row>}
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
