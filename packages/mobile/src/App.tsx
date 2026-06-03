import { useTranslation } from 'react-i18next';
import { NavLink, Outlet } from 'react-router-dom';

import { LanguageSwitcher } from './components/LanguageSwitcher.js';

export function App() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-dvh flex-col bg-white text-gray-900">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <span className="font-semibold">{t('app.name')}</span>
        <LanguageSwitcher />
      </header>

      <div className="flex-1">
        <Outlet />
      </div>

      <nav className="grid grid-cols-3 border-t text-center text-xs">
        <NavLink
          to="/"
          className={({ isActive }) =>
            `py-3 ${isActive ? 'font-semibold text-indigo-600' : 'text-gray-500'}`
          }
        >
          {t('nav.home')}
        </NavLink>
        <NavLink
          to="/capture"
          className={({ isActive }) =>
            `py-3 ${isActive ? 'font-semibold text-indigo-600' : 'text-gray-500'}`
          }
        >
          {t('nav.capture')}
        </NavLink>
        <NavLink
          to="/review"
          className={({ isActive }) =>
            `py-3 ${isActive ? 'font-semibold text-indigo-600' : 'text-gray-500'}`
          }
        >
          {t('nav.review')}
        </NavLink>
      </nav>
    </div>
  );
}
