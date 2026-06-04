import Color from '@tiptap/extension-color';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TextStyle from '@tiptap/extension-text-style';
import { EditorContent, useEditor, type JSONContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { type ReactNode, useEffect } from 'react';

export interface RichEditorProps {
  doc?: Record<string, unknown>;
  placeholder?: string;
  onChange: (doc: Record<string, unknown>) => void;
  editable?: boolean;
  className?: string;
}

export function RichEditor({
  doc,
  placeholder = 'Comece a escrever…',
  onChange,
  editable = true,
  className = '',
}: RichEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2] },
        codeBlock: false,
        code: false,
        horizontalRule: false,
      }),
      Placeholder.configure({ placeholder }),
      Link.configure({ openOnClick: false }),
      TextStyle,
      Color,
    ],
    content: doc as JSONContent | undefined,
    editable,
    onUpdate({ editor: e }) {
      onChange(e.getJSON() as Record<string, unknown>);
    },
  });

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    editor.setEditable(editable);
  }, [editor, editable]);

  useEffect(() => {
    if (!editor || editor.isDestroyed || !doc) return;
    const current = JSON.stringify(editor.getJSON());
    const incoming = JSON.stringify(doc);
    if (current !== incoming) {
      editor.commands.setContent(doc as JSONContent, false);
    }
  }, [editor, doc]);

  if (!editor) return null;

  return (
    <div className={`flex flex-col ${className}`}>
      {editable && <EditorToolbar editor={editor} />}
      <EditorContent editor={editor} className="flex-1" />
    </div>
  );
}

function EditorToolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  if (!editor) return null;

  return (
    <div
      className="flex shrink-0 items-center gap-0.5 overflow-x-auto px-3 py-1"
      style={{
        backgroundColor: 'var(--cerebro-card)',
        borderBottom: '1px solid var(--cerebro-border)',
        scrollbarWidth: 'none',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
    >
      <ToolBtn
        active={editor.isActive('bold')}
        title="Negrito"
        onPress={() => editor.chain().focus().toggleBold().run()}
      >
        <span style={{ fontWeight: 800, fontSize: '0.875rem', fontFamily: 'Georgia, serif' }}>B</span>
      </ToolBtn>

      <ToolBtn
        active={editor.isActive('italic')}
        title="Itálico"
        onPress={() => editor.chain().focus().toggleItalic().run()}
      >
        <span style={{ fontStyle: 'italic', fontWeight: 600, fontSize: '0.9rem', fontFamily: 'Georgia, serif' }}>I</span>
      </ToolBtn>

      <Divider />

      <ToolBtn
        active={editor.isActive('heading', { level: 1 })}
        title="Título 1"
        onPress={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        <span style={{ fontWeight: 700, fontSize: '0.75rem', letterSpacing: '-0.01em' }}>H1</span>
      </ToolBtn>

      <ToolBtn
        active={editor.isActive('heading', { level: 2 })}
        title="Título 2"
        onPress={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <span style={{ fontWeight: 700, fontSize: '0.75rem', letterSpacing: '-0.01em' }}>H2</span>
      </ToolBtn>

      <Divider />

      <ToolBtn
        active={editor.isActive('blockquote')}
        title="Citação"
        onPress={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <QuoteIcon />
      </ToolBtn>

      <ToolBtn
        active={editor.isActive('bulletList')}
        title="Lista"
        onPress={() => editor.chain().focus().toggleBulletList().run()}
      >
        <BulletListIcon />
      </ToolBtn>

      <ToolBtn
        active={editor.isActive('orderedList')}
        title="Lista numerada"
        onPress={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <OrderedListIcon />
      </ToolBtn>
    </div>
  );
}

function ToolBtn({
  active,
  title,
  onPress,
  children,
}: {
  active: boolean;
  title: string;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      onMouseDown={(e) => {
        e.preventDefault();
        onPress();
      }}
      onTouchEnd={(e) => {
        e.preventDefault();
        onPress();
      }}
      className="flex shrink-0 items-center justify-center rounded-xl transition-all duration-100"
      style={{
        width: '2.5rem',
        height: '2.5rem',
        backgroundColor: active ? 'var(--cerebro-accent)' : 'transparent',
        color: active ? '#fff' : 'var(--cerebro-muted)',
      }}
    >
      {children}
    </button>
  );
}

function Divider() {
  return (
    <div
      className="mx-1 h-5 w-px shrink-0"
      style={{ backgroundColor: 'var(--cerebro-border)' }}
      aria-hidden
    />
  );
}

function QuoteIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="size-4">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}

function BulletListIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" className="size-4">
      <circle cx="4" cy="6" r="1" fill="currentColor" stroke="none" />
      <line x1="7" y1="6" x2="17" y2="6" />
      <circle cx="4" cy="10" r="1" fill="currentColor" stroke="none" />
      <line x1="7" y1="10" x2="17" y2="10" />
      <circle cx="4" cy="14" r="1" fill="currentColor" stroke="none" />
      <line x1="7" y1="14" x2="17" y2="14" />
    </svg>
  );
}

function OrderedListIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" className="size-4">
      <text x="2" y="8" fontSize="6" fill="currentColor" stroke="none" fontWeight="700">1.</text>
      <line x1="7" y1="6" x2="17" y2="6" />
      <text x="2" y="12" fontSize="6" fill="currentColor" stroke="none" fontWeight="700">2.</text>
      <line x1="7" y1="10" x2="17" y2="10" />
      <text x="2" y="16" fontSize="6" fill="currentColor" stroke="none" fontWeight="700">3.</text>
      <line x1="7" y1="14" x2="17" y2="14" />
    </svg>
  );
}
