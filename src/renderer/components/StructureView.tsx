import React, { useState, useEffect } from 'react'
import { Plus, X, ArrowLeft, RefreshCw, Save, Database, Trash2, Key, Check, AlertCircle } from 'lucide-react'
import { generateAlterTableSql, generateCreateTableSql, ColumnDefinition, IndexDefinition } from '../utils/sql-generator'

interface StructureViewProps {
  connectionId: string
  schema: string
  tableName: string
  mode?: 'create' | 'edit'
  onClose: () => void
  onSaveSuccess?: (schema: string, name: string) => void
}

export const StructureView: React.FC<StructureViewProps> = ({ connectionId, schema: initialSchema, tableName: initialTableName, mode = 'edit', onClose, onSaveSuccess }) => {
  const [columns, setColumns] = useState<ColumnDefinition[]>([])
  const [indexes, setIndexes] = useState<IndexDefinition[]>([])
  const [deletedColumns, setDeletedColumns] = useState<ColumnDefinition[]>([])
  const [deletedIndexes, setDeletedIndexes] = useState<IndexDefinition[]>([])
  
  const [newTableName, setNewTableName] = useState(initialTableName || '')
  const [newSchema, setNewSchema] = useState(initialSchema || 'public')
  const [availableSchemas, setAvailableSchemas] = useState<string[]>([])

  const [loading, setLoading] = useState(mode === 'edit')
  const [error, setError] = useState<string | null>(null)
  const [sqlPreview, setSqlPreview] = useState<string | null>(null)
  const [executing, setExecuting] = useState(false)

  // Fetch initial structure
  const fetchStructure = async () => {
    if (mode === 'create') {
        // Just fetch schemas
        try {
            const res = await (window as any).api.query(connectionId, `SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('information_schema', 'pg_catalog');`)
            if (res.success && res.rows) {
                setAvailableSchemas(res.rows.map((r: any) => r.schema_name))
            }
        } catch (e) {
            console.error(e)
        }
        setLoading(false)
        // Add a default ID column
        setColumns([{
            id: crypto.randomUUID(),
            name: 'id',
            type: 'serial',
            nullable: false,
            defaultValue: null,
            isPrimaryKey: true
        }])
        return
    }

    setLoading(true)
    setError(null)
    setDeletedColumns([])
    setDeletedIndexes([])
    try {
      // Fetch columns
      const colRes = await (window as any).api.query(connectionId, `
        SELECT 
          column_name, 
          data_type, 
          is_nullable, 
          column_default,
          ordinal_position,
          (SELECT kcu.constraint_name FROM information_schema.key_column_usage kcu 
           JOIN information_schema.table_constraints tc ON kcu.constraint_name = tc.constraint_name 
           WHERE kcu.table_schema = c.table_schema AND kcu.table_name = c.table_name 
           AND kcu.column_name = c.column_name AND tc.constraint_type = 'PRIMARY KEY' LIMIT 1) as pk_constraint_name
        FROM information_schema.columns c
        WHERE table_schema = '${initialSchema}' AND table_name = '${initialTableName}' 
        ORDER BY ordinal_position;
      `)

      if (!colRes.success) throw new Error(colRes.error)

      const cols = colRes.rows.map((row: any) => ({
        id: crypto.randomUUID(),
        name: row.column_name,
        type: row.data_type,
        nullable: row.is_nullable === 'YES',
        defaultValue: row.column_default,
        isPrimaryKey: !!row.pk_constraint_name,
        _original: {
          name: row.column_name,
          type: row.data_type,
          nullable: row.is_nullable === 'YES',
          defaultValue: row.column_default,
          isPrimaryKey: !!row.pk_constraint_name
        }
      }))

      setColumns(cols)

      // Fetch indexes
      const idxRes = await (window as any).api.query(connectionId, `
        SELECT
            i.relname as index_name,
            array_agg(a.attname) as column_names,
            ix.indisunique as is_unique
        FROM
            pg_class t
            JOIN pg_index ix ON t.oid = ix.indrelid
            JOIN pg_class i ON i.oid = ix.indexrelid
            JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
            JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE
            t.relname = '${initialTableName}' AND n.nspname = '${initialSchema}'
        GROUP BY
            i.relname, ix.indisunique;
      `)

      if (idxRes.success) {
        const idxs = idxRes.rows.map((row: any) => {
          let cols: string[] = []
          if (Array.isArray(row.column_names)) {
            cols = row.column_names
          } else if (typeof row.column_names === 'string') {
            // Parse PG array string: {col1,col2}
            cols = row.column_names.replace(/^\{|\}$/g, '').split(',').map(s => s.trim().replace(/^"|"$/g, '')).filter(Boolean)
          }

          return {
            id: crypto.randomUUID(),
            name: row.index_name,
            columns: cols,
            isUnique: row.is_unique,
            _original: {
              name: row.index_name,
              columns: [...cols],
              isUnique: row.is_unique
            }
          }
        })
        setIndexes(idxs)
      } else {
        // Index query might fail on older PG versions or permissions, just warn?
        console.warn("Failed to fetch indexes", idxRes.error)
        setIndexes([])
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStructure()
  }, [connectionId, initialSchema, initialTableName, mode])

  const handleAddColumn = () => {
    const newCol: ColumnDefinition = {
      id: crypto.randomUUID(),
      name: `new_column_${columns.length + 1}`,
      type: 'varchar',
      nullable: true,
      defaultValue: null,
      isPrimaryKey: false
    }
    setColumns([...columns, newCol])
  }

  const handleDeleteColumnWithTracking = (id: string) => {
    const col = columns.find(c => c.id === id)
    if (!col) return
    if (col._original) {
      setDeletedColumns([...deletedColumns, col])
    }
    setColumns(columns.filter(c => c.id !== id))
  }

  const handleColumnChange = (id: string, field: keyof ColumnDefinition, value: any) => {
    setColumns(columns.map(c => c.id === id ? { ...c, [field]: value } : c))
  }

  const handleAddIndex = () => {
    setIndexes([...indexes, {
      id: crypto.randomUUID(),
      name: `idx_${mode === 'create' ? newTableName : initialTableName}_${indexes.length + 1}`,
      columns: [],
      isUnique: false
    }])
  }

  const handleDeleteIndexWithTracking = (id: string) => {
    const idx = indexes.find(i => i.id === id)
    if (!idx) return
    if (idx._original) {
      setDeletedIndexes([...deletedIndexes, idx])
    }
    setIndexes(indexes.filter(i => i.id !== id))
  }

  const generateSql = () => {
      if (mode === 'create') {
          if (!newTableName.trim()) return []
          return generateCreateTableSql(newSchema, newTableName, columns, indexes)
      }

      const sqls = generateAlterTableSql(
          initialSchema, 
          initialTableName, 
          columns, 
          indexes, 
          deletedColumns, 
          deletedIndexes
      )
      return sqls
  }

  const handlePreviewSql = () => {
      const sqls = generateSql()
      if (sqls.length === 0) {
          setSqlPreview('-- No changes detected --')
      } else {
          setSqlPreview(sqls.join('\n'))
      }
  }

  const executeChanges = async () => {
      const sqls = generateSql()
      if (sqls.length === 0) return

      setExecuting(true)
      try {
          // Execute each SQL
          for (const sql of sqls) {
              const res = await (window as any).api.query(connectionId, sql)
              if (!res.success) throw new Error(res.error)
          }
          // Success
          setSqlPreview(null)
          if (mode === 'create') {
              if (onSaveSuccess) onSaveSuccess(newSchema, newTableName)
              onClose()
          } else {
             await fetchStructure()
          }
      } catch (e: any) {
          setError(e.message)
          setSqlPreview(null) // Close modal to show error
      } finally {
          setExecuting(false)
      }
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-full text-gray-400 bg-white">
        <RefreshCw size={24} className="animate-spin mb-2" />
        <span className="text-xs">Loading structure...</span>
    </div>
  )

  return (
    <div className="flex flex-col h-full bg-gray-50/50">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors" title="Back to Data">
            <ArrowLeft size={18} />
          </button>
          <div className="flex flex-col">
            {mode === 'create' ? (
                <div className="flex items-center gap-2">
                    <select 
                        value={newSchema} 
                        onChange={e => setNewSchema(e.target.value)}
                        className="text-xs font-normal text-gray-500 bg-gray-100 border-none rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500"
                    >
                        {availableSchemas.length > 0 ? availableSchemas.map(s => (
                            <option key={s} value={s}>{s}</option>
                        )) : <option value="public">public</option>}
                    </select>
                    <span className="text-gray-300">/</span>
                    <input 
                        autoFocus
                        placeholder="New Table Name"
                        value={newTableName} 
                        onChange={e => setNewTableName(e.target.value)}
                        className="text-lg font-bold text-gray-800 border-b border-transparent hover:border-gray-300 focus:border-blue-500 outline-none bg-transparent placeholder:text-gray-300 transition-all"
                    />
                </div>
            ) : (
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                {initialTableName}
                <span className="text-xs font-normal text-gray-400 px-2 py-0.5 bg-gray-100 rounded-full">{initialSchema}</span>
                </h2>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {mode === 'edit' && (
             <button onClick={fetchStructure} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Refresh">
               <RefreshCw size={18} />
             </button>
          )}
          <button onClick={handlePreviewSql} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm">
            <Database size={16} /> SQL Preview
          </button>
          <button onClick={handlePreviewSql} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition-all">
            <Save size={16} /> {mode === 'create' ? 'Create Table' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 space-y-8 elastic-scroll">
        {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-100 flex items-start gap-3">
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <div className="text-sm font-medium whitespace-pre-wrap">{error}</div>
                <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-700"><X size={14} /></button>
            </div>
        )}

        {/* Columns Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
            <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
                Columns
            </h3>
            <button onClick={handleAddColumn} className="text-xs flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 font-medium transition-colors">
                <Plus size={14} /> Add Column
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3 w-12">#</th>
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3 w-24 text-center">Nullable</th>
                  <th className="px-6 py-3 w-24 text-center">Primary</th>
                  <th className="px-6 py-3">Default</th>
                  <th className="px-6 py-3 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {columns.map((col, idx) => (
                  <tr key={col.id} className="group hover:bg-blue-50/30 transition-colors">
                    <td className="px-6 py-3 text-gray-400 text-xs font-mono">{idx + 1}</td>
                    <td className="px-6 py-3">
                        <input 
                            value={col.name}
                            onChange={e => handleColumnChange(col.id, 'name', e.target.value)}
                            className="w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none px-1 py-0.5 transition-colors font-medium text-gray-700"
                        />
                    </td>
                    <td className="px-6 py-3">
                         <input 
                            value={col.type}
                            onChange={e => handleColumnChange(col.id, 'type', e.target.value)}
                            className="w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none px-1 py-0.5 transition-colors text-blue-600 font-mono text-xs"
                            list="dtypes"
                        />
                        <datalist id="dtypes">
                            <option value="integer" />
                            <option value="bigint" />
                            <option value="varchar" />
                            <option value="text" />
                            <option value="boolean" />
                            <option value="timestamp" />
                            <option value="date" />
                            <option value="json" />
                            <option value="jsonb" />
                            <option value="uuid" />
                            <option value="serial" />
                            <option value="bigserial" />
                        </datalist>
                    </td>
                    <td className="px-6 py-3 text-center">
                        <input 
                            type="checkbox"
                            checked={col.nullable}
                            onChange={e => handleColumnChange(col.id, 'nullable', e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                    </td>
                    <td className="px-6 py-3 text-center">
                        <div className={`flex justify-center ${col.isPrimaryKey ? 'text-amber-500' : 'text-gray-200'}`}>
                            <Key size={14} fill={col.isPrimaryKey ? "currentColor" : "none"} />
                        </div>
                    </td>
                    <td className="px-6 py-3">
                        <input 
                            value={col.defaultValue || ''}
                            onChange={e => handleColumnChange(col.id, 'defaultValue', e.target.value)}
                            placeholder="NULL"
                            className="w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none px-1 py-0.5 transition-colors text-gray-500 text-xs font-mono"
                        />
                    </td>
                    <td className="px-6 py-3 text-right">
                        <button 
                            data-testid={`delete-column-${col.name}`}
                            onClick={() => handleDeleteColumnWithTracking(col.id)} 
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                        >
                            <Trash2 size={14} />
                        </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {columns.length === 0 && (
              <div className="p-8 text-center text-gray-400 italic text-sm bg-gray-50/50">
                  No columns defined. Click "Add Column" to start.
              </div>
          )}
        </div>

        {/* Indexes Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
            <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                <div className="w-1 h-4 bg-purple-500 rounded-full"></div>
                Indexes
            </h3>
            <button data-testid="btn-add-index" onClick={handleAddIndex} className="text-xs flex items-center gap-1 px-3 py-1.5 bg-purple-50 text-purple-600 rounded hover:bg-purple-100 font-medium transition-colors">
                <Plus size={14} /> Add Index
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3 w-12">#</th>
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Columns</th>
                  <th className="px-6 py-3 w-24 text-center">Unique</th>
                  <th className="px-6 py-3 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {indexes.map((idx, i) => (
                  <tr key={idx.id} className="group hover:bg-purple-50/30 transition-colors">
                    <td className="px-6 py-3 text-gray-400 text-xs font-mono">{i + 1}</td>
                    <td className="px-6 py-3">
                        <input 
                            data-testid={`index-name-${i}`}
                            value={idx.name}
                            onChange={e => {
                                const newIndexes = [...indexes]
                                newIndexes[i].name = e.target.value
                                setIndexes(newIndexes)
                            }}
                            className="w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-purple-500 focus:outline-none px-1 py-0.5 transition-colors font-medium text-gray-700"
                        />
                    </td>
                    <td className="px-6 py-3">
                         <input 
                            data-testid={`index-columns-${i}`}
                            value={(Array.isArray(idx.columns) ? idx.columns : []).join(', ')}
                            onChange={e => {
                                const newIndexes = [...indexes]
                                newIndexes[i].columns = e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                                setIndexes(newIndexes)
                            }}
                            placeholder="col1, col2"
                            className="w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-purple-500 focus:outline-none px-1 py-0.5 transition-colors text-gray-500 text-xs font-mono"
                        />
                    </td>
                    <td className="px-6 py-3 text-center">
                        <input 
                            data-testid={`index-unique-${i}`}
                            type="checkbox"
                            checked={idx.isUnique}
                            onChange={e => {
                                const newIndexes = [...indexes]
                                newIndexes[i].isUnique = e.target.checked
                                setIndexes(newIndexes)
                            }}
                            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                        />
                    </td>
                    <td className="px-6 py-3 text-right">
                        <button 
                            data-testid={`delete-index-${idx.name}`}
                            onClick={() => handleDeleteIndexWithTracking(idx.id)} 
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                        >
                            <Trash2 size={14} />
                        </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {indexes.length === 0 && (
              <div className="p-8 text-center text-gray-400 italic text-sm bg-gray-50/50">
                  No indexes defined.
              </div>
          )}
        </div>
      </div>

      {/* SQL Preview Modal */}
      {sqlPreview && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
              <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl border border-gray-200 flex flex-col max-h-[80vh] m-4 animate-in fade-in zoom-in duration-200">
                  <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-xl">
                      <h3 className="font-semibold text-gray-700 flex items-center gap-2"><Database size={16} className="text-blue-500" /> Preview SQL</h3>
                      <button onClick={() => setSqlPreview(null)} className="p-1 hover:bg-gray-100 rounded-full transition-colors"><X size={18} className="text-gray-400" /></button>
                  </div>
                  <div className="p-0 flex-1 overflow-hidden bg-gray-50">
                      <pre className="w-full h-full p-6 font-mono text-xs text-gray-700 overflow-auto whitespace-pre-wrap">{sqlPreview}</pre>
                  </div>
                  <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-white rounded-b-xl">
                      <button onClick={() => setSqlPreview(null)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
                      {sqlPreview !== '-- No changes detected --' && (
                        <button onClick={executeChanges} className="px-6 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-colors flex items-center gap-2">
                            {executing ? 'Executing...' : 'Execute'}
                        </button>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  )
}
