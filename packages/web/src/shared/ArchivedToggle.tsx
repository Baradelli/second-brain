import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export interface ArchivedItem {
  id: string;
  title: string;
}

export interface ArchivedToggleProps {
  /** Carrega os itens arquivados sob demanda (só quando a seção abre). */
  load: () => Promise<ArchivedItem[]>;
  /** Abre o item (normalmente numa aba de detalhe, onde mora restaurar/excluir). */
  onOpen: (id: string) => void;
  labels: { show: string; hide: string; empty: string };
}

/**
 * Bloco recolhível "Ver arquivados" reutilizado pelas seções do explorador
 * (Notas, Biblioteca, Estudo, Publicações). Clicar num item arquivado abre seu
 * detalhe, onde ficam as ações de restaurar e excluir de vez — espelha o padrão
 * já existente em `GoalsSection`, sem duplicar a lógica em cada seção.
 */
export function ArchivedToggle({ load, onOpen, labels }: ArchivedToggleProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ArchivedItem[] | null>(null);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && items === null) {
      try {
        setItems(await load());
      } catch {
        setItems([]);
      }
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void toggle()}
        className="mt-1 px-2 py-1.5 text-left text-xs font-medium text-accent transition-colors hover:underline"
      >
        {open ? labels.hide : labels.show}
      </button>

      {open && (
        <ul className="flex flex-col">
          {items === null ? (
            <p className="px-2 py-2 text-xs text-muted">
              {t('agenda.loading')}
            </p>
          ) : items.length === 0 ? (
            <p className="px-2 py-2 text-xs text-muted">{labels.empty}</p>
          ) : (
            items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onOpen(item.id)}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-muted transition-colors hover:bg-card"
                >
                  <span className="min-w-0 flex-1 truncate">{item.title}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </>
  );
}
