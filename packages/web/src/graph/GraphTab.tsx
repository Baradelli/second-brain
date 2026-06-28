import type { NoteGraphResponse, NoteType } from '@cerebro/shared';
import { getNoteGraph } from '@cerebro/shared/client';
import { EmptyState } from '@cerebro/ui';
import { Network } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import ForceGraph2D, {
  type ForceGraphMethods,
  type NodeObject,
} from 'react-force-graph-2d';
import { useTranslation } from 'react-i18next';

import { useTabs } from '../tabs/tabs-context.js';
import { ALL_NOTE_TYPES, type GraphNode, toGraphData } from './graph-data.js';

/** Cor (token de tipo de nota) usada para pintar o nó no canvas. */
const COLOR_BY_TYPE: Record<NoteType, string> = {
  DEVOTIONAL: 'var(--cerebro-devotional)',
  REFLECTION: 'var(--cerebro-reflection)',
  STUDY_NOTE: 'var(--cerebro-study)',
  NOTE: 'var(--cerebro-note)',
};

const LABEL_KEY_BY_TYPE: Record<NoteType, string> = {
  DEVOTIONAL: 'editor.type.devotional',
  REFLECTION: 'editor.type.reflection',
  STUDY_NOTE: 'editor.type.study',
  NOTE: 'editor.type.note',
};

/** Resolve `var(--token)` para o valor RGB atual (o canvas não entende CSS vars). */
function resolveColor(value: string, root: HTMLElement): string {
  const match = /^var\((--[\w-]+)\)$/.exec(value.trim());
  if (!match || !match[1]) return value;
  const resolved = getComputedStyle(root).getPropertyValue(match[1]).trim();
  return resolved || value;
}

type Loaded =
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'ready'; response: NoteGraphResponse };

/**
 * Aba "Grafo": a visão global estilo Obsidian. Busca o grafo de menções
 * (`getNoteGraph`) e o renderiza em force-graph (canvas, performático para
 * centenas–milhares de notas). Nós = notas (cor por tipo), arestas = menções.
 * Interações: zoom/pan (da lib), hover destaca o nó e seus vizinhos, clique abre
 * a nota numa aba (ela se auto-titula). Filtro/legenda por tipo no topo. A
 * transformação resposta→`{nodes,links}` é pura e memoizada (`graph-data.ts`),
 * então o layout não recomeça a cada render — só quando os dados ou o filtro
 * mudam. Chrome (toolbar/legenda) em tokens Tailwind; o canvas é da lib.
 */
export function GraphTab() {
  const { t } = useTranslation();
  const { openTab } = useTabs();

  const [state, setState] = useState<Loaded>({ kind: 'loading' });
  const [visibleTypes, setVisibleTypes] = useState<ReadonlySet<NoteType>>(
    () => new Set(ALL_NOTE_TYPES),
  );

  useEffect(() => {
    let cancelled = false;
    setState({ kind: 'loading' });
    getNoteGraph()
      .then((response) => {
        if (!cancelled) setState({ kind: 'ready', response });
      })
      .catch(() => {
        if (!cancelled) setState({ kind: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function toggleType(type: NoteType) {
    setVisibleTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  if (state.kind === 'loading') {
    return (
      <div className="flex h-full items-center justify-center bg-bg text-fg">
        <p className="text-sm text-muted">{t('agenda.loading')}</p>
      </div>
    );
  }

  if (state.kind === 'error') {
    return (
      <div className="flex h-full items-center justify-center bg-bg text-fg">
        <EmptyState
          icon={<Network size={22} strokeWidth={1.75} />}
          title={t('graph.error')}
          className="h-full"
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-bg text-fg">
      <Toolbar visibleTypes={visibleTypes} onToggle={toggleType} />
      <GraphCanvas
        response={state.response}
        visibleTypes={visibleTypes}
        onOpenNote={(node) =>
          openTab({ kind: 'note', id: node.id, title: node.label })
        }
      />
    </div>
  );
}

/** Barra de filtro/legenda por tipo de nota — cada chip liga/desliga o tipo. */
function Toolbar({
  visibleTypes,
  onToggle,
}: {
  visibleTypes: ReadonlySet<NoteType>;
  onToggle: (type: NoteType) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-subtle px-3 py-2">
      <span className="text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-faint">
        {t('graph.legend')}
      </span>
      {ALL_NOTE_TYPES.map((type) => {
        const active = visibleTypes.has(type);
        return (
          <button
            key={type}
            type="button"
            aria-pressed={active}
            onClick={() => onToggle(type)}
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${
              active
                ? 'border-subtle bg-card text-fg'
                : 'border-transparent text-faint hover:text-muted'
            }`}
            title={t('graph.filter.toggle')}
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{
                backgroundColor: COLOR_BY_TYPE[type],
                opacity: active ? 1 : 0.4,
              }}
            />
            {t(LABEL_KEY_BY_TYPE[type])}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Wrapper do canvas: mede o container (ResizeObserver) para dar width/height
 * explícitos à lib, memoiza os dados transformados (evita re-layout) e cuida do
 * hover (destaque do nó + vizinhos) e clique (abre a nota).
 */
function GraphCanvas({
  response,
  visibleTypes,
  onOpenNote,
}: {
  response: NoteGraphResponse;
  visibleTypes: ReadonlySet<NoteType>;
  onOpenNote: (node: GraphNode) => void;
}) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef =
    useRef<ForceGraphMethods<GraphNode, { source: string; target: string }>>();
  const [size, setSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });
  const [hoverId, setHoverId] = useState<string | null>(null);

  const fallback = t('notes.untitled');

  // Transformação pura e memoizada: só refaz quando dados/filtro mudam, então a
  // lib não reinicia o layout a cada render.
  const data = useMemo(
    () => toGraphData(response, fallback, visibleTypes),
    [response, fallback, visibleTypes],
  );

  // Vizinhança (para o highlight): id → set de ids conectados, ambas direções.
  const neighbors = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const node of data.nodes) map.set(node.id, new Set());
    for (const link of data.links) {
      map.get(link.source)?.add(link.target);
      map.get(link.target)?.add(link.source);
    }
    return map;
  }, [data]);

  // Mede o container para dar dimensões explícitas ao canvas.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () =>
      setSize({ width: el.clientWidth, height: el.clientHeight });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const isHighlighted = (id: string): boolean => {
    if (!hoverId) return true;
    if (id === hoverId) return true;
    return neighbors.get(hoverId)?.has(id) ?? false;
  };

  if (data.nodes.length === 0) {
    return (
      <div
        className="flex flex-1 items-center justify-center"
        ref={containerRef}
      >
        <EmptyState
          icon={<Network size={22} strokeWidth={1.75} />}
          title={t('graph.empty')}
          body={t('graph.emptyBody')}
          className="h-full"
        />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative flex-1 overflow-hidden">
      {size.width > 0 && size.height > 0 && (
        <ForceGraph2D<GraphNode, { source: string; target: string }>
          ref={graphRef}
          width={size.width}
          height={size.height}
          graphData={data}
          backgroundColor="transparent"
          nodeRelSize={5}
          cooldownTicks={120}
          onEngineStop={() => graphRef.current?.zoomToFit(400, 40)}
          linkColor={() => resolveColorVar('--cerebro-border', containerRef)}
          linkDirectionalArrowLength={3}
          linkDirectionalArrowRelPos={1}
          onNodeHover={(node) =>
            setHoverId(node ? ((node as GraphNode).id ?? null) : null)
          }
          onNodeClick={(node) => onOpenNote(node as GraphNode)}
          nodeCanvasObject={(node, ctx, globalScale) => {
            const root = containerRef.current;
            if (!root) return;
            const n = node as NodeObject<GraphNode>;
            const id = n.id ?? '';
            const highlighted = isHighlighted(id);
            const color = resolveColor(COLOR_BY_TYPE[n.type], root);
            const r = 5;
            ctx.globalAlpha = highlighted ? 1 : 0.2;

            ctx.beginPath();
            ctx.arc(n.x ?? 0, n.y ?? 0, r, 0, 2 * Math.PI);
            ctx.fillStyle = color;
            ctx.fill();

            // Rótulo: só quando há zoom suficiente ou o nó está em destaque,
            // para não poluir o grafo inteiro.
            if (globalScale > 1.2 || id === hoverId) {
              const fontSize = Math.max(10 / globalScale, 2);
              ctx.font = `${fontSize}px sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'top';
              ctx.fillStyle = resolveColor('var(--cerebro-muted)', root);
              ctx.fillText(n.label, n.x ?? 0, (n.y ?? 0) + r + 1);
            }
            ctx.globalAlpha = 1;
          }}
        />
      )}
    </div>
  );
}

/** Resolve um token CSS via o container ref (ajuda para as cores da lib). */
function resolveColorVar(
  token: string,
  ref: React.RefObject<HTMLElement>,
): string {
  const el = ref.current;
  if (!el) return 'rgba(0,0,0,0.1)';
  return resolveColor(`var(${token})`, el) || 'rgba(0,0,0,0.1)';
}
