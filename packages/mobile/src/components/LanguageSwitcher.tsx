import { useTranslation } from 'react-i18next';

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();

  function toggle() {
    i18n.changeLanguage(i18n.language === 'pt' ? 'en' : 'pt');
  }

  return (
    <button
      onClick={toggle}
      className="rounded px-3 py-1 text-sm font-medium text-gray-600 hover:bg-gray-100 active:bg-gray-200"
    >
      {t('lang.switch')}
    </button>
  );
}
