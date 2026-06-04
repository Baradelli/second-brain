import { Button } from '@cerebro/ui';
import { Check } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { submitCapture } from '../lib/offline/index.js';

interface QuickCaptureFormProps {
  onCaptured?: () => void;
  rows?: number;
}

export function QuickCaptureForm({ onCaptured, rows = 3 }: QuickCaptureFormProps) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [justCaptured, setJustCaptured] = useState(false);
  const [queued, setQueued] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  async function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      const { queued: wasQueued } = await submitCapture(trimmed);
      setText('');
      setQueued(wasQueued);
      setJustCaptured(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setJustCaptured(false), 2000);
      onCaptured?.();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="rounded-[var(--radius-card-lg)] p-3 transition-shadow"
      style={{
        backgroundColor: 'var(--cerebro-card)',
        border: '1px solid var(--cerebro-border)',
        boxShadow: 'var(--cerebro-shadow-sm)',
      }}
    >
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t('capture.placeholder')}
        rows={rows}
        aria-label={t('capture.placeholder')}
        className="w-full resize-none bg-transparent px-2 pt-1.5 text-[0.95rem] leading-relaxed outline-none placeholder:text-[var(--cerebro-faint)]"
        style={{ color: 'var(--cerebro-fg)' }}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') void handleSubmit();
        }}
      />
      <div
        className="mt-1 flex items-center justify-between border-t pt-2.5"
        style={{ borderColor: 'var(--cerebro-border)' }}
      >
        <span
          className="flex items-center gap-1.5 px-1 text-xs font-medium transition-opacity duration-300"
          style={{ color: 'var(--cerebro-success)', opacity: justCaptured ? 1 : 0 }}
          aria-live="polite"
        >
          <Check size={14} strokeWidth={2.5} />
          {queued ? t('capture.queued') : t('capture.success')}
        </span>
        <Button
          onClick={() => void handleSubmit()}
          disabled={!text.trim() || submitting}
          size="sm"
        >
          {submitting ? t('capture.submitting') : t('capture.submit')}
        </Button>
      </div>
    </div>
  );
}
