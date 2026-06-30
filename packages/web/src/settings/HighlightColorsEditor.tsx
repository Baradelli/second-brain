import type { HighlightColorInput } from '@cerebro/shared';
import {
  addHighlightColor,
  editHighlightColor,
  listHighlightColors,
  removeHighlightColor,
} from '@cerebro/shared/client';
import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

/** Extrai o `count` de um erro 409 ("...HTTP 409: {...\"count\":N}"). */
function inUseCount(err: unknown): number | null {
  if (!(err instanceof Error) || !err.message.includes('409')) return null;
  const m = err.message.match(/"count":(\d+)/);
  return m ? Number(m[1]) : 0;
}

/**
 * Editor da paleta global de grifos (cores de marca-texto). Cada cor tem um
 * significado editável; renomear/recolorir não quebra grifos antigos (id estável).
 * Remover uma cor em uso é bloqueado pelo backend (409) — mostramos a contagem.
 */
export function HighlightColorsEditor() {
  const { t } = useTranslation();
  const [colors, setColors] = useState<HighlightColorInput[]>([]);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#FACC15');
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState<{ id: string; count: number } | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    listHighlightColors()
      .then((cs) => {
        if (!cancelled) setColors(cs);
      })
      .catch(() => {
        if (!cancelled) setColors([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function patchLocal(id: string, patch: Partial<HighlightColorInput>) {
    setColors((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  async function commit(id: string, patch: { name?: string; color?: string }) {
    try {
      const updated = await editHighlightColor(id, patch);
      patchLocal(id, updated);
    } catch {
      // mantém o valor local; o usuário pode tentar de novo
    }
  }

  async function add() {
    const name = newName.trim();
    if (!name || busy) return;
    setBusy(true);
    try {
      const created = await addHighlightColor({ name, color: newColor });
      setColors((prev) => [...prev, created]);
      setNewName('');
    } catch {
      // silencioso
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBlocked(null);
    try {
      await removeHighlightColor(id);
      setColors((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      const count = inUseCount(err);
      if (count !== null) setBlocked({ id, count });
    }
  }

  return (
    <section className="mt-8 flex flex-col gap-3 border-t border-subtle pt-6">
      <div>
        <h2 className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-muted">
          {t('settings.highlightColors.title')}
        </h2>
        <p className="mt-1.5 text-xs leading-relaxed text-muted">
          {t('settings.highlightColors.help')}
        </p>
      </div>

      <ul className="flex flex-col gap-1.5">
        {colors.map((c) => (
          <li key={c.id} className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={c.color}
                aria-label={t('highlight.field.color')}
                onChange={(e) => {
                  patchLocal(c.id, { color: e.target.value });
                  void commit(c.id, { color: e.target.value });
                }}
                className="h-8 w-8 shrink-0 cursor-pointer rounded-md border border-subtle bg-transparent p-0.5"
              />
              <input
                value={c.name}
                aria-label={t('settings.highlightColors.name')}
                onChange={(e) => patchLocal(c.id, { name: e.target.value })}
                onBlur={(e) => {
                  const name = e.target.value.trim();
                  if (name && name !== '') void commit(c.id, { name });
                }}
                className="h-9 flex-1 rounded-[var(--radius-card)] border border-subtle bg-raised px-3 text-sm text-fg outline-none focus:ring-2 focus:ring-[var(--cerebro-accent-soft)]"
              />
              <button
                type="button"
                onClick={() => void remove(c.id)}
                aria-label={t('common.delete')}
                title={t('common.delete')}
                className="rounded p-2 text-faint transition-colors hover:bg-card hover:text-[var(--cerebro-error)]"
              >
                <Trash2 size={15} strokeWidth={1.75} aria-hidden />
              </button>
            </div>
            {blocked?.id === c.id && (
              <p
                role="alert"
                className="pl-10 text-[0.6875rem] leading-relaxed"
                style={{ color: 'var(--cerebro-error)' }}
              >
                {t('settings.highlightColors.inUse', { count: blocked.count })}
              </p>
            )}
          </li>
        ))}
      </ul>

      {/* Adicionar cor */}
      <div className="mt-1 flex items-center gap-2">
        <input
          type="color"
          value={newColor}
          aria-label={t('highlight.field.color')}
          onChange={(e) => setNewColor(e.target.value)}
          className="h-8 w-8 shrink-0 cursor-pointer rounded-md border border-subtle bg-transparent p-0.5"
        />
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void add();
            }
          }}
          placeholder={t('settings.highlightColors.name')}
          className="h-9 flex-1 rounded-[var(--radius-card)] border border-subtle bg-raised px-3 text-sm text-fg outline-none placeholder:text-faint focus:ring-2 focus:ring-[var(--cerebro-accent-soft)]"
        />
        <button
          type="button"
          onClick={() => void add()}
          disabled={!newName.trim() || busy}
          className="flex h-9 items-center gap-1 rounded-full bg-accent px-3 text-[0.6875rem] font-semibold text-[var(--cerebro-on-accent)] transition-opacity disabled:opacity-45"
        >
          <Plus size={13} strokeWidth={2.5} aria-hidden />
          {t('settings.highlightColors.add')}
        </button>
      </div>
    </section>
  );
}
