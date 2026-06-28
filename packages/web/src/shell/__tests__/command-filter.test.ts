import { describe, expect, it } from 'vitest';

import { filterCommands } from '../command-filter.js';

const items = [
  { id: 'a', label: 'Abrir Hoje' },
  { id: 'b', label: 'Buscar' },
  { id: 'c', label: 'Captura rápida' },
  { id: 'd', label: 'Abrir Calendário' },
];

describe('filterCommands', () => {
  it('devolve todos os itens quando a query é vazia', () => {
    expect(filterCommands(items, '')).toEqual(items);
  });

  it('devolve todos os itens quando a query é só espaços', () => {
    expect(filterCommands(items, '   ')).toEqual(items);
  });

  it('casa por substring de forma case-insensitive', () => {
    const result = filterCommands(items, 'abrir');
    expect(result.map((i) => i.id)).toEqual(['a', 'd']);
  });

  it('casa no meio do label, não só no começo', () => {
    const result = filterCommands(items, 'rápida');
    expect(result.map((i) => i.id)).toEqual(['c']);
  });

  it('devolve lista vazia quando nada casa', () => {
    expect(filterCommands(items, 'zzz')).toEqual([]);
  });

  it('ranqueia matches mais cedo no label primeiro', () => {
    const list = [
      { id: '1', label: 'Tema escuro' }, // "es" no meio
      { id: '2', label: 'Escrever nota' }, // "es" no começo
    ];
    const result = filterCommands(list, 'es');
    expect(result.map((i) => i.id)).toEqual(['2', '1']);
  });

  it('mantém a ordem original em empate de posição (sort estável)', () => {
    const list = [
      { id: '1', label: 'Abrir A' },
      { id: '2', label: 'Abrir B' },
    ];
    const result = filterCommands(list, 'abrir');
    expect(result.map((i) => i.id)).toEqual(['1', '2']);
  });

  it('não muta o array de entrada', () => {
    const list = [
      { id: '1', label: 'Z' },
      { id: '2', label: 'A' },
    ];
    const copy = [...list];
    filterCommands(list, '');
    expect(list).toEqual(copy);
  });
});
