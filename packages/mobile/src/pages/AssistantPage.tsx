import { EmptyState } from '@cerebro/ui';
import { Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function AssistantPage() {
  const { t } = useTranslation();
  return (
    <main className="mx-auto min-h-dvh max-w-lg px-5 pt-8">
      <h1
        className="mb-2 font-display text-[1.75rem] font-semibold leading-tight"
        style={{ color: 'var(--cerebro-fg)' }}
      >
        {t('nav.assistant')}
      </h1>
      <EmptyState
        icon={<Sparkles size={20} strokeWidth={1.75} />}
        title={t('common.comingSoon')}
        body={t('assistant.comingSoonBody')}
      />
    </main>
  );
}
