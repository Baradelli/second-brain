import type { SettingsResponse } from '@cerebro/shared';
import { Button } from '@cerebro/ui';
import { type ReactNode, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { getSettings, updateSettings } from '../lib/api/endpoints.js';

const FALLBACK_TZ = [
  'America/Sao_Paulo',
  'UTC',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/Lisbon',
  'Europe/London',
];

function timezones(): string[] {
  try {
    const fn = (
      Intl as unknown as { supportedValuesOf?: (k: string) => string[] }
    ).supportedValuesOf;
    if (fn) return fn('timeZone');
  } catch {
    // ambiente sem Intl.supportedValuesOf — usa fallback
  }
  return FALLBACK_TZ;
}

// 2024-06-02 é um domingo (índice 0).
function weekdayName(idx: number, locale: string): string {
  return new Date(2024, 5, 2 + idx).toLocaleDateString(locale, {
    weekday: 'long',
  });
}

const selectClass =
  'h-11 w-full rounded-[var(--radius-card)] px-4 text-sm outline-none';
const fieldStyle = {
  backgroundColor: 'var(--cerebro-raised)',
  color: 'var(--cerebro-fg)',
  border: '1px solid var(--cerebro-border)',
} as const;

export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getSettings()
      .then((s) => {
        if (!cancelled) setSettings(s);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function set<K extends keyof SettingsResponse>(
    key: K,
    value: SettingsResponse[K],
  ) {
    setSettings((s) => (s ? { ...s, [key]: value } : s));
    setSaved(false);
  }

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    setSaved(false);
    try {
      const updated = await updateSettings(settings);
      setSettings(updated);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  const tzs = timezones();
  const weekdays = [0, 1, 2, 3, 4, 5, 6];

  return (
    <main className="mx-auto min-h-dvh max-w-lg px-5 pt-8 pb-24">
      <h1
        className="mb-5 font-display text-[1.75rem] font-semibold leading-tight"
        style={{ color: 'var(--cerebro-fg)' }}
      >
        {t('settings.title')}
      </h1>

      {loading && (
        <p className="text-sm" style={{ color: 'var(--cerebro-muted)' }}>
          {t('agenda.loading')}
        </p>
      )}

      {error && !loading && (
        <p className="text-sm" style={{ color: 'var(--cerebro-muted)' }}>
          {t('settings.error')}
        </p>
      )}

      {settings && !loading && !error && (
        <div className="space-y-5">
          <Field
            label={t('settings.timezone')}
            help={t('settings.timezone.help')}
          >
            <select
              className={selectClass}
              style={fieldStyle}
              value={settings.timezone}
              onChange={(e) => set('timezone', e.target.value)}
              aria-label={t('settings.timezone')}
              data-testid="settings-timezone"
            >
              {!tzs.includes(settings.timezone) && (
                <option value={settings.timezone}>{settings.timezone}</option>
              )}
              {tzs.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label={t('settings.reviewWeekday')}
            help={t('settings.reviewWeekday.help')}
          >
            <select
              className={selectClass}
              style={fieldStyle}
              value={String(settings.reviewWeekday)}
              onChange={(e) => set('reviewWeekday', Number(e.target.value))}
              aria-label={t('settings.reviewWeekday')}
            >
              {weekdays.map((d) => (
                <option key={d} value={d}>
                  {weekdayName(d, i18n.language)}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label={t('settings.recapWeekday')}
            help={t('settings.recapWeekday.help')}
          >
            <select
              className={selectClass}
              style={fieldStyle}
              value={String(settings.recapWeekday)}
              onChange={(e) => set('recapWeekday', Number(e.target.value))}
              aria-label={t('settings.recapWeekday')}
            >
              {weekdays.map((d) => (
                <option key={d} value={d}>
                  {weekdayName(d, i18n.language)}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label={t('settings.devotionalTime')}
            help={t('settings.times.help')}
          >
            <input
              type="time"
              className={selectClass}
              style={fieldStyle}
              value={settings.devotionalTime}
              onChange={(e) => set('devotionalTime', e.target.value)}
              aria-label={t('settings.devotionalTime')}
            />
          </Field>

          <Field label={t('settings.reflectionTime')}>
            <input
              type="time"
              className={selectClass}
              style={fieldStyle}
              value={settings.reflectionTime}
              onChange={(e) => set('reflectionTime', e.target.value)}
              aria-label={t('settings.reflectionTime')}
            />
          </Field>

          <div className="flex items-center gap-3 pt-1">
            <Button
              onClick={() => void handleSave()}
              disabled={saving}
              data-testid="settings-save"
            >
              {saving ? t('settings.saving') : t('settings.save')}
            </Button>
            {saved && (
              <span
                className="text-sm"
                style={{ color: 'var(--cerebro-accent)' }}
              >
                {t('settings.saved')}
              </span>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

function Field({
  label,
  help,
  children,
}: {
  label: string;
  help?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span
        className="text-sm font-medium"
        style={{ color: 'var(--cerebro-fg)' }}
      >
        {label}
      </span>
      {children}
      {help && (
        <span className="text-xs" style={{ color: 'var(--cerebro-muted)' }}>
          {help}
        </span>
      )}
    </label>
  );
}
