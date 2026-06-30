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

function inUseCount(err: unknown): number | null {
  if (!(err instanceof Error) || !err.message.includes('409')) return null;
  const m = err.message.match(/"count":(\d+)/);
  return m ? Number(m[1]) : 0;
}

const FIELD_STYLE = {
  backgroundColor: 'var(--cerebro-raised)',
  color: 'var(--cerebro-fg)',
  border: '1px solid var(--cerebro-border)',
} as const;

/** Editor da paleta global de grifos no mobile (espelha o do desktop). */
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
      patchLocal(id, await editHighlightColor(id, patch));
    } catch {
      // mantém local
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
    <section className="mt-8 border-t pt-6" style={{ borderColor: 'var(--cerebro-border)' }}>
      <h2
        className="text-[0.6875rem] font-bold uppercase tracking-[0.14em]"
        style={{ color: 'var(--cerebro-muted)' }}
      >
        {t('settings.highlightColors.title')}
      </h2>
      <p className="mt-1.5 text-xs leading-relaxed" style={{ color: 'var(--cerebro-muted)' }}>
        {t('settings.highlightColors.help')}
      </p>

      <ul className="mt-3 flex flex-col gap-2">
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
                className="h-9 w-9 shrink-0 rounded-md p-0.5"
                style={{ border: '1px solid var(--cerebro-border)' }}
              />
              <input
                value={c.name}
                aria-label={t('settings.highlightColors.name')}
                onChange={(e) => patchLocal(c.id, { name: e.target.value })}
                onBlur={(e) => {
                  const name = e.target.value.trim();
                  if (name) void commit(c.id, { name });
                }}
                className="h-10 flex-1 rounded-[var(--radius-card)] px-3 text-sm outline-none"
                style={FIELD_STYLE}
              />
              <button
                type="button"
                onClick={() => void remove(c.id)}
                aria-label={t('common.delete')}
                className="flex h-9 w-9 items-center justify-center rounded-full"
                style={{ color: 'var(--cerebro-muted)' }}
              >
                <Trash2 size={16} strokeWidth={1.85} />
              </button>
            </div>
            {blocked?.id === c.id && (
              <p
                role="alert"
                className="pl-11 text-[0.6875rem] leading-relaxed"
                style={{ color: 'var(--cerebro-error)' }}
              >
                {t('settings.highlightColors.inUse', { count: blocked.count })}
              </p>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-3 flex items-center gap-2">
        <input
          type="color"
          value={newColor}
          aria-label={t('highlight.field.color')}
          onChange={(e) => setNewColor(e.target.value)}
          className="h-9 w-9 shrink-0 rounded-md p-0.5"
          style={{ border: '1px solid var(--cerebro-border)' }}
        />
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={t('settings.highlightColors.name')}
          className="h-10 flex-1 rounded-[var(--radius-card)] px-3 text-sm outline-none"
          style={FIELD_STYLE}
        />
        <button
          type="button"
          onClick={() => void add()}
          disabled={!newName.trim() || busy}
          className="flex h-10 items-center gap-1 rounded-full px-3 text-[0.6875rem] font-semibold disabled:opacity-45"
          style={{
            backgroundColor: 'var(--cerebro-accent)',
            color: 'var(--cerebro-on-accent)',
          }}
        >
          <Plus size={14} strokeWidth={2.5} />
          {t('settings.highlightColors.add')}
        </button>
      </div>
    </section>
  );
}
