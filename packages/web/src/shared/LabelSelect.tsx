import { createLabel, flattenLabels, listLabels } from '@cerebro/shared/client';
import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Multi-seleção compacta de labels do web: lista as labels existentes (achatadas)
 * como chips alternáveis e permite criar um label na hora (reusa `createLabel` do
 * shared/client). É o seletor de labels padrão do desktop — usado no formulário de
 * recurso e injetado no `GoalForm` via `renderLabelPicker`.
 */
export function LabelSelect({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const { t } = useTranslation();
  const [labels, setLabels] = useState<{ id: string; name: string }[]>([]);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listLabels()
      .then((tree) => {
        if (cancelled) return;
        setLabels(flattenLabels(tree).map((l) => ({ id: l.id, name: l.name })));
      })
      .catch(() => {
        if (!cancelled) setLabels([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function toggle(id: string) {
    onChange(
      value.includes(id) ? value.filter((x) => x !== id) : [...value, id],
    );
  }

  // Cria um label na hora e já o seleciona — reusa o usecase via shared/client.
  async function handleCreate() {
    const name = newName.trim();
    if (!name || creating) return;
    setCreating(true);
    try {
      const created = await createLabel({ name });
      setLabels((prev) =>
        [...prev, { id: created.id, name: created.name }].sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      );
      onChange([...value, created.id]);
      setNewName('');
    } catch {
      // Silencioso: mantém o texto digitado para nova tentativa.
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-fg opacity-80">
        {t('shell.labels')}
      </span>
      {labels.length === 0 ? (
        <p className="text-xs text-muted">{t('resource.labels.empty')}</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {labels.map((label) => {
            const selected = value.includes(label.id);
            return (
              <button
                key={label.id}
                type="button"
                onClick={() => toggle(label.id)}
                aria-pressed={selected}
                className={`rounded-full px-2.5 py-0.5 text-[0.6875rem] font-medium transition-colors ${
                  selected
                    ? 'bg-accent text-[var(--cerebro-on-accent)]'
                    : 'border border-subtle text-muted hover:bg-card'
                }`}
              >
                {label.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Criar label na hora */}
      <div className="mt-1 flex items-center gap-1.5">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void handleCreate();
            }
          }}
          placeholder={t('labels.createPlaceholder')}
          data-testid="inline-new-label"
          className="h-8 flex-1 rounded-[var(--radius-card)] border border-subtle bg-raised px-3 text-xs text-fg outline-none placeholder:text-faint"
        />
        <button
          type="button"
          onClick={() => void handleCreate()}
          disabled={!newName.trim() || creating}
          className="flex h-8 items-center gap-1 rounded-full bg-accent px-3 text-[0.6875rem] font-semibold text-[var(--cerebro-on-accent)] transition-opacity disabled:opacity-45"
        >
          <Plus size={13} strokeWidth={2.5} />
          {t('labels.new')}
        </button>
      </div>
    </div>
  );
}
