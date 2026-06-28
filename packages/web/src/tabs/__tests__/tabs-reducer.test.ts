import { describe, expect, it } from 'vitest';

import {
  canGoBack,
  canGoForward,
  currentDescriptor,
  initialTabsState,
  type TabDescriptor,
  tabsReducer,
  type TabsState,
} from '../tabs-reducer.js';

function desc(
  kind: TabDescriptor['kind'],
  id: string,
  title = id,
): TabDescriptor {
  return { kind, id, title };
}

/** Abre uma sequência de abas, atribuindo tabIds determinísticos. */
function openMany(start: TabsState, descriptors: TabDescriptor[]): TabsState {
  return descriptors.reduce(
    (state, d, i) =>
      tabsReducer(state, { type: 'open', descriptor: d, tabId: `tab-${i}` }),
    start,
  );
}

describe('tabsReducer — open', () => {
  it('appends a new tab and focuses it', () => {
    const s = tabsReducer(initialTabsState, {
      type: 'open',
      descriptor: desc('today', 'today', 'Hoje'),
      tabId: 'tab-0',
    });
    expect(s.tabs).toHaveLength(1);
    expect(s.activeTabId).toBe('tab-0');
    expect(currentDescriptor(s.tabs[0]!).kind).toBe('today');
  });

  it('dedupes by kind+id: re-opening focuses the existing tab instead of duplicating', () => {
    let s = openMany(initialTabsState, [
      desc('today', 'today'),
      desc('note', 'n1'),
    ]);
    s = tabsReducer(s, { type: 'setActive', tabId: 'tab-0' });
    expect(s.activeTabId).toBe('tab-0');

    // Reabrir a nota já aberta deve apenas focá-la, sem criar outra aba.
    s = tabsReducer(s, {
      type: 'open',
      descriptor: desc('note', 'n1'),
      tabId: 'tab-99',
    });
    expect(s.tabs).toHaveLength(2);
    expect(s.activeTabId).toBe('tab-1');
  });

  it('treats same kind but different id as distinct tabs', () => {
    const s = openMany(initialTabsState, [
      desc('note', 'n1'),
      desc('note', 'n2'),
    ]);
    expect(s.tabs).toHaveLength(2);
  });
});

describe('tabsReducer — rename', () => {
  it('renames the current descriptor title of the given tab', () => {
    let s = openMany(initialTabsState, [desc('note', 'n1', 'sem título')]);
    s = tabsReducer(s, { type: 'rename', tabId: 'tab-0', title: 'Minha nota' });
    expect(currentDescriptor(s.tabs[0]!).title).toBe('Minha nota');
  });

  it('renaming with the same title is a no-op (same state reference)', () => {
    const s = openMany(initialTabsState, [desc('note', 'n1', 'Igual')]);
    const after = tabsReducer(s, {
      type: 'rename',
      tabId: 'tab-0',
      title: 'Igual',
    });
    expect(after).toBe(s);
  });

  it('ignores renaming an unknown tab', () => {
    const s = openMany(initialTabsState, [desc('note', 'n1')]);
    expect(tabsReducer(s, { type: 'rename', tabId: 'nope', title: 'x' })).toBe(
      s,
    );
  });

  it('renames only the active history entry, not past ones', () => {
    let s = openMany(initialTabsState, [desc('note', 'n1', 'Nota 1')]);
    s = tabsReducer(s, {
      type: 'navigate',
      descriptor: desc('note', 'n2', 'Nota 2'),
    });
    s = tabsReducer(s, { type: 'rename', tabId: 'tab-0', title: 'Renomeada' });
    expect(s.tabs[0]!.history.map((d) => d.title)).toEqual([
      'Nota 1',
      'Renomeada',
    ]);
  });
});

describe('tabsReducer — close', () => {
  it('closing a non-active tab keeps the active one', () => {
    let s = openMany(initialTabsState, [
      desc('today', 'today'),
      desc('note', 'n1'),
    ]);
    // ativa = tab-1 (a última aberta)
    expect(s.activeTabId).toBe('tab-1');
    s = tabsReducer(s, { type: 'close', tabId: 'tab-0' });
    expect(s.tabs).toHaveLength(1);
    expect(s.activeTabId).toBe('tab-1');
  });

  it('closing the active tab activates the left neighbor', () => {
    let s = openMany(initialTabsState, [
      desc('today', 'today'),
      desc('note', 'n1'),
      desc('note', 'n2'),
    ]);
    s = tabsReducer(s, { type: 'setActive', tabId: 'tab-1' });
    s = tabsReducer(s, { type: 'close', tabId: 'tab-1' });
    expect(s.activeTabId).toBe('tab-0'); // vizinho da esquerda
  });

  it('closing the first (active) tab activates the right neighbor', () => {
    let s = openMany(initialTabsState, [
      desc('today', 'today'),
      desc('note', 'n1'),
    ]);
    s = tabsReducer(s, { type: 'setActive', tabId: 'tab-0' });
    s = tabsReducer(s, { type: 'close', tabId: 'tab-0' });
    expect(s.activeTabId).toBe('tab-1'); // não há esquerda, pega a direita
  });

  it('closing the last remaining tab clears the active tab', () => {
    let s = openMany(initialTabsState, [desc('today', 'today')]);
    s = tabsReducer(s, { type: 'close', tabId: 'tab-0' });
    expect(s.tabs).toHaveLength(0);
    expect(s.activeTabId).toBeNull();
  });

  it('ignores closing an unknown tab', () => {
    const s = openMany(initialTabsState, [desc('today', 'today')]);
    const after = tabsReducer(s, { type: 'close', tabId: 'nope' });
    expect(after).toEqual(s);
  });
});

describe('tabsReducer — per-tab history (navigate / back / forward)', () => {
  it('navigate pushes onto the active tab and moves the index forward', () => {
    let s = openMany(initialTabsState, [desc('note', 'n1', 'Nota 1')]);
    s = tabsReducer(s, {
      type: 'navigate',
      descriptor: desc('note', 'n2', 'Nota 2'),
    });
    const tab = s.tabs[0]!;
    expect(currentDescriptor(tab).id).toBe('n2');
    expect(canGoBack(tab)).toBe(true);
    expect(canGoForward(tab)).toBe(false);
  });

  it('back and forward traverse the active tab history', () => {
    let s = openMany(initialTabsState, [desc('note', 'n1')]);
    s = tabsReducer(s, { type: 'navigate', descriptor: desc('note', 'n2') });
    s = tabsReducer(s, { type: 'navigate', descriptor: desc('note', 'n3') });

    s = tabsReducer(s, { type: 'back' });
    expect(currentDescriptor(s.tabs[0]!).id).toBe('n2');
    s = tabsReducer(s, { type: 'back' });
    expect(currentDescriptor(s.tabs[0]!).id).toBe('n1');
    expect(canGoBack(s.tabs[0]!)).toBe(false);

    s = tabsReducer(s, { type: 'forward' });
    expect(currentDescriptor(s.tabs[0]!).id).toBe('n2');
  });

  it('navigating after going back truncates the forward history', () => {
    let s = openMany(initialTabsState, [desc('note', 'n1')]);
    s = tabsReducer(s, { type: 'navigate', descriptor: desc('note', 'n2') });
    s = tabsReducer(s, { type: 'navigate', descriptor: desc('note', 'n3') });
    s = tabsReducer(s, { type: 'back' }); // volta a n2
    s = tabsReducer(s, { type: 'navigate', descriptor: desc('note', 'n4') });

    const tab = s.tabs[0]!;
    expect(currentDescriptor(tab).id).toBe('n4');
    expect(canGoForward(tab)).toBe(false); // n3 foi descartado
    expect(tab.history.map((d) => d.id)).toEqual(['n1', 'n2', 'n4']);
  });

  it('history is per-tab: navigating one tab does not affect another', () => {
    let s = openMany(initialTabsState, [
      desc('note', 'n1'),
      desc('note', 'm1'),
    ]);
    // ativa = tab-1 (m1). Navega só nela.
    s = tabsReducer(s, { type: 'navigate', descriptor: desc('note', 'm2') });
    expect(currentDescriptor(s.tabs[0]!).id).toBe('n1'); // intacta
    expect(currentDescriptor(s.tabs[1]!).id).toBe('m2');
  });

  it('navigating to the descriptor already active is a no-op (no duplicate history)', () => {
    let s = openMany(initialTabsState, [desc('note', 'n1')]);
    s = tabsReducer(s, { type: 'navigate', descriptor: desc('note', 'n2') });
    const before = s;
    // Renavegar para n2 (já ativo) não deve empurrar nada nem mexer no índice.
    s = tabsReducer(s, { type: 'navigate', descriptor: desc('note', 'n2') });
    expect(s).toEqual(before);
    expect(s.tabs[0]!.history.map((d) => d.id)).toEqual(['n1', 'n2']);
  });

  it('back/forward at the ends are no-ops', () => {
    let s = openMany(initialTabsState, [desc('note', 'n1')]);
    const beforeBack = s;
    s = tabsReducer(s, { type: 'back' });
    expect(s).toEqual(beforeBack);
    s = tabsReducer(s, { type: 'forward' });
    expect(s).toEqual(beforeBack);
  });

  it('back/forward/navigate with no active tab are no-ops', () => {
    const empty = initialTabsState;
    expect(tabsReducer(empty, { type: 'back' })).toEqual(empty);
    expect(tabsReducer(empty, { type: 'forward' })).toEqual(empty);
    expect(
      tabsReducer(empty, { type: 'navigate', descriptor: desc('note', 'x') }),
    ).toEqual(empty);
  });
});
