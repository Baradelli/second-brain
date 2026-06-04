import { useTranslation } from 'react-i18next';

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();

  function toggle() {
    i18n.changeLanguage(i18n.language === 'pt' ? 'en' : 'pt');
  }

  return (
    <button
      onClick={toggle}
      className="rounded-full px-3 py-1.5 text-xs font-semibold tracking-tight transition-colors duration-150 hover:bg-[var(--cerebro-accent-soft)]"
      style={{ color: 'var(--cerebro-muted)' }}
    >
      {t('lang.switch')}
    </button>
  );
}
