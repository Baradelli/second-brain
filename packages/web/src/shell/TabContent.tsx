import { EmptyState } from '@cerebro/ui';
import { useTranslation } from 'react-i18next';

import { renderTabContent } from '../tabs/tab-registry.js';
import { useTabs } from '../tabs/tabs-context.js';

/** Painel central: conteúdo da aba ativa, ou estado vazio quando não há abas. */
export function TabContent() {
  const { t } = useTranslation();
  const { activeTab } = useTabs();

  if (!activeTab) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState title={t('shell.noTabs')} />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      {renderTabContent(activeTab.descriptor)}
    </div>
  );
}
