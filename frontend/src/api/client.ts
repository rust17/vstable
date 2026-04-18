import { invoke } from '@tauri-apps/api/core';
import { LazyStore } from '@tauri-apps/plugin-store';
import type { ConnectionConfig, PersistedWorkspace, QueryResult } from '../types/session';
import type { DiffRequest } from '../types/vstable';
import { grpcClient } from './grpcClient';

/**
 * API Client Layer
 * Encapsulates gRPC-Web calls to Go engine and IPC calls to Tauri Store/Native.
 */

const store = new LazyStore('settings.json');

export const apiClient = {
  // Database Operations via gRPC-Web
  connect: async (id: string, config: ConnectionConfig): Promise<QueryResult> => {
    const { dialect, user, password, host, port, database } = config;
    let dsn = '';
    if (dialect === 'mysql') {
      dsn = `${user}:${password}@tcp(${host}:${port})/${database}?parseTime=true`;
    } else {
      dsn = `postgres://${user}:${password}@${host}:${port}/${database}?sslmode=disable`;
    }
    await grpcClient.dbConnect({ id, dialect, dsn });
    return { success: true };
  },

  query: async (id: string, sql: string, params?: any[]): Promise<QueryResult> => {
    const res = await grpcClient.query({ id, sql, params });
    return {
      success: res.success || false,
      rows: res.rows || [],
      fields: res.fields as { name: string; type: string }[] | undefined,
    };
  },

  disconnect: async (id: string): Promise<void> => {
    await grpcClient.disconnect({ id });
  },

  enginePing: async (): Promise<boolean> => {
    try {
      const res = await grpcClient.ping({});
      return res.status === 'ok';
    } catch {
      return false;
    }
  },

  generateAlterSql: async (req: DiffRequest): Promise<string[]> => {
    const res = await grpcClient.generateAlterTable(req);
    return res.sqls || [];
  },

  generateCreateSql: async (req: DiffRequest): Promise<string[]> => {
    const res = await grpcClient.generateCreateTable(req);
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
    const ws = await store.get<PersistedWorkspace>('workspace');
    return ws ?? null;
  },

  saveWorkspace: async (data: PersistedWorkspace): Promise<void> => {
    await store.set('workspace', data);
    await store.save();
  },
};
