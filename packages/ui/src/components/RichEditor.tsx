import Color from '@tiptap/extension-color';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TextStyle from '@tiptap/extension-text-style';
import { EditorContent, useEditor, type JSONContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  Bold,
  Heading1,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Quote,
} from 'lucide-react';
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

  const iconProps = { size: 17, strokeWidth: 1.85 } as const;

  return (
    <div
      className="no-scrollbar flex shrink-0 items-center gap-0.5 overflow-x-auto px-3 py-1.5"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--cerebro-bg) 80%, transparent)',
        borderBottom: '1px solid var(--cerebro-border)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
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
        <Bold {...iconProps} />
      </ToolBtn>

      <ToolBtn
        active={editor.isActive('italic')}
        title="Itálico"
        onPress={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic {...iconProps} />
      </ToolBtn>

      <Divider />

      <ToolBtn
        active={editor.isActive('heading', { level: 1 })}
        title="Título 1"
        onPress={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        <Heading1 {...iconProps} />
      </ToolBtn>

      <ToolBtn
        active={editor.isActive('heading', { level: 2 })}
        title="Título 2"
        onPress={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 {...iconProps} />
      </ToolBtn>

      <Divider />

      <ToolBtn
        active={editor.isActive('blockquote')}
        title="Citação"
        onPress={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote {...iconProps} />
      </ToolBtn>

      <ToolBtn
        active={editor.isActive('bulletList')}
        title="Lista"
        onPress={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List {...iconProps} />
      </ToolBtn>

      <ToolBtn
        active={editor.isActive('orderedList')}
        title="Lista numerada"
        onPress={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered {...iconProps} />
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
      className="flex shrink-0 items-center justify-center rounded-lg transition-all duration-100 active:scale-90"
      style={{
        width: '2.25rem',
        height: '2.25rem',
        backgroundColor: active ? 'var(--cerebro-accent-soft)' : 'transparent',
        color: active ? 'var(--cerebro-accent)' : 'var(--cerebro-muted)',
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
