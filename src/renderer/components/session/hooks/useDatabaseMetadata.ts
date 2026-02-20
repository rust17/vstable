import { useState, useEffect, useCallback } from 'react'
import { useSession } from '../SessionContext'

export const useDatabaseMetadata = () => {
  const { sessionId, isConnected, query, config } = useSession()
  const [databases, setDatabases] = useState<string[]>([])
  const [schemas, setSchemas] = useState<string[]>(['public'])
  const [currentSchema, setCurrentSchema] = useState('public')
  const [tables, setTables] = useState<{table_name: string, table_schema: string}[]>([])

  const fetchDatabases = useCallback(async () => {
    const result = await query(`SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname;`)
    if (result.success && result.rows) {
      setDatabases(result.rows.map((r: any) => r.datname))
    }
  }, [query])

  const fetchSchemas = useCallback(async () => {
    const result = await query(`SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('information_schema', 'pg_catalog') ORDER BY schema_name;`)
    if (result.success && result.rows) {
      const list = result.rows.map((r: any) => r.schema_name)
      setSchemas(list)
      if (!list.includes(currentSchema)) setCurrentSchema('public')
    }
  }, [query, currentSchema])

  const fetchTables = useCallback(async () => {
    const result = await query(`SELECT table_name, table_schema FROM information_schema.tables WHERE table_schema = '${currentSchema}' ORDER BY table_name;`)
    if (result.success && result.rows) setTables(result.rows)
  }, [query, currentSchema])

  useEffect(() => {
    if (isConnected) {
      fetchDatabases()
      fetchSchemas()
    }
  }, [isConnected, fetchDatabases, fetchSchemas])

  useEffect(() => {
    if (isConnected) fetchTables()
  }, [currentSchema, isConnected, fetchTables])

  return {
    databases,
    schemas,
    currentSchema,
    setCurrentSchema,
    tables,
    fetchDatabases,
    fetchTables
  }
}
