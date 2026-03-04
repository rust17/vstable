import { useCallback, useState } from 'react';
import { useSession } from '../../../stores/useSessionStore';
import type { FilterCondition, SortCondition, TableTab } from '../../../types/session';

export const useTableData = (tab: TableTab) => {
  const { sessionId, query, config: sessionConfig, capabilities } = useSession();
  const [data, setData] = useState<{ rows: any[]; fields: any[] } | null>(tab.results);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalRows, setTotalRows] = useState(tab.totalRows || 0);

  const q = capabilities?.quoteChar || '"';

  // Helper to quote identifiers
  const quote = useCallback((id: string) => `${q}${id}${q}`, [q]);

  const fetchData = useCallback(
    async (
      page: number,
      pageSize: number,
      filters: FilterCondition[],
      sorts: SortCondition[] = []
    ) => {
      setLoading(true);
      setError(null);
      try {
        const schema = tab.schema!;
        const name = tab.name;

        const tableRef =
          capabilities?.supportsSchemas && schema ? `${quote(schema)}.${quote(name)}` : quote(name);

        let whereClause = '';
        if (filters.length > 0) {
          const conditions = filters
            .filter((f) => f.enabled && f.column && f.value)
            .map((f) => {
              const val = f.value.replace(/'/g, "''");
              return `${quote(f.column!)} ${f.operator} '${val}'`;
            });
          if (conditions.length > 0) {
            whereClause = ` WHERE ${conditions.join(' AND ')}`;
          }
        }

        const countRes = await query(`SELECT COUNT(*) as count FROM ${tableRef}${whereClause};`);
        let total = 0;
        if (countRes.success && countRes.rows) {
          const row = countRes.rows[0];
          total = parseInt(row.count || row['COUNT(*)'] || Object.values(row)[0] || '0', 10);
        }
        setTotalRows(total);

        const offset = (page - 1) * pageSize;
        let orderByClause = '';

        if (sorts.length > 0) {
          const orderParts = sorts.map((s) => `${quote(s.column)} ${s.direction}`);
          orderByClause = ` ORDER BY ${orderParts.join(', ')}`;
        } else if (tab.pk) {
          orderByClause = ` ORDER BY ${quote(tab.pk)} ASC`;
        }

        const sql = `SELECT * FROM ${tableRef}${whereClause}${orderByClause} LIMIT ${pageSize} OFFSET ${offset};`;
        const res = await query(sql);

        if (res.success) {
          setData({ rows: res.rows || [], fields: res.fields || [] });
        } else {
          setError(res.error || 'Query failed');
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    },
    [sessionId, tab.schema, tab.name, tab.pk, capabilities, quote, query]
  );

  const deleteRow = async (pkColumn: string, pkValue: any) => {
    const schema = tab.schema!;
    const name = tab.name;
    const tableRef =
      capabilities?.supportsSchemas && schema ? `${quote(schema)}.${quote(name)}` : quote(name);
    const val = String(pkValue).replace(/'/g, "''");
    const sql = `DELETE FROM ${tableRef} WHERE ${quote(pkColumn)} = '${val}';`;
    return await query(sql);
  };

  const deleteRows = async (pkColumn: string, pkValues: any[]) => {
    const schema = tab.schema!;
    const name = tab.name;
    const tableRef =
      capabilities?.supportsSchemas && schema ? `${quote(schema)}.${quote(name)}` : quote(name);
    const vals = pkValues.map((v) => `'${String(v).replace(/'/g, "''")}'`).join(', ');
    const sql = `DELETE FROM ${tableRef} WHERE ${quote(pkColumn)} IN (${vals});`;
    return await query(sql);
  };

  const updateCell = async (pkColumn: string, pkValue: any, column: string, newValue: any) => {
    const schema = tab.schema!;
    const name = tab.name;
    const tableRef =
      capabilities?.supportsSchemas && schema ? `${quote(schema)}.${quote(name)}` : quote(name);
    const val = String(newValue).replace(/'/g, "''");
    const pkVal = String(pkValue).replace(/'/g, "''");
    const sql = `UPDATE ${tableRef} SET ${quote(column)} = '${val}' WHERE ${quote(pkColumn)} = '${pkVal}';`;
    return await query(sql);
  };

  const insertRow = async (rowData: Record<string, any>) => {
    const schema = tab.schema!;
    const name = tab.name;
    const tableRef =
      capabilities?.supportsSchemas && schema ? `${quote(schema)}.${quote(name)}` : quote(name);
    const columns = Object.keys(rowData);
    if (columns.length === 0) {
      const sql =
        sessionConfig.dialect === 'mysql'
          ? `INSERT INTO ${tableRef} () VALUES ();`
          : `INSERT INTO ${tableRef} DEFAULT VALUES;`;
      return await query(sql);
    }
    const cols = columns.map((c) => quote(c)).join(', ');
    const vals = columns.map((c) => `'${String(rowData[c]).replace(/'/g, "''")}'`).join(', ');
    return await query(`INSERT INTO ${tableRef} (${cols}) VALUES (${vals});`);
  };

  return {
    data,
    loading,
    error,
    totalRows,
    fetchData,
    deleteRow,
    deleteRows,
    updateCell,
    insertRow,
  };
};
