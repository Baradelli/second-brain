import { EmptyState } from '@cerebro/ui';
import { BookOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function LibraryPage() {
  const { t } = useTranslation();
  return (
    <main className="mx-auto min-h-dvh max-w-lg px-5 pt-8">
      <h1
        className="mb-2 font-display text-[1.75rem] font-semibold leading-tight"
        style={{ color: 'var(--cerebro-fg)' }}
      >
        {t('nav.library')}
      </h1>
      <EmptyState
        icon={<BookOpen size={20} strokeWidth={1.75} />}
        title={t('common.comingSoon')}
        body={t('library.comingSoonBody')}
      />
    </main>
  );
}
