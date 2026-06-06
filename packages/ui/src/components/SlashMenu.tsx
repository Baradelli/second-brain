import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react';

import type { SlashItem } from './slash-command.js';

export interface SlashMenuRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

interface SlashMenuProps {
  items: SlashItem[];
  command: (item: SlashItem) => void;
}

export const SlashMenu = forwardRef<SlashMenuRef, SlashMenuProps>(
  function SlashMenu({ items, command }, ref) {
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

    if (items.length === 0) return null;

    return (
      <div
        className="flex w-52 flex-col overflow-hidden rounded-xl py-1"
        style={{
          backgroundColor: 'var(--cerebro-card)',
          border: '1px solid var(--cerebro-border)',
          boxShadow: 'var(--cerebro-shadow-lg)',
        }}
      >
        {items.map((item, i) => (
          <button
            key={item.title}
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              command(item);
            }}
            className="flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors"
            style={{
              backgroundColor:
                i === selected ? 'var(--cerebro-accent-soft)' : 'transparent',
              color:
                i === selected ? 'var(--cerebro-accent)' : 'var(--cerebro-fg)',
            }}
          >
            {item.title}
          </button>
        ))}
      </div>
    );
  },
);
