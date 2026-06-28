import type { NoteGraphResponse, NoteType } from '@cerebro/shared';

/**
 * Transformação pura da resposta do grafo (`getNoteGraph`) para a forma que a lib
 * de force-graph consome (`{ nodes, links }`), mais a lógica de filtro por tipo.
 * Fica fora do componente para ser testável sem montar o canvas (política de testes:
 * a transformação é testada; o render da lib não é).
 */

/** Nó já no formato da lib: id + rótulo exibível + tipo (para colorir). */
export interface GraphNode {
  id: string;
  /** Título exibível (já com fallback aplicado). */
  label: string;
  type: NoteType;
}

/** Aresta no formato da lib: origem → destino por id. */
export interface GraphLink {
  source: string;
  target: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

/** Conjunto dos tipos de nota visíveis (filtro). Vazio = nenhum tipo. */
export type TypeFilter = ReadonlySet<NoteType>;

/** Todos os tipos de nota — usado como default ("mostrar tudo"). */
export const ALL_NOTE_TYPES: readonly NoteType[] = [
  'DEVOTIONAL',
  'REFLECTION',
  'STUDY_NOTE',
  'NOTE',
];

/**
 * Converte a resposta do grafo no `{ nodes, links }` da lib, opcionalmente
 * filtrando por tipo. Ao remover um nó (tipo desligado no filtro), também
 * descartamos qualquer aresta pendente que toque um nó ausente — assim a lib
 * nunca recebe link apontando para nó inexistente. O `fallback` cobre notas
 * ainda sem título (1ª linha vazia no backend).
 */
export function toGraphData(
  response: NoteGraphResponse,
  fallback: string,
  filter?: TypeFilter,
): GraphData {
  const nodes: GraphNode[] = [];
  const keptIds = new Set<string>();

  for (const node of response.nodes) {
    if (filter && !filter.has(node.type)) continue;
    const title = node.title.trim();
    nodes.push({
      id: node.id,
      label: title.length > 0 ? title : fallback,
      type: node.type,
    });
    keptIds.add(node.id);
  }

  const links: GraphLink[] = [];
  for (const edge of response.edges) {
    // Descarta arestas penduradas: ambos os extremos precisam sobreviver ao filtro.
    if (!keptIds.has(edge.from) || !keptIds.has(edge.to)) continue;
    links.push({ source: edge.from, target: edge.to });
  }

  return { nodes, links };
}
