import { useTranslation } from 'react-i18next';
import { Card, EmptyState, SectionHeader } from '@cerebro/ui';

export function AgendaPage() {
  const { t } = useTranslation();
  return (
    <main className="p-4 space-y-4">
      <SectionHeader label={t('nav.home')} />
      <Card>
        <EmptyState title={t('agenda.todayTitle')} body={t('agenda.empty')} />
      </Card>
    </main>
  );
}
