import type { LoginBody } from '@cerebro/shared';
import { loginSchema } from '@cerebro/shared';
import { login, setToken } from '@cerebro/shared/client';
import { Button, Input } from '@cerebro/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

/**
 * Tela de login do web (desktop): card centrado, sóbrio e amigável ao tema
 * escuro. Reusa o schema/endpoint/token helpers de @cerebro/shared.
 */
export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginBody>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    setError(false);
    try {
      const { token } = await login(values.email, values.password);
      setToken(token);
      navigate('/', { replace: true });
    } catch {
      setError(true);
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg px-6 text-fg">
      <form
        onSubmit={onSubmit}
        className="flex w-full max-w-sm flex-col gap-4 rounded-[var(--radius-card-lg)] border border-subtle bg-card p-8 shadow-lg"
      >
        <div className="mb-1">
          <h1 className="flex items-center gap-2 font-display text-2xl font-semibold leading-tight text-fg">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full bg-accent"
              aria-hidden
            />
            {t('login.title')}
          </h1>
          <p className="mt-1 text-sm text-muted">{t('login.subtitle')}</p>
        </div>

        <Input
          label={t('login.email')}
          type="email"
          autoComplete="username"
          error={errors.email ? t('login.emailInvalid') : undefined}
          {...register('email')}
        />
        <Input
          label={t('login.password')}
          type="password"
          autoComplete="current-password"
          {...register('password')}
        />

        {error && <p className="text-sm text-error">{t('login.error')}</p>}

        <Button type="submit" disabled={submitting} data-testid="login-submit">
          {submitting ? t('login.submitting') : t('login.submit')}
        </Button>
      </form>
    </main>
  );
}
