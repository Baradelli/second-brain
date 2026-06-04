import { useTranslation } from 'react-i18next';
import { SectionHeader } from '@cerebro/ui';

export function AssistantPage() {
  const { t } = useTranslation();
  return (
    <main className="p-4">
      <SectionHeader label={t('nav.assistant')} className="mb-4" />
    </main>
  );
}
