import { createStore, useStore } from 'zustand';
import { createContext, useContext } from 'react';
import { TableTab } from '../types/session';

interface WorkspaceState {
  tabs: TableTab[];
  activeTabId: string | null;
  mruTabIds: string[];
  showTabSwitcher: boolean;
  switcherIndex: number;

  // Actions
  setActiveTabId: (id: string | null) => void;
  setShowTabSwitcher: (show: boolean) => void;
  setSwitcherIndex: (index: number | ((prev: number) => number)) => void;
  openTable: (schema: string, name: string) => TableTab;
  openQuery: () => TableTab;
  openStructure: (schema?: string, name?: string, mode?: 'create' | 'edit') => TableTab;
  closeTab: (id: string) => void;
  updateTab: (id: string, updates: Partial<TableTab>) => void;
  closeOthers: (id: string) => void;
  closeToRight: (id: string) => void;
  closeAll: () => void;
}

type WorkspaceStore = ReturnType<typeof createWorkspaceStore>;

export const createWorkspaceStore = () => {
  return createStore<WorkspaceState>((set, get) => ({
    tabs: [],
    activeTabId: null,
    mruTabIds: [],
    showTabSwitcher: false,
    switcherIndex: 0,

    setActiveTabId: (id) =>
      set((state) => {
        if (id && id !== state.activeTabId && !state.showTabSwitcher) {
          const filtered = state.mruTabIds.filter(
            (mruId) => mruId !== id && state.tabs.some((t) => t.id === mruId)
          );
          return { activeTabId: id, mruTabIds: [id, ...filtered] };
        }
        return { activeTabId: id };
      }),

    setShowTabSwitcher: (show) => set({ showTabSwitcher: show }),

    setSwitcherIndex: (index) =>
      set((state) => ({
        switcherIndex: typeof index === 'function' ? index(state.switcherIndex) : index,
      })),

    openTable: (schema, name) => {
      const state = get();
      const existingTab = state.tabs.find(
        (t) => t.type === 'table' && t.schema === schema && t.name === name
      );
      if (existingTab) {
        get().setActiveTabId(existingTab.id);
        return existingTab;
      }

      const tabId = crypto.randomUUID();
      const newTab: TableTab = {
        id: tabId,
        type: 'table',
        schema,
        name,
        pk: null,
        page: 1,
        pageSize: 100,
        totalRows: 0,
        results: null,
        structure: [],
        query: `SELECT * FROM "${schema}"."${name}"`,
        filters: [{ id: crypto.randomUUID(), column: '', operator: '=', value: '', enabled: true }],
      };

      set((state) => ({ tabs: [...state.tabs, newTab] }));
      get().setActiveTabId(tabId);
      return newTab;
    },

    openQuery: () => {
      const tabId = crypto.randomUUID();
      const newTab: TableTab = {
        id: tabId,
        type: 'query',
        name: 'New Query',
        results: null,
        query: 'SELECT * FROM ',
      };
      set((state) => ({ tabs: [...state.tabs, newTab] }));
      get().setActiveTabId(tabId);
      return newTab;
    },

    openStructure: (schema?, name?, mode = 'edit') => {
      const state = get();
      if (mode === 'edit' && schema && name) {
        const existingTab = state.tabs.find(
          (t) => t.type === 'structure' && t.initialSchema === schema && t.initialTableName === name
        );
        if (existingTab) {
          get().setActiveTabId(existingTab.id);
          return existingTab;
        }
      }

      const tabId = crypto.randomUUID();
      const newTab: TableTab = {
        id: tabId,
        type: 'structure',
        name: mode === 'create' ? 'New Table' : `Structure: ${name}`,
        mode,
        initialSchema: schema,
        initialTableName: name,
        results: null,
        query: '',
      };
      set((state) => ({ tabs: [...state.tabs, newTab] }));
      get().setActiveTabId(tabId);
      return newTab;
    },

    closeTab: (tabId) => {
      set((state) => {
        const newTabs = state.tabs.filter((t) => t.id !== tabId);
        let nextActiveId = state.activeTabId;

        if (state.activeTabId === tabId) {
          const nextMruId = state.mruTabIds.find(
            (id) => id !== tabId && newTabs.some((t) => t.id === id)
          );
          nextActiveId = nextMruId || (newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null);
        }

        const newMru = state.mruTabIds.filter(
          (id) => id !== tabId && newTabs.some((t) => t.id === id)
        );
        return { tabs: newTabs, activeTabId: nextActiveId, mruTabIds: newMru };
      });
    },

    updateTab: (tabId, updates) => {
      set((state) => ({
        tabs: state.tabs.map((t) => (t.id === tabId ? { ...t, ...updates } : t)),
      }));
    },

    closeOthers: (tabId) => {
      set((state) => {
        const remaining = state.tabs.filter((t) => t.id === tabId);
        return {
          tabs: remaining,
          activeTabId: tabId,
          mruTabIds: state.mruTabIds.filter((id) => id === tabId),
        };
      });
    },

    closeToRight: (tabId) => {
      set((state) => {
        const idx = state.tabs.findIndex((t) => t.id === tabId);
        if (idx === -1) return state;
        const remaining = state.tabs.slice(0, idx + 1);
        const newActive = remaining.some((t) => t.id === state.activeTabId)
          ? state.activeTabId
          : tabId;
        return {
          tabs: remaining,
          activeTabId: newActive,
          mruTabIds: state.mruTabIds.filter((id) => remaining.some((t) => t.id === id)),
        };
      });
    },

    closeAll: () => set({ tabs: [], activeTabId: null, mruTabIds: [] }),
  }));
};

export const WorkspaceContext = createContext<WorkspaceStore | null>(null);

export const useWorkspaceStore = <T>(selector: (state: WorkspaceState) => T): T => {
  const store = useContext(WorkspaceContext);
  if (!store) throw new Error('Missing WorkspaceContext.Provider in the tree');
  return useStore(store, selector);
};

export const useWorkspaceActions = () => {
  const store = useContext(WorkspaceContext);
  if (!store) throw new Error('Missing WorkspaceContext.Provider in the tree');
  return store.getState();
};
