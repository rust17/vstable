import { invoke } from '@tauri-apps/api/core';
import { LazyStore } from '@tauri-apps/plugin-store';
import type { ConnectionConfig, PersistedWorkspace, QueryResult } from '../types/session';

/**
 * API Client Layer (Tauri Version)
 * Encapsulates all IPC calls to Tauri invoke and Store.
 */

const store = new LazyStore('settings.json');

export const apiClient = {
  // Database Operations
  connect: async (id: string, config: ConnectionConfig): Promise<QueryResult> => {
    const { dialect, user, password, host, port, database } = config;
    let dsn = '';
    if (dialect === 'mysql') {
      dsn = `${user}:${password}@tcp(${host}:${port})/${database}?parseTime=true`;
    } else {
      dsn = `postgres://${user}:${password}@${host}:${port}/${database}?sslmode=disable`;
    }
    return invoke('db_connect', { id, dialect, dsn });
  },

  query: async (id: string, sql: string, params?: any[]): Promise<QueryResult> =>
    invoke('db_query', { id, sql, params }),

  disconnect: async (id: string): Promise<void> => invoke('db_disconnect', { id }),

  enginePing: async (): Promise<boolean> => invoke('engine_ping'),

  generateAlterSql: async (req: any): Promise<string[]> => {
    const res: any = await invoke('sql_generate_alter', { req });
    return res.sqls || [];
  },

  generateCreateSql: async (req: any): Promise<string[]> => {
    const res: any = await invoke('sql_generate_create', { req });
    return res.sqls || [];
  },

  toggleMaximize: async (): Promise<void> => invoke('window_toggle_maximize'),

  // Store Operations (Using tauri-plugin-store)
  getSavedConnections: async (): Promise<ConnectionConfig[]> => {
    const connections = await store.get<ConnectionConfig[]>('connections');
    return connections || [];
  },

  saveConnection: async (config: ConnectionConfig): Promise<void> => {
    const connections = await apiClient.getSavedConnections();
    const index = connections.findIndex((c) => c.id === config.id);
    if (index >= 0) {
      connections[index] = config;
    } else {
      connections.push(config);
    }
    await store.set('connections', connections);
    await store.save();
  },

  deleteConnection: async (id: string): Promise<void> => {
    const connections = await apiClient.getSavedConnections();
    const filtered = connections.filter((c) => c.id !== id);
    await store.set('connections', filtered);
    await store.save();
  },

  getWorkspace: async (): Promise<PersistedWorkspace | null> => {
    return store.get<PersistedWorkspace>('workspace');
  },

  saveWorkspace: async (data: PersistedWorkspace): Promise<void> => {
    await store.set('workspace', data);
    await store.save();
  },
};
