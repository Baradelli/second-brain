import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';

export interface Tab {
  to: string;
  icon: ReactNode;
  label: string;
  isFab?: boolean;
}

interface BottomTabBarProps {
  tabs: Tab[];
}

export function BottomTabBar({ tabs }: BottomTabBarProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-end justify-around pb-2"
      style={{
        backgroundColor: 'var(--cerebro-bg)',
        borderTop: '1px solid var(--cerebro-border)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      {tabs.map((tab) => {
        if (tab.isFab) {
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              aria-label={tab.label}
              className="mb-3 flex -translate-y-3 items-center justify-center rounded-full bg-[--cerebro-accent] shadow-lg transition-transform duration-150 active:scale-95"
              style={{
                width: '3.25rem',
                height: '3.25rem',
                boxShadow: '0 4px 16px rgba(109,93,252,0.35)',
              }}
            >
              <span className="text-white">{tab.icon}</span>
            </NavLink>
          );
        }
        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 pb-1 text-[0.625rem] font-medium transition-colors duration-150 ${
                isActive
                  ? 'text-[--cerebro-accent]'
                  : 'text-[--cerebro-muted]'
              }`
            }
          >
            {tab.icon}
            <span>{tab.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
