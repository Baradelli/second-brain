import { EmptyState } from '@cerebro/ui';
import { useTranslation } from 'react-i18next';

import { AgendaTab } from '../agenda/AgendaTab.js';
import { GoalDetailTab } from '../goals/GoalDetailTab.js';
import { NoteEditorTab } from '../notes/NoteEditorTab.js';
import { PublicationDetailTab } from '../publications/PublicationDetailTab.js';
import { ResourceDetailTab } from '../resources/ResourceDetailTab.js';
import { ReviewTab } from '../review/ReviewTab.js';
import { StudyItemDetailTab } from '../study/StudyItemDetailTab.js';
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
  resource: (d) => <ResourceDetailTab resourceId={d.id} />,
  goal: (d) => <GoalDetailTab goalId={d.id} />,
  studyItem: (d) => <StudyItemDetailTab studyItemId={d.id} />,
  publication: (d) => <PublicationDetailTab publicationId={d.id} />,
};

export function renderTabContent(
  descriptor: TabDescriptor,
): React.ReactElement {
  return tabRenderers[descriptor.kind](descriptor);
}
