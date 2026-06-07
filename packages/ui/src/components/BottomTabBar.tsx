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
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center pb-[max(1rem,env(safe-area-inset-bottom))]">
      <nav
        className="pointer-events-auto flex items-center gap-3 rounded-full p-2"
        style={{
          backgroundColor:
            'color-mix(in srgb, var(--cerebro-card) 55%, transparent)',
          border:
            '1px solid color-mix(in srgb, var(--cerebro-border) 60%, transparent)',
          boxShadow: 'var(--cerebro-shadow-lg)',
          backdropFilter: 'blur(20px) saturate(1.4)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.4)',
        }}
      >
        {tabs.map((tab) =>
          tab.isFab ? (
            <NavLink
              key={tab.to}
              to={tab.to}
              aria-label={tab.label}
              className="group"
            >
              <span
                className="flex h-14 w-14 -translate-y-1 items-center justify-center rounded-full transition-transform duration-150 group-hover:scale-105 group-active:scale-95"
                style={{
                  backgroundColor: 'var(--cerebro-accent)',
                  color: 'var(--cerebro-on-accent)',
                  boxShadow: 'var(--cerebro-shadow-lg)',
                  outline:
                    '3px solid color-mix(in srgb, var(--cerebro-card) 55%, transparent)',
                  outlineOffset: '0px',
                }}
              >
                {tab.icon}
              </span>
            </NavLink>
          ) : (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === '/'}
              aria-label={tab.label}
              className="group"
            >
              {({ isActive }) => (
                <span
                  className="flex h-11 w-11 items-center justify-center rounded-full transition-all duration-200"
                  style={{
                    color: isActive
                      ? 'var(--cerebro-accent)'
                      : 'var(--cerebro-muted)',
                    backgroundColor: isActive
                      ? 'var(--cerebro-accent-soft)'
                      : 'transparent',
                  }}
                >
                  {tab.icon}
                </span>
              )}
            </NavLink>
          ),
        )}
      </nav>
    </div>
  );
}
