import { EmptyState } from '@cerebro/ui';
import { useTranslation } from 'react-i18next';

import { AgendaTab } from '../agenda/AgendaTab.js';
import { NoteEditorTab } from '../notes/NoteEditorTab.js';
import { ReviewTab } from '../review/ReviewTab.js';
import type { TabDescriptor, TabKind } from './tabs-reducer.js';

/**
 * Registro kind → renderizador de conteúdo. Por enquanto cada kind mostra um
 * placeholder "em breve"; nas próximas fases trocamos a entrada do mapa pela
 * tela real, sem mexer no shell/abas.
 */
type TabRenderer = (descriptor: TabDescriptor) => React.ReactElement;

/** Placeholder genérico: título da seção + "em breve". */
function ComingSoon({ titleKey }: { titleKey: string }) {
  const { t } = useTranslation();
  return (
    <EmptyState
      title={t(titleKey)}
      body={t('shell.comingSoon')}
      className="h-full"
    />
  );
}

const tabRenderers: Record<TabKind, TabRenderer> = {
  today: () => <AgendaTab />,
  review: () => <ReviewTab />,
  search: () => <ComingSoon titleKey="shell.search" />,
  calendar: () => <ComingSoon titleKey="shell.calendar" />,
  assistant: () => <ComingSoon titleKey="shell.assistant" />,
  settings: () => <ComingSoon titleKey="shell.settings" />,
  graph: () => <ComingSoon titleKey="shell.graph" />,
  // Kinds com identidade (id próprio) mostram o título da aba no placeholder.
  note: (d) => <NoteEditorTab noteId={d.id} />,
  resource: (d) => (
    <EntityComingSoon labelKey="shell.resourcePrefix" title={d.title} />
  ),
  goal: (d) => <EntityComingSoon labelKey="shell.goalPrefix" title={d.title} />,
  studyItem: (d) => (
    <EntityComingSoon labelKey="shell.studyItemPrefix" title={d.title} />
  ),
  publication: (d) => (
    <EntityComingSoon labelKey="shell.publicationPrefix" title={d.title} />
  ),
};

function EntityComingSoon({
  labelKey,
  title,
}: {
  labelKey: string;
  title: string;
}) {
  const { t } = useTranslation();
  return (
    <EmptyState
      title={t(labelKey, { title })}
      body={t('shell.comingSoon')}
      className="h-full"
    />
  );
}

export function renderTabContent(
  descriptor: TabDescriptor,
): React.ReactElement {
  return tabRenderers[descriptor.kind](descriptor);
}
