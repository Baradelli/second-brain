import { type Driver, driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import './tour.css';

import { HelpCircle } from 'lucide-react';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from 'react';
import { useTranslation } from 'react-i18next';

import { usePersistentState } from '../shell/use-persistent-state.js';
import { buildTourSteps } from './tour-steps.js';

interface TourContextValue {
  /** Inicia (ou reinicia) o tour spotlight. */
  startTour: () => void;
}

const TourContext = createContext<TourContextValue | null>(null);

export function useTour(): TourContextValue {
  const ctx = useContext(TourContext);
  if (!ctx) {
    throw new Error('useTour deve ser usado dentro de <TourProvider>');
  }
  return ctx;
}

/**
 * Orquestra o tour "como usar" com driver.js. Inicia sozinho no primeiro acesso
 * (flag `web.tour.seen` no localStorage) e fica reabrível via `startTour` (botão
 * `?` no header + ação na paleta de comandos). Os passos são filtrados para os
 * alvos realmente montados, então o tour nunca "trava" num elemento ausente.
 */
export function TourProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [seen, setSeen] = usePersistentState('web.tour.seen', false);
  const driverRef = useRef<Driver | null>(null);

  const startTour = useCallback(() => {
    driverRef.current?.destroy();

    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    const steps = buildTourSteps(t).filter(
      (step) =>
        !step.element ||
        document.querySelector(step.element as string) !== null,
    );

    const instance = driver({
      showProgress: true,
      animate: !reduced,
      smoothScroll: true,
      allowClose: true,
      overlayOpacity: 0.65,
      stagePadding: 6,
      stageRadius: 10,
      nextBtnText: t('tour.next'),
      prevBtnText: t('tour.prev'),
      doneBtnText: t('tour.done'),
      progressText: t('tour.progress'),
      steps,
      onDestroyed: () => {
        // Marca como visto ao concluir OU fechar — não reabre sozinho de novo.
        setSeen(true);
      },
    });
    driverRef.current = instance;
    instance.drive();
  }, [t, setSeen]);

  // Auto-start no primeiro acesso (espera o shell montar antes de mirar).
  useEffect(() => {
    if (seen) return;
    const id = window.setTimeout(() => startTour(), 700);
    return () => window.clearTimeout(id);
    // Só na montagem inicial: não reabrir a cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Limpa qualquer instância pendente ao desmontar.
  useEffect(() => () => driverRef.current?.destroy(), []);

  return (
    <TourContext.Provider value={{ startTour }}>
      {children}
    </TourContext.Provider>
  );
}

/** Botão `?` do header que reabre o tour a qualquer momento. */
export function TourButton() {
  const { t } = useTranslation();
  const { startTour } = useTour();
  return (
    <button
      type="button"
      onClick={startTour}
      aria-label={t('tour.help')}
      title={t('tour.help')}
      className="flex h-7 w-7 items-center justify-center rounded text-muted transition-colors hover:bg-card"
    >
      <HelpCircle size={16} strokeWidth={1.75} />
    </button>
  );
}
