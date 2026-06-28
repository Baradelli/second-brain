import { ChevronDown, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

import { usePersistentState } from './use-persistent-state.js';

interface CollapsibleSectionProps {
  /** Chave de localStorage para lembrar aberto/fechado. */
  storageKey: string;
  label: string;
  defaultCollapsed?: boolean;
  children: ReactNode;
}

/**
 * Cabeçalho clicável com chevron que expande/colapsa o conteúdo. O estado
 * (aberto/fechado) é persistido em localStorage pela `storageKey`.
 */
export function CollapsibleSection({
  storageKey,
  label,
  defaultCollapsed = false,
  children,
}: CollapsibleSectionProps) {
  const [collapsed, setCollapsed] = usePersistentState<boolean>(
    storageKey,
    defaultCollapsed,
  );

  return (
    <div>
      <button
        type="button"
        onClick={() => setCollapsed((prev) => !prev)}
        aria-expanded={!collapsed}
        className="flex w-full items-center gap-1 rounded px-2 py-1.5 text-left text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-muted transition-colors hover:bg-card hover:text-fg"
      >
        {collapsed ? (
          <ChevronRight size={13} strokeWidth={2} />
        ) : (
          <ChevronDown size={13} strokeWidth={2} />
        )}
        <span className="truncate">{label}</span>
      </button>
      {!collapsed && <div className="pb-1">{children}</div>}
    </div>
  );
}
