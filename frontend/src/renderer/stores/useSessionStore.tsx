import type React from 'react';
import { createContext, type ReactNode, useContext, useRef } from 'react';
import { createStore, useStore } from 'zustand';
import { apiClient } from '../api/client';
import type { Capabilities, ConnectionConfig, QueryResult } from '../types/session';

const getInitialCapabilities = (dialect: string): Capabilities => {
  if (dialect === 'mysql') {
    return {
      dialect: 'mysql',
      quoteChar: '`',
      supportsSchemas: false,
      typeGroups: [
        {
          label: 'Numeric',
          types: ['int', 'bigint', 'smallint', 'tinyint', 'decimal', 'float', 'double'],
        },
        {
          label: 'String',
          types: ['varchar', 'char', 'text', 'mediumtext', 'longtext', 'tinytext'],
        },
        { label: 'Date/Time', types: ['datetime', 'timestamp', 'date', 'time', 'year'] },
        { label: 'Binary/Other', types: ['blob', 'binary', 'varbinary', 'json', 'enum', 'set'] },
      ],
      queryTemplates: {
        listDatabases: 'SHOW DATABASES;',
        listTables: 'SHOW TABLES FROM `{{db}}`;',
        listColumns:
          "SELECT column_name, data_type, column_default, is_nullable, column_comment as comment FROM information_schema.columns WHERE table_schema = '{{db}}' AND table_name = '{{table}}' ORDER BY ordinal_position;",
        listIndexes: 'SHOW INDEX FROM `{{table}}` FROM `{{db}}`;',
        getPrimaryKey:
          "SELECT column_name FROM information_schema.columns WHERE table_schema = '{{db}}' AND table_name = '{{table}}' AND column_key = 'PRI';",
      },
    };
  }
  // Default to Postgres
  return {
    dialect: 'postgres',
    quoteChar: '"',
    supportsSchemas: true,
    typeGroups: [
      {
        label: 'Numeric',
        types: [
          'integer',
          'bigint',
          'smallint',
          'numeric',
          'real',
          'double precision',
          'serial',
          'bigserial',
        ],
      },
      { label: 'String', types: ['varchar', 'char', 'text', 'uuid'] },
      {
        label: 'Date/Time',
        types: ['timestamp', 'timestamp with time zone', 'date', 'time', 'interval'],
      },
      { label: 'Other', types: ['boolean', 'json', 'jsonb', 'bytea', 'enum'] },
    ],
    queryTemplates: {
      listDatabases:
        'SELECT datname as database_name FROM pg_database WHERE datistemplate = false;',
      listSchemas:
        "SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('information_schema', 'pg_catalog');",
      listTables:
        "SELECT table_name FROM information_schema.tables WHERE table_schema = '{{schema}}' AND table_type = 'BASE TABLE';",
      listColumns:
        "SELECT c.column_name, c.data_type, c.column_default, c.is_nullable, d.description as comment FROM information_schema.columns c LEFT JOIN pg_catalog.pg_stat_all_tables st ON c.table_schema = st.schemaname AND c.table_name = st.relname LEFT JOIN pg_catalog.pg_description d ON st.relid = d.objoid AND c.ordinal_position = d.objsubid WHERE c.table_schema = '{{schema}}' AND c.table_name = '{{table}}' ORDER BY c.ordinal_position;",
      listIndexes:
        "SELECT indexname as index_name FROM pg_indexes WHERE schemaname = '{{schema}}' AND tablename = '{{table}}';",
      getPrimaryKey:
        "SELECT kcu.column_name FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = '{{schema}}' AND tc.table_name = '{{table}}';",
    },
  };
};

export interface SessionState {
  sessionId: string;
  isConnected: boolean;
  config: ConnectionConfig;
  capabilities: Capabilities | null;
  loading: boolean;
  error: string | null;

  // Actions
  connect: (config: ConnectionConfig) => Promise<QueryResult>;
  disconnect: () => Promise<void>;
  query: (sql: string, params?: any[]) => Promise<QueryResult>;
  buildQuery: (
    templateKey: keyof Capabilities['queryTemplates'],
    vars: Record<string, string>
  ) => string;
  updateTitle: (title: string) => void;
  setError: (error: string | null) => void;
  setConfig: (config: ConnectionConfig) => void;
}

export type SessionStore = ReturnType<typeof createSessionStore>;

export const SessionContext = createContext<SessionStore | null>(null);

export const createSessionStore = (id: string, onUpdateTitle: (title: string) => void) => {
  return createStore<SessionState>((set, get) => ({
    sessionId: id,
    isConnected: false,
    config: {
      dialect: 'postgres',
      host: 'localhost',
      port: 5432,
      user: 'postgres',
      database: 'postgres',
    },
    capabilities: getInitialCapabilities('postgres'),
    loading: false,
    error: null,

    connect: async (newConfig: ConnectionConfig) => {
      set({ loading: true, error: null });

      // Generate ID if missing so it is reliably matched during workspace restore
      if (!newConfig.id) {
        newConfig.id = crypto.randomUUID();
      }

      try {
        const result = await apiClient.connect(id, newConfig);
        if (result.success) {
          set({
            isConnected: true,
            config: newConfig,
            capabilities:
              result.capabilities || getInitialCapabilities(newConfig.dialect || 'postgres'),
          });
          await apiClient.saveConnection(newConfig);
          if (onUpdateTitle) {
            onUpdateTitle(newConfig.database || newConfig.host);
          }
        } else {
          set({ error: result.error || 'Connection failed' });
        }
        return result as QueryResult;
      } catch (err: any) {
        set({ error: err.message });
        return { success: false, error: err.message } as QueryResult;
      } finally {
        set({ loading: false });
      }
    },

    disconnect: async () => {
      try {
        await apiClient.disconnect(id);
        set((state) => ({
          isConnected: false,
          capabilities: getInitialCapabilities(state.config.dialect || 'postgres'),
        }));
      } catch (e) {
        console.error('Disconnect failed', e);
      }
    },

    query: async (sql: string, params?: any[]) => {
      try {
        return await apiClient.query(id, sql, params);
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },

    buildQuery: (
      templateKey: keyof Capabilities['queryTemplates'],
      vars: Record<string, string>
    ) => {
      const { capabilities } = get();
      if (!capabilities) return '';
      let sql = capabilities.queryTemplates[templateKey] || '';
      Object.entries(vars).forEach(([k, v]) => {
        sql = sql.replace(new RegExp(`{{${k}}}`, 'g'), v);
      });
      return sql;
    },

    updateTitle: onUpdateTitle,
    setError: (error) => set({ error }),
    setConfig: (config) => set({ config }),
  }));
};

interface SessionProviderProps {
  id: string;
  onUpdateTitle: (title: string) => void;
  children: ReactNode;
}

export const SessionProvider: React.FC<SessionProviderProps> = ({
  id,
  onUpdateTitle,
  children,
}) => {
  const storeRef = useRef<SessionStore>(null);
  if (!storeRef.current) {
    storeRef.current = createSessionStore(id, onUpdateTitle);
  }

  return <SessionContext.Provider value={storeRef.current}>{children}</SessionContext.Provider>;
};

export function useSession(): SessionState;
export function useSession<T>(selector: (state: SessionState) => T): T;
export function useSession<T>(selector?: (state: SessionState) => T): T | SessionState {
  const store = useContext(SessionContext);
  if (!store) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return useStore(store, selector ? selector : (state) => state);
}
