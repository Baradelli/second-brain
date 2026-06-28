import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';

import { AgendaTab } from '../agenda/AgendaTab.js';
import { AssistantTab } from '../assistant/AssistantTab.js';
import { CalendarTab } from '../calendar/CalendarTab.js';
import { GoalDetailTab } from '../goals/GoalDetailTab.js';
import { NoteEditorTab } from '../notes/NoteEditorTab.js';
import { PublicationDetailTab } from '../publications/PublicationDetailTab.js';
import { RecapsTab } from '../recaps/RecapsTab.js';
import { ResourceDetailTab } from '../resources/ResourceDetailTab.js';
import { ReviewTab } from '../review/ReviewTab.js';
import { SearchTab } from '../search/SearchTab.js';
import { SettingsTab } from '../settings/SettingsTab.js';
import { StudyItemDetailTab } from '../study/StudyItemDetailTab.js';
import type { TabDescriptor, TabKind } from './tabs-reducer.js';

/**
 * Registro kind → renderizador de conteúdo. Cada kind aponta para a tela real;
 * trocar uma entrada do mapa não mexe no shell/abas.
 */
type TabRenderer = (descriptor: TabDescriptor) => React.ReactElement;

// O grafo usa uma lib pesada (force-graph). Carrega sob demanda para não pesar
// o bundle inicial de quem nunca abre a aba Grafo.
const GraphTab = lazy(() =>
  import('../graph/GraphTab.js').then((m) => ({ default: m.GraphTab })),
);

function TabFallback() {
  const { t } = useTranslation();
  return (
    <div className="flex h-full items-center justify-center bg-bg text-fg">
      <p className="text-sm text-muted">{t('agenda.loading')}</p>
    </div>
  );
}

const tabRenderers: Record<TabKind, TabRenderer> = {
  today: () => <AgendaTab />,
  review: () => <ReviewTab />,
  search: () => <SearchTab />,
  calendar: () => <CalendarTab />,
  recaps: () => <RecapsTab />,
  assistant: () => <AssistantTab />,
  settings: () => <SettingsTab />,
  graph: () => (
    <Suspense fallback={<TabFallback />}>
      <GraphTab />
    </Suspense>
  ),
  // Kinds com identidade (id próprio) recebem o id do descriptor.
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
