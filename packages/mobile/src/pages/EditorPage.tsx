import { useTranslation } from 'react-i18next';

export function EditorPage() {
  const { t } = useTranslation();
  return (
    <main className="p-4">
      <h1 className="text-xl font-semibold">{t('nav.editor')}</h1>
      <p className="mt-2 text-sm text-gray-500">{t('editor.placeholder')}</p>
    </main>
  );
}
