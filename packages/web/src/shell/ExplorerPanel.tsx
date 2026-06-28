import {
  BookOpen,
  Brain,
  Calendar,
  CalendarRange,
  FileText,
  FolderOpen,
  Inbox,
  type LucideIcon,
  Megaphone,
  Network,
  Search,
  Settings,
  Sun,
  Tag,
  Target,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useTabs } from '../tabs/tabs-context.js';
import type { TabKind } from '../tabs/tabs-reducer.js';
import { CollapsibleSection } from './CollapsibleSection.js';
import { GoalsSection } from './GoalsSection.js';
import { NotesSection } from './NotesSection.js';
import { PublicationsSection } from './PublicationsSection.js';
import { ResourcesSection } from './ResourcesSection.js';
import { StudySection } from './StudySection.js';

interface PinnedItem {
  kind: TabKind;
  labelKey: string;
  icon: LucideIcon;
}

const PINNED: PinnedItem[] = [
  { kind: 'today', labelKey: 'shell.today', icon: Sun },
  { kind: 'review', labelKey: 'review.title', icon: Inbox },
  { kind: 'search', labelKey: 'shell.search', icon: Search },
  { kind: 'calendar', labelKey: 'shell.calendar', icon: Calendar },
  { kind: 'recaps', labelKey: 'shell.recaps', icon: CalendarRange },
  { kind: 'assistant', labelKey: 'shell.assistant', icon: Brain },
  { kind: 'graph', labelKey: 'shell.graph', icon: Network },
];

interface SectionDef {
  storageKey: string;
  labelKey: string;
  icon: LucideIcon;
}

const SECTIONS: SectionDef[] = [
  {
    storageKey: 'web.shell.section.notes',
    labelKey: 'shell.notes',
    icon: FileText,
  },
  {
    storageKey: 'web.shell.section.resources',
    labelKey: 'shell.resources',
    icon: FolderOpen,
  },
  {
    storageKey: 'web.shell.section.goals',
    labelKey: 'shell.goals',
    icon: Target,
  },
  {
    storageKey: 'web.shell.section.study',
    labelKey: 'shell.study',
    icon: BookOpen,
  },
  {
    storageKey: 'web.shell.section.publications',
    labelKey: 'shell.publications',
    icon: Megaphone,
  },
  {
    storageKey: 'web.shell.section.labels',
    labelKey: 'shell.labels',
    icon: Tag,
  },
];

/**
 * Painel esquerdo (explorador). Itens fixos no topo abrem abas singleton;
 * seções colapsáveis listam conteúdo das próximas fases (por ora, vazias);
 * Config fixo no rodapé.
 */
export function ExplorerPanel() {
  const { t } = useTranslation();
  const { openTab } = useTabs();

  return (
    <nav className="flex h-full flex-col bg-bg text-fg">
      <div className="flex flex-col gap-0.5 p-2">
        {PINNED.map(({ kind, labelKey, icon: Icon }) => (
          <button
            key={kind}
            type="button"
            onClick={() => openTab({ kind, id: kind, title: t(labelKey) })}
            className="flex items-center gap-2.5 rounded px-2 py-1.5 text-sm text-fg transition-colors hover:bg-card"
          >
            <Icon size={16} strokeWidth={1.75} className="text-muted" />
            <span className="truncate">{t(labelKey)}</span>
          </button>
        ))}
      </div>

      <div className="mx-2 border-t border-subtle" />

      <div className="flex-1 overflow-y-auto p-2">
        {SECTIONS.map((section) => (
          <CollapsibleSection
            key={section.storageKey}
            storageKey={section.storageKey}
            label={t(section.labelKey)}
          >
            {section.labelKey === 'shell.notes' ? (
              <NotesSection />
            ) : section.labelKey === 'shell.resources' ? (
              <ResourcesSection />
            ) : section.labelKey === 'shell.goals' ? (
              <GoalsSection />
            ) : section.labelKey === 'shell.study' ? (
              <StudySection />
            ) : section.labelKey === 'shell.publications' ? (
              <PublicationsSection />
            ) : (
              <p className="px-2 py-2 text-xs text-muted">
                {t('shell.sectionEmpty')}
              </p>
            )}
          </CollapsibleSection>
        ))}
      </div>

      <div className="mx-2 border-t border-subtle" />

      <div className="p-2">
        <button
          type="button"
          onClick={() =>
            openTab({
              kind: 'settings',
              id: 'settings',
              title: t('shell.settings'),
            })
          }
          className="flex w-full items-center gap-2.5 rounded px-2 py-1.5 text-sm text-fg transition-colors hover:bg-card"
        >
          <Settings size={16} strokeWidth={1.75} className="text-muted" />
          <span className="truncate">{t('shell.settings')}</span>
        </button>
      </div>
    </nav>
  );
}
