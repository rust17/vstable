import React, { useState, useEffect } from 'react'
import { Database, Plus, Server, Play, Table as TableIcon, Settings, Edit2, ChevronLeft, ChevronRight } from 'lucide-react'
import Editor from '@monaco-editor/react'

const EditableCell = ({ value, onUpdate, isEditable, placeholder }: { value: any, onUpdate: (newVal: string) => void, isEditable: boolean, placeholder?: string }) => {
  const [editing, setEditing] = useState(false)
  const [tempValue, setTempValue] = useState(String(value ?? ''))

  const handleBlur = () => {
    setEditing(false)
    if (tempValue !== String(value ?? '')) {
      onUpdate(tempValue)
    }
  }

  useEffect(() => {
    setTempValue(String(value ?? ''))
  }, [value])

  if (editing) {
    return (
      <input
        autoFocus
        className="w-full h-full bg-blue-50 outline-none px-2 text-xs font-mono"
        value={tempValue}
        placeholder={placeholder}
        onChange={e => setTempValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={e => {
          if (e.key === 'Enter') handleBlur()
          if (e.key === 'Escape') {
            setEditing(false)
            setTempValue(String(value ?? ''))
          }
        }}
      />
    )
  }

  return (
    <div
      onDoubleClick={() => isEditable && setEditing(true)}
      className={`w-full h-full px-3 py-2 ${isEditable ? 'cursor-text hover:bg-gray-50' : 'cursor-default'}`}
    >
      {value === null ? <span className="text-gray-300 italic">null</span> : String(value)}
    </div>
  )
}

interface SessionViewProps {
  id: string
  isActive: boolean
  onUpdateTitle: (title: string) => void
}

export const SessionView: React.FC<SessionViewProps> = ({ id, isActive, onUpdateTitle }) => {
  const [showConnectForm, setShowConnectForm] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const [config, setConfig] = useState({ host: 'localhost', port: 5432, user: 'postgres', password: '', database: 'postgres' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tables, setTables] = useState<{table_name: string, table_schema: string}[]>([])
  const [query, setQuery] = useState('SELECT * FROM ')
  const [results, setResults] = useState<{rows: any[], fields: any[]} | null>(null)
  const [executing, setExecuting] = useState(false)

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(100)
  const [totalRows, setTotalRows] = useState(0)

  const [currentTable, setCurrentTable] = useState<{schema: string, name: string, pk: string | null} | null>(null)
  const [activeTab, setActiveTab] = useState<'data' | 'structure'>('data')
  const [structure, setStructure] = useState<any[]>([])

  const executeSql = async (sql: string) => {
    if (!sql.trim()) return
    setExecuting(true)
    setError('')
    try {
      const result = await window.api.query(id, sql)
      if (result.success) {
        setResults({ rows: result.rows || [], fields: result.fields || [] })
      } else {
        setError(result.error || 'Query failed')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setExecuting(false)
    }
  }

  const handleCellUpdate = async (row: any, field: string, newValue: string) => {
    if (!currentTable || !currentTable.pk) return
    const pkValue = row[currentTable.pk]
    const updateSql = `UPDATE "${currentTable.schema}"."${currentTable.name}" SET "${field}" = '${newValue.replace(/'/g, "''")}' WHERE "${currentTable.pk}" = '${pkValue}';`

    try {
      const result = await window.api.query(id, updateSql)
      if (result.success) {
        executeSql(query)
      } else {
        setError(result.error || 'Update failed')
      }
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleStructureUpdate = async (column: string, field: 'column_name' | 'data_type', newValue: string) => {
     if (!currentTable) return
     let sql = ''
     if (field === 'column_name') {
       sql = `ALTER TABLE "${currentTable.schema}"."${currentTable.name}" RENAME COLUMN "${column}" TO "${newValue}";`
     } else if (field === 'data_type') {
       sql = `ALTER TABLE "${currentTable.schema}"."${currentTable.name}" ALTER COLUMN "${column}" TYPE ${newValue} USING "${column}"::${newValue};`
     }

     try {
       const result = await window.api.query(id, sql)
       if (result.success) {
         await fetchStructure(currentTable.schema, currentTable.name)
       } else {
         setError(result.error || 'Structure update failed')
       }
     } catch (err: any) {
       setError(err.message)
     }
  }

  const fetchTables = async () => {
    const result = await window.api.query(id, `SELECT table_name, table_schema FROM information_schema.tables WHERE table_schema NOT IN ('information_schema', 'pg_catalog') ORDER BY table_schema, table_name;`)
    if (result.success && result.rows) setTables(result.rows)
  }

  const fetchStructure = async (schema: string, name: string) => {
    const result = await window.api.query(id, `SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema = '${schema}' AND table_name = '${name}' ORDER BY ordinal_position;`)
    if (result.success && result.rows) setStructure(result.rows)
  }

  const fetchTableData = async (schema: string, name: string, p: number, size: number) => {
    setExecuting(true)
    setError('')
    try {
      const countResult = await window.api.query(id, `SELECT COUNT(*) FROM "${schema}"."${name}";`)
      if (countResult.success && countResult.rows && countResult.rows.length > 0) {
        setTotalRows(parseInt(countResult.rows[0].count || '0'))
      }

      const q = `SELECT * FROM "${schema}"."${name}" LIMIT ${size} OFFSET ${(p - 1) * size};`
      setQuery(q)
      const result = await window.api.query(id, q)
      if (result.success) {
        setResults({ rows: result.rows || [], fields: result.fields || [] })
      } else {
        setError(result.error || 'Query failed')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setExecuting(false)
    }
  }

  const handleTableClick = async (schema: string, name: string) => {
    setActiveTab('data')
    setPage(1)
    
    const pkResult = await window.api.query(id, `SELECT kcu.column_name FROM information_schema.table_constraints tco JOIN information_schema.key_column_usage kcu ON kcu.constraint_name = tco.constraint_name AND kcu.constraint_schema = tco.constraint_schema WHERE tco.constraint_type = 'PRIMARY KEY' AND tco.table_schema = '${schema}' AND tco.table_name = '${name}';`)
    const pk = (pkResult.success && pkResult.rows && pkResult.rows.length > 0) ? pkResult.rows[0].column_name : null

    setCurrentTable({ schema, name, pk })
    fetchStructure(schema, name)
    fetchTableData(schema, name, 1, pageSize)
  }

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const result = await window.api.connect(id, config)
      if (result.success) {
        setIsConnected(true)
        setShowConnectForm(false)
        onUpdateTitle(config.database)
        await fetchTables()
      } else {
        setError(result.error || 'Connection failed')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div data-testid={`session-view-${id}`} className="flex h-full w-full overflow-hidden bg-white text-gray-900" style={{ display: isActive ? 'flex' : 'none' }}>
      <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col">
        <div className="p-4 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Connections</h2>
            <button onClick={() => setShowConnectForm(true)} className="p-1 hover:bg-gray-200 rounded text-gray-600 transition-colors"><Plus size={14} /></button>
          </div>
          <div className="space-y-1">
            {isConnected && (
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-blue-600 text-white text-sm shadow-sm mb-4">
                <Server size={14} />
                <span className="truncate font-medium">{config.database}</span>
              </div>
            )}
            {tables.length > 0 && (
              <div className="mt-6">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2 mb-2">Tables</h3>
                {tables.map((table, i) => (
                  <div key={i} data-testid={`table-item-${table.table_name}`} onClick={() => handleTableClick(table.table_schema, table.table_name)} className={`group flex items-center gap-2 px-2 py-1 rounded-md hover:bg-gray-200 cursor-pointer transition-colors ${currentTable?.name === table.table_name ? 'bg-gray-200 text-blue-600' : 'text-gray-600'}`}>
                    <TableIcon size={14} className={`group-hover:text-blue-500 ${currentTable?.name === table.table_name ? 'text-blue-500' : 'text-gray-400'}`} />
                    <span className="truncate text-sm">{table.table_name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="p-4 border-t border-gray-200 flex gap-2"><Settings size={16} className="text-gray-400 cursor-pointer hover:text-gray-600" /></div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="border-b border-gray-100 flex items-center px-4 justify-end gap-2 bg-gray-50/50 h-10">
           {isConnected && currentTable && (
             <div className="mr-auto flex bg-gray-200/50 p-1 rounded-lg no-drag">
               <button data-testid="tab-data" onClick={() => setActiveTab('data')} className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${activeTab === 'data' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>Data</button>
               <button data-testid="tab-structure" onClick={() => setActiveTab('structure')} className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${activeTab === 'structure' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>Structure</button>
             </div>
           )}
          {isConnected && (
             <>
               <span className="text-[10px] text-gray-400 font-mono px-4 uppercase tracking-wider hidden md:block">Connected to {config.host}</span>
               {activeTab === 'data' && (
                 <button data-testid="btn-run-query" onClick={() => executeSql(query)} disabled={executing} className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"><Play size={12} fill="currentColor" /> {executing ? 'Running...' : 'Run Query'}</button>
               )}
             </>
          )}
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          {!isConnected && !showConnectForm ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-white">
              <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center mb-4 shadow-inner"><Database size={40} className="text-gray-200" /></div>
              <p className="text-sm font-medium text-gray-500">No active connection</p>
              <button data-testid="create-connection-btn" onClick={() => setShowConnectForm(true)} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">Create New Connection</button>
            </div>
          ) : showConnectForm ? (
            <div className="flex-1 flex items-center justify-center bg-gray-50/50 p-6 overflow-y-auto">
              <form data-testid="connection-form" onSubmit={handleConnect} className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
                <h3 className="text-xl font-semibold mb-6 text-gray-800">Connection Settings</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-4 items-center"><label className="text-sm font-medium text-gray-600 col-span-1">Host</label><input data-testid="input-host" className="col-span-3 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" value={config.host} onChange={e => setConfig({...config, host: e.target.value})} required /></div>
                  <div className="grid grid-cols-4 gap-4 items-center"><label className="text-sm font-medium text-gray-600 col-span-1">Port</label><input data-testid="input-port" type="number" className="col-span-3 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" value={config.port} onChange={e => setConfig({...config, port: parseInt(e.target.value)})} required /></div>
                  <div className="grid grid-cols-4 gap-4 items-center"><label className="text-sm font-medium text-gray-600 col-span-1">User</label><input data-testid="input-user" className="col-span-3 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" value={config.user} onChange={e => setConfig({...config, user: e.target.value})} required /></div>
                  <div className="grid grid-cols-4 gap-4 items-center"><label className="text-sm font-medium text-gray-600 col-span-1">Password</label><input data-testid="input-password" type="password" className="col-span-3 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" value={config.password} onChange={e => setConfig({...config, password: e.target.value})} /></div>
                  <div className="grid grid-cols-4 gap-4 items-center"><label className="text-sm font-medium text-gray-600 col-span-1">Database</label><input data-testid="input-database" className="col-span-3 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" value={config.database} onChange={e => setConfig({...config, database: e.target.value})} required /></div>
                </div>
                {error && <div className="mt-6 p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100">{error}</div>}
                <div className="mt-8 flex gap-3"><button type="button" onClick={() => setShowConnectForm(false)} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">Cancel</button><button data-testid="btn-connect" type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm">{loading ? 'Connecting...' : 'Connect'}</button></div>
              </form>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              {activeTab === 'data' ? (
                <>
                  <div className="h-1/3 border-b border-gray-200 flex flex-col bg-white overflow-hidden">
                    <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                       <TableIcon size={14} className="text-blue-500" />
                       <span className="text-[11px] font-bold text-gray-500 uppercase tracking-tight">SQL Query</span>
                       <span className="text-[10px] text-gray-400 ml-auto italic">Cmd+Enter to Run</span>
                    </div>
                    <div className="flex-1">
                      <Editor
                        height="100%"
                        defaultLanguage="sql"
                        theme="vs"
                        value={query}
                        onChange={(val) => setQuery(val || '')}
                        options={{
                          minimap: { enabled: false },
                          fontSize: 13,
                          fontFamily: 'Menlo, Monaco, "Courier New", monospace',
                          scrollBeyondLastLine: false,
                          automaticLayout: true,
                          lineNumbers: 'on',
                          padding: { top: 10 },
                          wordWrap: 'on'
                        }}
                        onMount={(editor, monaco) => {
                          editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
                            executeSql(editor.getValue())
                          })
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col min-h-0 bg-white overflow-hidden">
                    <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
                       <div className="flex items-center gap-4">
                         <span className="text-[11px] font-bold text-gray-500 uppercase tracking-tight">Results</span>
                         {currentTable?.pk && <span className="text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded border border-green-100">Editable (PK: {currentTable.pk})</span>}
                       </div>
                       
                       {currentTable && (
                         <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-md px-2 py-1 shadow-sm">
                           <div className="flex items-center gap-1 border-r border-gray-100 pr-2 mr-1">
                             <button 
                               data-testid="btn-prev-page"
                               disabled={page <= 1 || executing} 
                               onClick={() => {
                                 const p = page - 1
                                 setPage(p)
                                 fetchTableData(currentTable.schema, currentTable.name, p, pageSize)
                               }}
                               className="p-1 hover:bg-gray-100 rounded disabled:opacity-30 text-gray-600"
                             >
                               <ChevronLeft size={14} />
                             </button>
                             <input 
                               data-testid="input-page-number"
                               type="number" 
                               value={page} 
                               onChange={(e) => setPage(parseInt(e.target.value) || 1)}
                               onKeyDown={(e) => {
                                 if (e.key === 'Enter') {
                                   const p = Math.max(1, Math.min(page, Math.ceil(totalRows / pageSize)))
                                   setPage(p)
                                   fetchTableData(currentTable.schema, currentTable.name, p, pageSize)
                                 }
                               }}
                               className="w-10 text-center text-xs font-medium focus:outline-none"
                             />
                             <span className="text-[10px] text-gray-400">/ {Math.ceil(totalRows / pageSize) || 1}</span>
                             <button 
                               data-testid="btn-next-page"
                               disabled={page >= Math.ceil(totalRows / pageSize) || executing} 
                               onClick={() => {
                                 const p = page + 1
                                 setPage(p)
                                 fetchTableData(currentTable.schema, currentTable.name, p, pageSize)
                               }}
                               className="p-1 hover:bg-gray-100 rounded disabled:opacity-30 text-gray-600"
                             >
                               <ChevronRight size={14} />
                             </button>
                           </div>

                           <select 
                             data-testid="select-page-size"
                             value={pageSize} 
                             onChange={(e) => {
                               const size = parseInt(e.target.value)
                               setPageSize(size)
                               setPage(1)
                               fetchTableData(currentTable.schema, currentTable.name, 1, size)
                             }}
                             className="text-[10px] font-medium text-gray-600 focus:outline-none bg-transparent cursor-pointer"
                           >
                             <option value="50">50 / page</option>
                             <option value="100">100 / page</option>
                             <option value="500">500 / page</option>
                           </select>

                           <span className="text-[10px] text-gray-400 font-medium border-l border-gray-100 pl-2 ml-1">
                             Total: {totalRows}
                           </span>
                         </div>
                       )}

                       {results && !currentTable && <span className="text-[10px] text-gray-400 font-medium">{results.rows.length} rows returned</span>}
                    </div>
                    <div className="flex-1 overflow-auto">
                      {error && <div className="p-4 text-red-600 font-mono text-xs whitespace-pre-wrap bg-red-50/30">Error: {error}</div>}
                      {results && results.rows.length > 0 ? (
                        <table className="w-full border-collapse text-left text-xs font-mono">
                          <thead className="bg-gray-100 sticky top-0 z-10">
                            <tr>{results.fields.map((field, i) => <th key={i} className="px-3 py-2 border-r border-b border-gray-200 text-gray-600 font-bold whitespace-nowrap">{field.name}</th>)}</tr>
                          </thead>
                          <tbody>
                            {results.rows.map((row, i) => (
                              <tr key={i} className="hover:bg-blue-50/50 border-b border-gray-100 transition-colors">
                                {results.fields.map((field, j) => {
                                  const isEditable = !!currentTable?.pk && field.name !== currentTable.pk
                                  return (
                                    <td key={j} data-testid={`cell-${field.name}-${i}`} className="border-r border-gray-100 text-gray-600 whitespace-nowrap max-w-xs truncate p-0">
                                      <EditableCell value={row[field.name]} isEditable={isEditable} onUpdate={(val) => handleCellUpdate(row, field.name, val)} />
                                    </td>
                                  )
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : <div className="p-8 text-center text-gray-300 italic text-sm">Write a query and hit "Run Query"</div>}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col min-h-0 bg-white overflow-hidden">
                   <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                     <Edit2 size={14} className="text-orange-500" />
                     <span className="text-[11px] font-bold text-gray-500 uppercase tracking-tight">Table Structure</span>
                  </div>
                  <div className="flex-1 overflow-auto">
                    {error && <div className="p-4 text-red-600 font-mono text-xs whitespace-pre-wrap bg-red-50/30">Error: {error}</div>}
                    <table className="w-full border-collapse text-left text-sm">
                      <thead className="bg-gray-100 sticky top-0 z-10">
                        <tr>
                          <th className="px-4 py-2 border-b border-gray-200 text-gray-600 font-semibold w-1/3">Column Name</th>
                          <th className="px-4 py-2 border-b border-gray-200 text-gray-600 font-semibold w-1/3">Type</th>
                          <th className="px-4 py-2 border-b border-gray-200 text-gray-600 font-semibold">Nullable</th>
                          <th className="px-4 py-2 border-b border-gray-200 text-gray-600 font-semibold">Default</th>
                        </tr>
                      </thead>
                      <tbody>
                        {structure.map((col, i) => (
                          <tr key={i} className="hover:bg-gray-50 border-b border-gray-100 transition-colors">
                            <td className="border-r border-gray-100 p-0 h-10" data-testid={`struct-name-${i}`}><EditableCell value={col.column_name} isEditable={true} onUpdate={(val) => handleStructureUpdate(col.column_name, 'column_name', val)} /></td>
                            <td className="border-r border-gray-100 p-0 h-10" data-testid={`struct-type-${i}`}><EditableCell value={col.data_type} isEditable={true} onUpdate={(val) => handleStructureUpdate(col.column_name, 'data_type', val)} /></td>
                            <td className="px-4 py-2 border-r border-gray-100 text-gray-600">{col.is_nullable === 'YES' ? <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs">NULL</span> : <span className="px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded text-xs">NOT NULL</span>}</td>
                            <td className="px-4 py-2 text-gray-400 font-mono text-xs">{col.column_default}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
