import { useTranslation } from 'react-i18next';
import { SectionHeader } from '@cerebro/ui';

export function LibraryPage() {
  const { t } = useTranslation();
  return (
    <main className="p-4">
      <SectionHeader label={t('nav.library')} className="mb-4" />
    </main>
  );
}
