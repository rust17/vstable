import { ConnectionConfig, QueryResult } from '../types/session'

/**
 * API Client Layer
 * Encapsulates all IPC calls to window.api for easier mocking and testing.
 */

export const apiClient = {
  connect: async (id: string, config: ConnectionConfig): Promise<QueryResult> => {
    return window.api.connect(id, config)
  },

  disconnect: async (id: string): Promise<void> => {
    return window.api.disconnect(id)
  },

  query: async (id: string, sql: string, params?: any[]): Promise<QueryResult> => {
    return window.api.query(id, sql, params)
  },

  saveConnection: async (config: ConnectionConfig): Promise<void> => {
    return window.api.saveConnection(config)
  },

  toggleMaximize: (): void => {
    window.api.toggleMaximize()
  }
}
