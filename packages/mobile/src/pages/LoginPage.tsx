import { Button, Input } from '@cerebro/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { login } from '../lib/api/endpoints.js';
import { setToken } from '../lib/auth.js';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
type Values = z.infer<typeof schema>;

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) });

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
    <main
      className="flex min-h-dvh items-center justify-center px-6"
      style={{
        backgroundColor: 'var(--cerebro-bg)',
        color: 'var(--cerebro-fg)',
      }}
    >
      <form
        onSubmit={onSubmit}
        className="flex w-full max-w-sm flex-col gap-4 rounded-[var(--radius-card-lg)] p-6"
        style={{
          backgroundColor: 'var(--cerebro-card)',
          border: '1px solid var(--cerebro-border)',
          boxShadow: 'var(--cerebro-shadow-lg)',
        }}
      >
        <div className="mb-1">
          <h1
            className="flex items-center gap-2 font-display text-2xl font-semibold leading-tight"
            style={{ color: 'var(--cerebro-fg)' }}
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: 'var(--cerebro-accent)' }}
              aria-hidden
            />
            {t('login.title')}
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--cerebro-muted)' }}>
            {t('login.subtitle')}
          </p>
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

        {error && (
          <p className="text-sm" style={{ color: 'var(--cerebro-error)' }}>
            {t('login.error')}
          </p>
        )}

        <Button type="submit" disabled={submitting} data-testid="login-submit">
          {submitting ? t('login.submitting') : t('login.submit')}
        </Button>
      </form>
    </main>
  );
}
