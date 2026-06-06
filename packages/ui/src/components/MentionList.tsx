import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react';

export interface MentionItem {
  id: string;
  label: string;
}

export interface MentionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

interface MentionListProps {
  items: MentionItem[];
  command: (item: MentionItem) => void;
}

export const MentionList = forwardRef<MentionListRef, MentionListProps>(
  function MentionList({ items, command }, ref) {
    const [selected, setSelected] = useState(0);

    useEffect(() => setSelected(0), [items]);

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (items.length === 0) return false;
        if (event.key === 'ArrowUp') {
          setSelected((s) => (s + items.length - 1) % items.length);
          return true;
        }
        if (event.key === 'ArrowDown') {
          setSelected((s) => (s + 1) % items.length);
          return true;
        }
        if (event.key === 'Enter') {
          const item = items[selected];
          if (item) command(item);
          return true;
        }
        return false;
      },
    }));

    return (
      <div
        className="flex max-h-64 w-60 flex-col overflow-auto rounded-xl py-1"
        style={{
          backgroundColor: 'var(--cerebro-card)',
          border: '1px solid var(--cerebro-border)',
          boxShadow: 'var(--cerebro-shadow-lg)',
        }}
      >
        {items.length === 0 ? (
          <span
            className="px-3 py-2 text-sm"
            style={{ color: 'var(--cerebro-muted)' }}
          >
            Nenhuma nota
          </span>
        ) : (
          items.map((item, i) => (
            <button
              key={item.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                command(item);
              }}
              className="truncate px-3 py-2 text-left text-sm transition-colors"
              style={{
                backgroundColor:
                  i === selected ? 'var(--cerebro-accent-soft)' : 'transparent',
                color:
                  i === selected
                    ? 'var(--cerebro-accent)'
                    : 'var(--cerebro-fg)',
              }}
            >
              {item.label}
            </button>
          ))
        )}
      </div>
    );
  },
);
