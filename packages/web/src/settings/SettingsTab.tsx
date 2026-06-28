import type { SettingsResponse } from '@cerebro/shared';
import { settingsResponseSchema } from '@cerebro/shared';
import { getSettings, updateSettings } from '@cerebro/shared/client';
import { Button, useTheme } from '@cerebro/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Languages, Moon, Sun } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import {
  formValuesToPayload,
  type SettingsFormValues,
  settingsToFormValues,
  timezoneOptions,
  weekdayName,
  WEEKDAYS,
} from './settings-display.js';

const SELECT_CLASS =
  'h-11 w-full rounded-[var(--radius-card)] border border-subtle bg-raised px-3 text-sm text-fg outline-none';

/**
 * Aba de Configurações (desktop). Espelha os campos da SettingsPage do mobile —
 * timezone, dias de revisão/recapitulação, horários de devocional/reflexão e modo
 * do assistente (cheap/connected) — mas no padrão do web: react-hook-form +
 * `zodResolver` com o schema compartilhado, e tokens Tailwind (sem CSS inline).
 *
 * Idioma e tema NÃO fazem parte do Settings (vivem no i18n e no ThemeProvider): a
 * tela os controla à parte, reusando `i18n.changeLanguage` (mesmo mecanismo do
 * LanguageSwitcher/CommandPalette) e o `useTheme` do @cerebro/ui (mesmo do header
 * do shell). O mapeamento formulário → payload mora no `settings-display` puro.
 */
export function SettingsTab() {
  const { t, i18n } = useTranslation();
  const { theme, toggle: toggleTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [saved, setSaved] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { isSubmitting },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsResponseSchema),
  });

  useEffect(() => {
    let cancelled = false;
    getSettings()
      .then((s) => {
        if (!cancelled) reset(settingsToFormValues(s));
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reset]);

  const onSubmit = handleSubmit(async (values) => {
    setSaved(false);
    setSaveError(false);
    try {
      const updated: SettingsResponse = await updateSettings(
        formValuesToPayload(values),
      );
      reset(settingsToFormValues(updated));
      setSaved(true);
    } catch {
      setSaveError(true);
    }
  });

  // Limpa o aviso de "salvo" assim que o usuário mexe em qualquer campo.
  useEffect(() => {
    const sub = watch(() => setSaved(false));
    return () => sub.unsubscribe();
  }, [watch]);

  const tz = watch('timezone');
  const isDark = theme === 'dark';

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col overflow-y-auto px-6 py-6">
      <h1 className="font-display text-2xl font-semibold text-fg">
        {t('settings.title')}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        {t('settings.intro')}
      </p>

      {loading && (
        <p className="mt-6 text-sm text-muted">{t('agenda.loading')}</p>
      )}

      {loadError && !loading && (
        <p className="mt-6 text-sm text-muted">{t('settings.error')}</p>
      )}

      {!loading && !loadError && (
        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-5">
          <Field
            label={t('settings.timezone')}
            help={t('settings.timezone.help')}
          >
            <select
              className={SELECT_CLASS}
              data-testid="settings-timezone"
              aria-label={t('settings.timezone')}
              {...register('timezone')}
            >
              {timezoneOptions(tz ?? '').map((zone) => (
                <option key={zone} value={zone}>
                  {zone}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label={t('settings.reviewWeekday')}
            help={t('settings.reviewWeekday.help')}
          >
            <select
              className={SELECT_CLASS}
              aria-label={t('settings.reviewWeekday')}
              {...register('reviewWeekday', { valueAsNumber: true })}
            >
              {WEEKDAYS.map((d) => (
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
              className={SELECT_CLASS}
              aria-label={t('settings.recapWeekday')}
              {...register('recapWeekday', { valueAsNumber: true })}
            >
              {WEEKDAYS.map((d) => (
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
              className={SELECT_CLASS}
              aria-label={t('settings.devotionalTime')}
              {...register('devotionalTime')}
            />
          </Field>

          <Field label={t('settings.reflectionTime')}>
            <input
              type="time"
              className={SELECT_CLASS}
              aria-label={t('settings.reflectionTime')}
              {...register('reflectionTime')}
            />
          </Field>

          <Field
            label={t('settings.ai.mode')}
            help={t('settings.ai.mode.help')}
          >
            <select
              className={SELECT_CLASS}
              data-testid="settings-ai-mode"
              aria-label={t('settings.ai.mode')}
              {...register('aiMode')}
            >
              <option value="cheap">{t('settings.ai.mode.cheap')}</option>
              <option value="connected">
                {t('settings.ai.mode.connected')}
              </option>
            </select>
          </Field>

          <div className="flex items-center gap-3 pt-1">
            <Button
              type="submit"
              disabled={isSubmitting}
              data-testid="settings-save"
            >
              {isSubmitting ? t('settings.saving') : t('settings.save')}
            </Button>
            {saved && (
              <span className="flex items-center gap-1.5 text-sm text-accent">
                <Check size={16} strokeWidth={2} aria-hidden />
                {t('settings.saved')}
              </span>
            )}
            {saveError && (
              <span className="text-sm text-error">{t('settings.error')}</span>
            )}
          </div>
        </form>
      )}

      {/* Aparência: idioma + tema. Fora do form do Settings (vivem no i18n / tema). */}
      <section className="mt-8 flex flex-col gap-3 border-t border-subtle pt-6">
        <h2 className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-muted">
          {t('settings.appearance')}
        </h2>

        <Field
          label={t('settings.language')}
          help={t('settings.language.help')}
        >
          <button
            type="button"
            onClick={() => {
              void i18n.changeLanguage(i18n.language === 'pt' ? 'en' : 'pt');
            }}
            data-testid="settings-language"
            className="flex h-11 items-center gap-2 self-start rounded-[var(--radius-card)] border border-subtle bg-raised px-4 text-sm text-fg transition-colors hover:bg-card"
          >
            <Languages size={16} strokeWidth={1.75} className="text-muted" />
            {t('lang.switch')}
          </button>
        </Field>

        <Field label={t('settings.theme')}>
          <button
            type="button"
            onClick={toggleTheme}
            data-testid="settings-theme"
            className="flex h-11 items-center gap-2 self-start rounded-[var(--radius-card)] border border-subtle bg-raised px-4 text-sm text-fg transition-colors hover:bg-card"
          >
            {isDark ? (
              <Sun size={16} strokeWidth={1.75} className="text-muted" />
            ) : (
              <Moon size={16} strokeWidth={1.75} className="text-muted" />
            )}
            {isDark ? t('theme.toggle.light') : t('theme.toggle.dark')}
          </button>
        </Field>
      </section>
    </div>
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
      <span className="text-sm font-medium text-fg">{label}</span>
      {children}
      {help && (
        <span className="text-xs leading-relaxed text-muted">{help}</span>
      )}
    </label>
  );
}
