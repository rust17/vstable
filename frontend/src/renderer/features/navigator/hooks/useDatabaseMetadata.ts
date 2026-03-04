import { useState, useEffect, useCallback } from 'react';
import { useSession } from '../../../stores/useSessionStore';

export const useDatabaseMetadata = () => {
  const { sessionId, isConnected, query, config, capabilities, buildQuery } = useSession();
  const [databases, setDatabases] = useState<string[]>([]);
  const [schemas, setSchemas] = useState<string[]>([]);
  const [currentSchema, setCurrentSchema] = useState('');
  const [tables, setTables] = useState<{ table_name: string; table_schema: string }[]>([]);

  // Initialize defaults based on capabilities
  useEffect(() => {
    if (capabilities) {
      if (capabilities.supportsSchemas) {
        setSchemas(['public']);
        setCurrentSchema('public');
      } else {
        setSchemas([]);
        setCurrentSchema('');
      }
    }
  }, [capabilities]);

  const fetchDatabases = useCallback(async () => {
    if (!capabilities) return;
    const sql = buildQuery('listDatabases', {});
    const result = await query(sql);
    if (result.success && result.rows) {
      setDatabases(result.rows.map((r: any) => Object.values(r)[0] as string));
    }
  }, [query, capabilities, buildQuery]);

  const fetchSchemas = useCallback(async () => {
    if (
      !capabilities ||
      !capabilities.supportsSchemas ||
      !capabilities.queryTemplates.listSchemas
    ) {
      setSchemas([]);
      return;
    }
    const sql = buildQuery('listSchemas', {});
    const result = await query(sql);
    if (result.success && result.rows) {
      const list = result.rows.map((r: any) => Object.values(r)[0] as string);
      setSchemas(list);
      if (!list.includes(currentSchema)) setCurrentSchema(list[0] || 'public');
    }
  }, [query, currentSchema, capabilities, buildQuery]);

  const fetchTables = useCallback(async () => {
    if (!capabilities) return;
    const sql = buildQuery('listTables', { db: config.database, schema: currentSchema });
    const result = await query(sql);
    if (result.success && result.rows) {
      setTables(
        result.rows
          .map((r: any) => {
            // Uniform mapping for table list
            const vals = Object.values(r);
            return {
              table_name: r.table_name || vals[0],
              table_schema: r.table_schema || currentSchema || config.database,
            };
          })
          .sort((a, b) => a.table_name.localeCompare(b.table_name))
      );
    }
  }, [query, currentSchema, capabilities, buildQuery, config.database]);

  useEffect(() => {
    if (isConnected) {
      fetchDatabases();
      fetchSchemas();
    }
  }, [isConnected, fetchDatabases, fetchSchemas]);

  useEffect(() => {
    if (isConnected) fetchTables();
  }, [currentSchema, isConnected, fetchTables]);

  return {
    databases,
    schemas,
    currentSchema,
    setCurrentSchema,
    tables,
    fetchDatabases,
    fetchTables,
  };
};
