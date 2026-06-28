import { useCallback, useEffect, useState } from 'react';

/**
 * Estado em React espelhado no localStorage. Usado para lembrar larguras de
 * painel, painéis colapsados e seções abertas/fechadas do explorador entre
 * sessões. Genérico em qualquer valor serializável por JSON.
 */
export function usePersistentState<T>(
  key: string,
  defaultValue: T,
): [T, (next: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => readStored(key, defaultValue));

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // localStorage indisponível (modo privado, cota) — degrada para só-memória.
    }
  }, [key, value]);

  const set = useCallback((next: T | ((prev: T) => T)) => {
    setValue(next);
  }, []);

  return [value, set];
}

function readStored<T>(key: string, defaultValue: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return defaultValue;
    const parsed: unknown = JSON.parse(raw);
    // Storage pode estar corrompido/desatualizado: só aceita se o tipo bate com
    // o default (e, para números, se for finito) — senão cai no default.
    if (typeof parsed !== typeof defaultValue) return defaultValue;
    if (typeof parsed === 'number' && !Number.isFinite(parsed)) {
      return defaultValue;
    }
    return parsed as T;
  } catch {
    return defaultValue;
  }
}
