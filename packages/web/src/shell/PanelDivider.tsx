interface PanelDividerProps {
  onPointerDown: (event: React.PointerEvent) => void;
  onDoubleClick: () => void;
  ariaLabel: string;
}

/**
 * Divisor arrastável entre painéis. Faixa fina com área de clique maior;
 * arrastar redimensiona, duplo-clique reseta para a largura padrão.
 */
export function PanelDivider({
  onPointerDown,
  onDoubleClick,
  ariaLabel,
}: PanelDividerProps) {
  return (
    <div
      role="separator"
      aria-label={ariaLabel}
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
      className="group relative w-1 flex-shrink-0 cursor-col-resize touch-none"
    >
      <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-subtle transition-colors group-hover:bg-accent" />
    </div>
  );
}
