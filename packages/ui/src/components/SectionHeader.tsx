interface SectionHeaderProps {
  label: string;
  className?: string;
}

export function SectionHeader({ label, className = '' }: SectionHeaderProps) {
  return (
    <h2
      className={`text-[0.6875rem] font-semibold uppercase tracking-[0.16em] ${className}`}
      style={{ color: 'var(--cerebro-muted)' }}
    >
      {label}
    </h2>
  );
}
