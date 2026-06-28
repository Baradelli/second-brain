import type { DriveStep } from 'driver.js';
import type { TFunction } from 'i18next';

/**
 * Passos do tour "como usar". Cada passo aponta para um elemento real da UI via
 * `[data-tour="…"]` (âncoras estáveis — não seletores frágeis de classe). Passos
 * sem `element` viram um cartão central (boas-vindas / encerramento). O `AppTour`
 * filtra em tempo de execução os passos cujo alvo não está montado, então a
 * ordem aqui é só a intenção — nada quebra se um alvo não existir na hora.
 */
export function buildTourSteps(t: TFunction): DriveStep[] {
  return [
    {
      popover: {
        title: t('tour.welcome.title'),
        description: t('tour.welcome.body'),
      },
    },
    {
      element: '[data-tour="capture-btn"]',
      popover: {
        title: t('tour.capture.title'),
        description: t('tour.capture.body'),
        side: 'bottom',
        align: 'end',
      },
    },
    {
      element: '[data-tour="nav-today"]',
      popover: {
        title: t('tour.today.title'),
        description: t('tour.today.body'),
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '[data-tour="nav-review"]',
      popover: {
        title: t('tour.review.title'),
        description: t('tour.review.body'),
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '[data-tour="nav-calendar"]',
      popover: {
        title: t('tour.calendar.title'),
        description: t('tour.calendar.body'),
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '[data-tour="explorer-sections"]',
      popover: {
        title: t('tour.library.title'),
        description: t('tour.library.body'),
        side: 'right',
        align: 'center',
      },
    },
    {
      element: '[data-tour="nav-labels"]',
      popover: {
        title: t('tour.labels.title'),
        description: t('tour.labels.body'),
        side: 'right',
        align: 'center',
      },
    },
    {
      element: '[data-tour="nav-settings"]',
      popover: {
        title: t('tour.settings.title'),
        description: t('tour.settings.body'),
        side: 'right',
        align: 'end',
      },
    },
    {
      popover: {
        title: t('tour.end.title'),
        description: t('tour.end.body'),
      },
    },
  ];
}
