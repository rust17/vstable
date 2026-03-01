import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react'
import { ConnectionConfig, QueryResult, Capabilities } from '../types/session'

interface SessionContextType {
  sessionId: string
  isConnected: boolean
  config: ConnectionConfig
  capabilities: Capabilities | null
  loading: boolean
  error: string | null

  // Actions
  connect: (config: ConnectionConfig) => Promise<QueryResult>
  disconnect: () => Promise<void>
  query: (sql: string, params?: any[]) => Promise<QueryResult>
  buildQuery: (templateKey: keyof Capabilities['queryTemplates'], vars: Record<string, string>) => string
  updateTitle: (title: string) => void
  setError: (error: string | null) => void
  setConfig: (config: ConnectionConfig) => void
}

const SessionContext = createContext<SessionContextType | undefined>(undefined)

interface SessionProviderProps {
  id: string
  onUpdateTitle: (title: string) => void
  children: ReactNode
}

const getInitialCapabilities = (dialect: string): Capabilities => {
  if (dialect === 'mysql') {
    return {
      dialect: 'mysql',
      quoteChar: '`',
      supportsSchemas: false,
      typeGroups: [
        { label: 'Numeric', types: ['int', 'bigint', 'smallint', 'tinyint', 'decimal', 'float', 'double'] },
        { label: 'String', types: ['varchar', 'char', 'text', 'mediumtext', 'longtext', 'tinytext'] },
        { label: 'Date/Time', types: ['datetime', 'timestamp', 'date', 'time', 'year'] },
        { label: 'Binary/Other', types: ['blob', 'binary', 'varbinary', 'json', 'enum', 'set'] }
      ],
      queryTemplates: {
        listDatabases: 'SHOW DATABASES;',
        listTables: 'SHOW TABLES FROM `{{db}}`;',
        listColumns: 'SELECT column_name, data_type, column_default, is_nullable, column_comment as comment FROM information_schema.columns WHERE table_schema = \'{{db}}\' AND table_name = \'{{table}}\' ORDER BY ordinal_position;',
        listIndexes: 'SHOW INDEX FROM `{{table}}` FROM `{{db}}`;',
        getPrimaryKey: 'SELECT column_name FROM information_schema.columns WHERE table_schema = \'{{db}}\' AND table_name = \'{{table}}\' AND column_key = \'PRI\';'
      }
    }
  }
  // Default to Postgres
  return {
    dialect: 'postgres',
    quoteChar: '"',
    supportsSchemas: true,
    typeGroups: [
      { label: 'Numeric', types: ['integer', 'bigint', 'smallint', 'numeric', 'real', 'double precision', 'serial', 'bigserial'] },
      { label: 'String', types: ['varchar', 'char', 'text', 'uuid'] },
      { label: 'Date/Time', types: ['timestamp', 'timestamp with time zone', 'date', 'time', 'interval'] },
      { label: 'Other', types: ['boolean', 'json', 'jsonb', 'bytea', 'enum'] }
    ],
    queryTemplates: {
      listDatabases: 'SELECT datname as database_name FROM pg_database WHERE datistemplate = false;',
      listSchemas: 'SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN (\'information_schema\', \'pg_catalog\');',
      listTables: 'SELECT table_name FROM information_schema.tables WHERE table_schema = \'{{schema}}\' AND table_type = \'BASE TABLE\';',
      listColumns: 'SELECT c.column_name, c.data_type, c.column_default, c.is_nullable, d.description as comment FROM information_schema.columns c LEFT JOIN pg_catalog.pg_stat_all_tables st ON c.table_schema = st.schemaname AND c.table_name = st.relname LEFT JOIN pg_catalog.pg_description d ON st.relid = d.objoid AND c.ordinal_position = d.objsubid WHERE c.table_schema = \'{{schema}}\' AND c.table_name = \'{{table}}\' ORDER BY c.ordinal_position;',
      listIndexes: 'SELECT indexname as index_name FROM pg_indexes WHERE schemaname = \'{{schema}}\' AND tablename = \'{{table}}\';',
      getPrimaryKey: 'SELECT kcu.column_name FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name WHERE tc.constraint_type = \'PRIMARY KEY\' AND tc.table_schema = \'{{schema}}\' AND tc.table_name = \'{{table}}\';'
    }
  }
}

export const SessionProvider: React.FC<SessionProviderProps> = ({ id, onUpdateTitle, children }) => {
  const [isConnected, setIsConnected] = useState(false)
  const [config, setConfig] = useState<ConnectionConfig>({
    dialect: 'postgres',
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    database: 'postgres'
  })
  const [capabilities, setCapabilities] = useState<Capabilities | null>(getInitialCapabilities('postgres'))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const buildQuery = useCallback((templateKey: keyof Capabilities['queryTemplates'], vars: Record<string, string>): string => {
    if (!capabilities) return ''
    let sql = capabilities.queryTemplates[templateKey] || ''
    Object.entries(vars).forEach(([k, v]) => {
      sql = sql.replace(new RegExp(`{{${k}}}`, 'g'), v)
    })
    return sql
  }, [capabilities])

  const connect = async (newConfig: ConnectionConfig) => {
    setLoading(true)
    setError(null)
    try {
      const result = await (window as any).api.connect(id, newConfig)
      if (result.success) {
        setIsConnected(true)
        setConfig(newConfig)
        if (result.capabilities) {
           setCapabilities(result.capabilities)
        } else {
           setCapabilities(getInitialCapabilities(newConfig.dialect || 'postgres'))
        }
        await (window as any).api.saveConnection(newConfig)
        if (onUpdateTitle) {
          onUpdateTitle(newConfig.database || newConfig.host)
        }
      } else {
        setError(result.error || 'Connection failed')
      }
      return result
    } catch (err: any) {
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  const disconnect = async () => {
    try {
        await (window as any).api.disconnect(id)
        setIsConnected(false)
        setCapabilities(getInitialCapabilities(config.dialect || 'postgres'))
    } catch (e) {
        console.error("Disconnect failed", e)
    }
  }

  const query = async (sql: string, params?: any[]) => {
    try {
      const result = params
        ? await (window as any).api.query(id, sql, params)
        : await (window as any).api.query(id, sql)
      return result
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }

  return (
    <SessionContext.Provider value={{
      sessionId: id,
      isConnected,
      config,
      capabilities,
      loading,
      error,
      connect,
      disconnect,
      query,
      buildQuery,
      updateTitle: onUpdateTitle,
      setError,
      setConfig
    }}>
      {children}
    </SessionContext.Provider>
  )
}

export const useSession = () => {
  const context = useContext(SessionContext)
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider')
  }
  return context
}
