import { useTranslation } from 'react-i18next';

export function AgendaPage() {
  const { t } = useTranslation();
  return (
    <main className="p-4">
      <h1 className="text-xl font-semibold">{t('agenda.todayTitle')}</h1>
      <p className="mt-2 text-sm text-gray-500">{t('agenda.empty')}</p>
    </main>
  );
}
