import React, { createContext, useContext, useState, ReactNode } from 'react'
import { ConnectionConfig, QueryResult } from '../types/session'

interface SessionContextType {
  sessionId: string
  isConnected: boolean
  config: ConnectionConfig
  loading: boolean
  error: string | null

  // Actions
  connect: (config: ConnectionConfig) => Promise<QueryResult>
  disconnect: () => Promise<void>
  query: (sql: string, params?: any[]) => Promise<QueryResult>
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

export const SessionProvider: React.FC<SessionProviderProps> = ({ id, onUpdateTitle, children }) => {
  const [isConnected, setIsConnected] = useState(false)
  const [config, setConfig] = useState<ConnectionConfig>({
    dialect: 'postgres',
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    database: 'postgres'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const connect = async (newConfig: ConnectionConfig) => {
    setLoading(true)
    setError(null)
    try {
      const result = await (window as any).api.connect(id, newConfig)
      if (result.success) {
        setIsConnected(true)
        setConfig(newConfig)
        // 连接成功后自动保存配置
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
    } catch (e) {
        console.error("Disconnect failed", e)
    }
  }

  const query = async (sql: string, params?: any[]) => {
    try {
      // Clear error on new query? Maybe component specific
      // setError(null)
      const result = params
        ? await (window as any).api.query(id, sql, params)
        : await (window as any).api.query(id, sql)
      if (!result.success) {
         // Optionally set global error here, but components might want to handle it locally
         // For now, let's return it and let components decide
      }
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
      loading,
      error,
      connect,
      disconnect,
      query,
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
