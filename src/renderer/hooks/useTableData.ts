import { useState, useEffect, useCallback } from 'react'
import { useSession } from '../providers/SessionProvider'
import { TableTab, FilterCondition } from '../types/session'

export const useTableData = (tab: TableTab) => {
  const { sessionId, query } = useSession()
  const [data, setData] = useState<{rows: any[], fields: any[]} | null>(tab.results)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [totalRows, setTotalRows] = useState(tab.totalRows || 0)
  
  // Local state for filters/pagination if not managed by parent fully
  // But ideally, tab state should be the source of truth
  
  const fetchData = useCallback(async (page: number, pageSize: number, filters: FilterCondition[]) => {
    setLoading(true)
    setError(null)
    try {
        const schema = tab.schema!
        const name = tab.name
        
        let whereClause = ''
        if (filters.length > 0) {
            const conditions = filters.filter(f => f.enabled && f.column && f.value).map(f => {
            const val = f.value.replace(/'/g, "''")
            return `"${f.column}" ${f.operator} '${val}'`
            })
            if (conditions.length > 0) {
            whereClause = ` WHERE ${conditions.join(' AND ')}`
            }
        }

        const countRes = await query(`SELECT COUNT(*) FROM "${schema}"."${name}"${whereClause};`)
        let total = 0
        if (countRes.success && countRes.rows) {
            total = parseInt(countRes.rows[0].count || '0')
        }
        setTotalRows(total)

        const offset = (page - 1) * pageSize
        let orderByClause = ''
        if (tab.pk) {
            orderByClause = ` ORDER BY "${tab.pk}" ASC`
        }
        const q = `SELECT * FROM "${schema}"."${name}"${whereClause}${orderByClause} LIMIT ${pageSize} OFFSET ${offset};`
        const res = await query(q)
        
        if (res.success) {
            setData({ rows: res.rows || [], fields: res.fields || [] })
        } else {
            setError(res.error || 'Query failed')
        }
    } catch (e: any) {
        setError(e.message)
    } finally {
        setLoading(false)
    }
  }, [sessionId, tab.schema, tab.name, tab.pk])

  const deleteRow = async (pkColumn: string, pkValue: any) => {
      const schema = tab.schema!
      const name = tab.name
      const val = String(pkValue).replace(/'/g, "''")
      const sql = `DELETE FROM "${schema}"."${name}" WHERE "${pkColumn}" = '${val}';`
      return await query(sql)
  }

  const deleteRows = async (pkColumn: string, pkValues: any[]) => {
      const schema = tab.schema!
      const name = tab.name
      const vals = pkValues.map(v => `'${String(v).replace(/'/g, "''")}'`).join(', ')
      const sql = `DELETE FROM "${schema}"."${name}" WHERE "${pkColumn}" IN (${vals});`
      return await query(sql)
  }

  const updateCell = async (pkColumn: string, pkValue: any, column: string, newValue: any) => {
      const schema = tab.schema!
      const name = tab.name
      const val = String(newValue).replace(/'/g, "''")
      const pkVal = String(pkValue).replace(/'/g, "''")
      const sql = `UPDATE "${schema}"."${name}" SET "${column}" = '${val}' WHERE "${pkColumn}" = '${pkVal}';`
      return await query(sql)
  }
  
  const insertRow = async (rowData: Record<string, any>) => {
      const schema = tab.schema!
      const name = tab.name
      const columns = Object.keys(rowData)
      if (columns.length === 0) {
          return await query(`INSERT INTO "${schema}"."${name}" DEFAULT VALUES;`)
      }
      const cols = columns.map(c => `"${c}"`).join(', ')
      const vals = columns.map(c => `'${String(rowData[c]).replace(/'/g, "''")}'`).join(', ')
      return await query(`INSERT INTO "${schema}"."${name}" (${cols}) VALUES (${vals});`)
  }

  return {
    data,
    loading,
    error,
    totalRows,
    fetchData,
    deleteRow,
    deleteRows,
    updateCell,
    insertRow
  }
}
