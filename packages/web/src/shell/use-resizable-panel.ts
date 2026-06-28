import { useCallback, useRef } from 'react';

import { usePersistentState } from './use-persistent-state.js';

export interface ResizablePanel {
  /** Largura atual em px (ignorada quando colapsado). */
  width: number;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  toggleCollapsed: () => void;
  /** Handler de pointerdown para o divisor. Implementa o drag via pointer events. */
  onDividerPointerDown: (event: React.PointerEvent) => void;
  /** Duplo-clique no divisor: volta à largura padrão. */
  resetWidth: () => void;
}

interface Options {
  /** Chaves de localStorage: `${storageKey}Width` e `${storageKey}Collapsed`. */
  widthKey: string;
  collapsedKey: string;
  defaultWidth: number;
  minWidth: number;
  maxWidth: number;
  /** De que lado o painel está: define o sinal do delta ao arrastar. */
  side: 'left' | 'right';
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Lógica de redimensionar + colapsar um painel lateral, com persistência.
 * O drag é implementado à mão com pointer events (sem biblioteca), capturando
 * o ponteiro no divisor para não perder o movimento ao sair do elemento.
 */
export function useResizablePanel(options: Options): ResizablePanel {
  const { widthKey, collapsedKey, defaultWidth, minWidth, maxWidth, side } =
    options;

  const [width, setWidth] = usePersistentState<number>(widthKey, defaultWidth);
  const [collapsed, setCollapsed] = usePersistentState<boolean>(
    collapsedKey,
    false,
  );

  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const onDividerPointerDown = useCallback(
    (event: React.PointerEvent) => {
      event.preventDefault();
      const target = event.currentTarget;
      target.setPointerCapture(event.pointerId);
      dragRef.current = { startX: event.clientX, startWidth: width };

      const handleMove = (moveEvent: PointerEvent) => {
        const drag = dragRef.current;
        if (!drag) return;
        const delta = moveEvent.clientX - drag.startX;
        // Painel esquerdo cresce ao arrastar para a direita; o direito, ao contrário.
        const signed = side === 'left' ? delta : -delta;
        setWidth(clamp(drag.startWidth + signed, minWidth, maxWidth));
      };

      const handleUp = () => {
        dragRef.current = null;
        target.releasePointerCapture?.(event.pointerId);
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', handleUp);
      };

      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', handleUp);
    },
    [width, side, minWidth, maxWidth, setWidth],
  );

  const resetWidth = useCallback(() => {
    setWidth(defaultWidth);
  }, [defaultWidth, setWidth]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => !prev);
  }, [setCollapsed]);

  return {
    width,
    collapsed,
    setCollapsed,
    toggleCollapsed,
    onDividerPointerDown,
    resetWidth,
  };
}
