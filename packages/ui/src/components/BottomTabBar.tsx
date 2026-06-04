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
      className="fixed inset-x-0 bottom-0 z-50 flex h-[4.75rem] items-stretch justify-around px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--cerebro-bg) 82%, transparent)',
        borderTop: '1px solid var(--cerebro-border)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
    >
      {tabs.map((tab) => {
        if (tab.isFab) {
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              aria-label={tab.label}
              className="group relative flex flex-1 items-center justify-center"
            >
              <span
                className="flex h-14 w-14 -translate-y-4 items-center justify-center rounded-full transition-transform duration-150 group-active:scale-95"
                style={{
                  backgroundColor: 'var(--cerebro-accent)',
                  color: 'var(--cerebro-on-accent)',
                  boxShadow: 'var(--cerebro-shadow-lg)',
                }}
              >
                {tab.icon}
              </span>
            </NavLink>
          );
        }
        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
            className="group flex flex-1 flex-col items-center justify-center gap-1 pt-1"
          >
            {({ isActive }) => (
              <>
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200"
                  style={{
                    color: isActive ? 'var(--cerebro-accent)' : 'var(--cerebro-muted)',
                    backgroundColor: isActive ? 'var(--cerebro-accent-soft)' : 'transparent',
                  }}
                >
                  {tab.icon}
                </span>
                <span
                  className="text-[0.625rem] font-medium tracking-tight transition-colors duration-200"
                  style={{
                    color: isActive ? 'var(--cerebro-accent)' : 'var(--cerebro-muted)',
                  }}
                >
                  {tab.label}
                </span>
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}
