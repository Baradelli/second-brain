import { type ReactNode, useEffect } from 'react';
import { NavLink } from 'react-router-dom';

export interface SidebarItem {
  to: string;
  icon: ReactNode;
  label: string;
}

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  items: SidebarItem[];
  title?: string;
  /** Conteúdo opcional fixado no rodapé do drawer (ex.: botão de sair). */
  footer?: ReactNode;
}

/**
 * Drawer lateral (esquerda) com a navegação secundária. O footer flutuante guarda só os
 * atalhos principais; o resto das seções mora aqui e cresce conforme o app ganha páginas.
 */
export function Sidebar({ open, onClose, items, title, footer }: SidebarProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <>
      <div
        aria-hidden
        onClick={onClose}
        data-testid="sidebar-backdrop"
        className={`fixed inset-0 z-[60] transition-opacity duration-200 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.35)' }}
      />
      <aside
        aria-hidden={!open}
        className={`fixed inset-y-0 left-0 z-[70] flex w-72 max-w-[82vw] flex-col gap-1 p-4 transition-transform duration-200 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          backgroundColor: 'var(--cerebro-card)',
          borderRight: '1px solid var(--cerebro-border)',
          boxShadow: open ? 'var(--cerebro-shadow-lg)' : 'none',
        }}
      >
        {title && (
          <span
            className="mb-3 px-3 font-display text-base font-semibold"
            style={{ color: 'var(--cerebro-fg)' }}
          >
            {title}
          </span>
        )}
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={onClose}
            tabIndex={open ? 0 : -1}
            className="flex items-center gap-3 rounded-[var(--radius-card)] px-3 py-2.5 text-sm font-medium"
            style={({ isActive }) => ({
              color: isActive ? 'var(--cerebro-accent)' : 'var(--cerebro-fg)',
              backgroundColor: isActive
                ? 'var(--cerebro-accent-soft)'
                : 'transparent',
            })}
          >
            <span className="flex h-5 w-5 items-center justify-center">
              {item.icon}
            </span>
            {item.label}
          </NavLink>
        ))}
        {footer && <div className="mt-auto pt-2">{footer}</div>}
      </aside>
    </>
  );
}
