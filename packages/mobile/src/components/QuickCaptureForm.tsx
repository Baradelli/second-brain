import { Button } from '@cerebro/ui';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { createCapture } from '../lib/api/endpoints.js';

interface QuickCaptureFormProps {
  onCaptured?: () => void;
  rows?: number;
}

export function QuickCaptureForm({ onCaptured, rows = 3 }: QuickCaptureFormProps) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [justCaptured, setJustCaptured] = useState(false);
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
      await createCapture(trimmed);
      setText('');
      setJustCaptured(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setJustCaptured(false), 2000);
      onCaptured?.();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t('capture.placeholder')}
        rows={rows}
        aria-label={t('capture.placeholder')}
        className="w-full resize-none rounded-2xl px-4 py-3 text-sm leading-relaxed focus:outline-none transition-shadow duration-150 focus:ring-2"
        style={{
          backgroundColor: 'var(--cerebro-card)',
          color: 'var(--cerebro-fg)',
          border: '1px solid var(--cerebro-border)',
          // @ts-expect-error custom property
          '--tw-ring-color': 'rgba(109,93,252,0.35)',
        }}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') void handleSubmit();
        }}
      />
      <div className="mt-2 flex items-center justify-between">
        <span
          className="text-xs transition-opacity duration-200"
          style={{ color: '#22c55e', opacity: justCaptured ? 1 : 0 }}
          aria-live="polite"
        >
          ✓ {t('capture.success')}
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
