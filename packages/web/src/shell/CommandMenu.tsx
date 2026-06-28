import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Um item executável do menu. `label` é o que aparece e o que o filtro casa;
 * `hint` é uma dica secundária à direita (atalho, tipo etc.); `run` dispara a ação.
 */
export interface CommandItem {
  id: string;
  label: string;
  hint?: string;
  run: () => void;
}

interface CommandMenuProps {
  open: boolean;
  onClose: () => void;
  /** Itens já filtrados/ordenados pelo chamador para a query atual. */
  items: CommandItem[];
  query: string;
  onQueryChange: (q: string) => void;
  placeholder: string;
  /** Texto/aria-label do diálogo (ex.: "Paleta de comandos"). */
  ariaLabel: string;
  /** Mensagem quando não há itens (ex.: "Nada encontrado"). */
  emptyLabel: string;
}

/**
 * Primitivo reutilizável de "menu de comando" (estilo Cmd+P): um overlay em
 * portal com input de busca + lista navegável por teclado. Espelha o
 * QuickCaptureModal no portal/Esc/foco-ao-abrir, mas é genérico: o chamador
 * passa os itens (já filtrados) e os handlers. Usado pela paleta e pelo switcher
 * — a lógica de modal/teclado mora só aqui, não se duplica.
 *
 * Teclado: ↑/↓ move o destaque; Enter roda o item destacado; Esc fecha; clique
 * roda; clique no backdrop fecha.
 */
export function CommandMenu({
  open,
  onClose,
  items,
  query,
  onQueryChange,
  placeholder,
  ariaLabel,
  emptyLabel,
}: CommandMenuProps) {
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Ao abrir, foca o input. (RAF para garantir que o nó já está no DOM.)
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  // Toda mudança nos itens (nova query) reseta o destaque para o topo.
  useEffect(() => {
    setHighlight(0);
  }, [items]);

  // Mantém o item destacado visível ao navegar com o teclado.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const el = list.children[highlight] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlight]);

  if (!open) return null;

  function runAt(index: number) {
    const item = items[index];
    if (!item) return;
    item.run();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => (items.length === 0 ? 0 : (h + 1) % items.length));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) =>
        items.length === 0 ? 0 : (h - 1 + items.length) % items.length,
      );
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      runAt(highlight);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 px-4 pt-[12vh]"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className="flex max-h-[60vh] w-full max-w-xl flex-col overflow-hidden rounded-[var(--radius-card-lg)] border border-subtle bg-card shadow-xl"
        onKeyDown={onKeyDown}
      >
        <div className="border-b border-subtle px-4 py-3">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={placeholder}
            aria-label={ariaLabel}
            className="w-full bg-transparent text-[0.95rem] text-fg outline-none placeholder:text-faint"
          />
        </div>

        {items.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted">{emptyLabel}</p>
        ) : (
          <ul ref={listRef} className="min-h-0 flex-1 overflow-y-auto py-1">
            {items.map((item, index) => (
              <li key={item.id}>
                <button
                  type="button"
                  onMouseEnter={() => setHighlight(index)}
                  onClick={() => runAt(index)}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm transition-colors ${
                    index === highlight
                      ? 'bg-raised text-fg'
                      : 'text-fg hover:bg-raised'
                  }`}
                >
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.hint && (
                    <span className="shrink-0 text-xs text-muted">
                      {item.hint}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>,
    document.body,
  );
}
