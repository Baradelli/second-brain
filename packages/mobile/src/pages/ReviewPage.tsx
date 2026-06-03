import { useTranslation } from 'react-i18next';

export function ReviewPage() {
  const { t } = useTranslation();
  return (
    <main className="p-4">
      <h1 className="text-xl font-semibold">{t('review.title')}</h1>
      <p className="mt-2 text-sm text-gray-500">{t('review.empty')}</p>
    </main>
  );
}
