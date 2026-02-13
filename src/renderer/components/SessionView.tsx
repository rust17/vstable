import React, { useState, useEffect } from 'react'
import { Database, Plus, Server, Play, Table as TableIcon, Settings, Edit2, ChevronLeft, ChevronRight, X } from 'lucide-react'
import Editor from '@monaco-editor/react'

const formatDisplayValue = (value: any, dataType?: string) => {
  if (value === null) return <span className="text-gray-300 italic">null</span>
  let display = String(value)
  if (dataType?.includes('json') && typeof value === 'object') {
    display = JSON.stringify(value, null, 2)
  } else if (dataType?.includes('timestamp') || dataType?.includes('date')) {
    // Remove timezone like +08, Z and milliseconds .123
    display = String(value).replace(/[+-]\d{2}(:\d{2})?$/, '').replace(/Z$/, '').replace(/\.\d+$/, '')
  }
  return display
}

const DataEditModal = ({ isOpen, value, onClose, onSave }: { isOpen: boolean, value: string, onClose: () => void, onSave: (val: string) => void }) => {
  const [val, setVal] = useState('')
  
  useEffect(() => {
    if (isOpen) setVal(value)
  }, [isOpen, value])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-[2px]" role="dialog">
      <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl border border-gray-200 flex flex-col max-h-[80vh] m-4 animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-xl">
          <h3 className="font-semibold text-gray-700 flex items-center gap-2"><Edit2 size={16} className="text-blue-500" /> Edit Data</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors"><X size={18} className="text-gray-400" /></button>
        </div>
        <div className="p-0 flex-1 overflow-hidden">
          <textarea 
            data-testid="edit-textarea"
            className="w-full h-full min-h-[300px] p-6 font-mono text-sm border-none focus:ring-0 outline-none resize-none bg-white text-gray-800"
            value={val}
            onChange={e => setVal(e.target.value)}
            autoFocus
            spellCheck={false}
          />
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50 rounded-b-xl">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200/50 rounded-lg transition-colors">Cancel</button>
          <button onClick={() => onSave(val)} className="px-6 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-colors">Save Changes</button>
        </div>
      </div>
    </div>
  )
}

const EditableCell = ({ value, dataType, onDoubleClick, isEditable }: { value: any, dataType?: string, onDoubleClick: () => void, isEditable: boolean }) => {
  return (
    <div
      onDoubleClick={onDoubleClick}
      className={`w-full h-full px-3 py-2 ${isEditable ? 'cursor-text hover:bg-gray-50' : 'cursor-default'}`}
    >
       <div className="max-h-20 overflow-hidden text-ellipsis whitespace-nowrap">
        {formatDisplayValue(value, dataType)}
      </div>
    </div>
  )
}

interface SessionViewProps {
  id: string
  isActive: boolean
  onUpdateTitle: (title: string) => void
}

interface TableTab {
  id: string
  type: 'table' | 'query'
  schema?: string
  name: string
  pk?: string | null
  page?: number
  pageSize?: number
  totalRows?: number
  results: {rows: any[], fields: any[]} | null
  structure?: any[]
  query: string
}

export const SessionView: React.FC<SessionViewProps> = ({ id, isActive, onUpdateTitle }) => {
  const [showConnectForm, setShowConnectForm] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const [config, setConfig] = useState({ host: 'localhost', port: 5432, user: 'postgres', password: '', database: 'postgres' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tables, setTables] = useState<{table_name: string, table_schema: string}[]>([])
  const [tableFilter, setTableFilter] = useState('')
  
  const [tabs, setTabs] = useState<TableTab[]>([])
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  
  const [executing, setExecuting] = useState(false)
  const [viewMode, setViewMode] = useState<'data' | 'structure'>('data')
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null)
  const [editingCellData, setEditingCellData] = useState<{value: any, dataType?: string, onSave: (val: string) => void} | null>(null)

  const activeTab = tabs.find(t => t.id === activeTabId)

  const updateActiveTab = (updates: Partial<TableTab>) => {
    if (!activeTabId) return
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, ...updates } : t))
  }

  const executeSql = async (sql: string) => {
    if (!sql.trim() || !activeTabId) return
    setExecuting(true)
    setError('')
    try {
      const result = await window.api.query(id, sql)
      if (result.success) {
        updateActiveTab({ 
          results: { rows: result.rows || [], fields: result.fields || [] },
          query: sql
        })
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
    if (!activeTab || !activeTab.pk) return
    const pkValue = row[activeTab.pk]
    const updateSql = `UPDATE "${activeTab.schema}"."${activeTab.name}" SET "${field}" = '${newValue.replace(/'/g, "''")}' WHERE "${activeTab.pk}" = '${pkValue}';`

    try {
      const result = await window.api.query(id, updateSql)
      if (result.success) {
        executeSql(activeTab.query)
      } else {
        setError(result.error || 'Update failed')
      }
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleStructureUpdate = async (column: string, field: 'column_name' | 'data_type', newValue: string) => {
     if (!activeTab) return
     let sql = ''
     if (field === 'column_name') {
       sql = `ALTER TABLE "${activeTab.schema}"."${activeTab.name}" RENAME COLUMN "${column}" TO "${newValue}";`
     } else if (field === 'data_type') {
       sql = `ALTER TABLE "${activeTab.schema}"."${activeTab.name}" ALTER COLUMN "${column}" TYPE ${newValue} USING "${column}"::${newValue};`
     }

     try {
       const result = await window.api.query(id, sql)
       if (result.success) {
         await fetchStructure(activeTab.schema, activeTab.name)
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
    if (result.success && result.rows) {
      if (activeTabId && activeTab?.name === name) {
        updateActiveTab({ structure: result.rows })
      }
      return result.rows
    }
    return []
  }

  const fetchTableData = async (schema: string, name: string, p: number, size: number, tabId?: string) => {
    const targetId = tabId || activeTabId
    if (!targetId) return

    setExecuting(true)
    setError('')
    try {
      const countResult = await window.api.query(id, `SELECT COUNT(*) FROM "${schema}"."${name}";`)
      let total = 0
      if (countResult.success && countResult.rows && countResult.rows.length > 0) {
        total = parseInt(countResult.rows[0].count || '0')
      }

      const q = `SELECT * FROM "${schema}"."${name}" LIMIT ${size} OFFSET ${(p - 1) * size};`
      const result = await window.api.query(id, q)
      
      setTabs(prev => prev.map(t => t.id === targetId ? {
        ...t,
        totalRows: total,
        query: q,
        page: p,
        pageSize: size,
        results: result.success ? { rows: result.rows || [], fields: result.fields || [] } : t.results
      } : t))

      if (!result.success) setError(result.error || 'Query failed')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setExecuting(false)
    }
  }

  const handleTableClick = async (schema: string, name: string) => {
    const existingTab = tabs.find(t => t.name === name && t.schema === schema)
    if (existingTab) {
      setActiveTabId(existingTab.id)
      return
    }

    const tabId = crypto.randomUUID()
    const newTab: TableTab = {
      id: tabId,
      type: 'table',
      schema,
      name,
      pk: null,
      page: 1,
      pageSize: 100,
      totalRows: 0,
      results: null,
      structure: [],
      query: `SELECT * FROM "${schema}"."${name}"`
    }

    setTabs(prev => [...prev, newTab])
    setActiveTabId(tabId)
    setViewMode('data')
    
    const [pkRes, structRows] = await Promise.all([
      window.api.query(id, `SELECT kcu.column_name FROM information_schema.table_constraints tco JOIN information_schema.key_column_usage kcu ON kcu.constraint_name = tco.constraint_name AND kcu.constraint_schema = tco.constraint_schema WHERE tco.constraint_type = 'PRIMARY KEY' AND tco.table_schema = '${schema}' AND tco.table_name = '${name}';`),
      fetchStructure(schema, name)
    ])

    const pk = (pkRes.success && pkRes.rows && pkRes.rows.length > 0) ? pkRes.rows[0].column_name : null

    setTabs(prev => prev.map(t => t.id === tabId ? { ...t, pk, structure: structRows } : t))
    await fetchTableData(schema, name, 1, 100, tabId)
  }

  const handleNewQuery = () => {
    const tabId = crypto.randomUUID()
    const newTab: TableTab = {
      id: tabId,
      type: 'query',
      name: 'New Query',
      results: null,
      query: '-- Write your SQL here\nSELECT * FROM '
    }
    setTabs(prev => [...prev, newTab])
    setActiveTabId(tabId)
  }

  const handleCloseTab = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation()
    const newTabs = tabs.filter(t => t.id !== tabId)
    setTabs(newTabs)
    if (activeTabId === tabId) {
      setActiveTabId(newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null)
    }
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

  const filteredTables = tables.filter(table => {
    if (!tableFilter) return true
    try {
      const regex = new RegExp(tableFilter, 'i')
      return regex.test(table.table_name)
    } catch (e) {
      return table.table_name.toLowerCase().includes(tableFilter.toLowerCase())
    }
  })

  return (
    <div data-testid={`session-view-${id}`} className="flex h-full w-full overflow-hidden bg-white text-gray-900" style={{ display: isActive ? 'flex' : 'none' }}>
      <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col">
        <div className="p-4 flex-1 overflow-y-auto">
          <div className="space-y-1">
            {tables.length > 0 && (
              <div className="mt-2">
                <div className="px-2 mb-4">
                  <input
                    type="text"
                    placeholder="Filter tables..."
                    value={tableFilter}
                    onChange={(e) => setTableFilter(e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  />
                </div>
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2 mb-2">Tables</h3>
                {filteredTables.map((table, i) => (
                  <div key={i} data-testid={`table-item-${table.table_name}`} onClick={() => handleTableClick(table.table_schema, table.table_name)} className={`group flex items-center gap-2 px-2 py-1 rounded-md hover:bg-gray-200 cursor-pointer transition-colors ${activeTab?.name === table.table_name ? 'bg-gray-200 text-blue-600' : 'text-gray-600'}`}>
                    <TableIcon size={14} className={`group-hover:text-blue-500 ${activeTab?.name === table.table_name ? 'text-blue-500' : 'text-gray-400'}`} />
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
        <div className="border-b border-gray-100 flex items-center px-4 justify-between bg-gray-50/50 h-10 gap-2">
          <div className="flex items-center gap-1 overflow-x-auto no-drag scrollbar-hide flex-1">
            {tabs.map(tab => (
              <div
                key={tab.id}
                data-testid={`tab-table-${tab.name}`}
                data-active={activeTabId === tab.id}
                onClick={() => setActiveTabId(tab.id)}
                className={`group flex items-center gap-2 px-3 py-1 text-[11px] font-medium rounded-md cursor-pointer transition-all border ${activeTabId === tab.id ? 'bg-white text-blue-600 shadow-sm border-gray-200' : 'bg-transparent text-gray-500 hover:bg-gray-200 border-transparent'}`}
              >
                {tab.type === 'table' ? (
                  <TableIcon size={12} className={activeTabId === tab.id ? 'text-blue-500' : 'text-gray-400'} />
                ) : (
                  <Play size={12} className={activeTabId === tab.id ? 'text-green-500' : 'text-gray-400'} />
                )}
                <span className="truncate max-w-[100px]">{tab.name}</span>
                <button
                  data-testid={`close-tab-${tab.name}`}
                  onClick={(e) => handleCloseTab(e, tab.id)}
                  className={`p-0.5 rounded-full hover:bg-gray-300 text-gray-400 hover:text-gray-700 transition-opacity ${activeTabId === tab.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              data-testid="btn-new-query"
              onClick={handleNewQuery}
              className="p-1.5 hover:bg-gray-200 rounded-md text-gray-500 transition-colors flex items-center gap-1"
              title="New SQL Query"
            >
              <Play size={14} />
              <span className="text-[10px] font-medium">Query</span>
            </button>

            {isConnected && activeTab && (
              <div className="flex bg-gray-200/50 p-1 rounded-lg no-drag">
                <button data-testid="tab-data" onClick={() => setViewMode('data')} className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${viewMode === 'data' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>Data</button>
                <button data-testid="tab-structure" onClick={() => setViewMode('structure')} className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${viewMode === 'structure' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>Structure</button>
              </div>
            )}
            {isConnected && (
               <>
                 <span className="text-[10px] text-gray-400 font-mono px-4 uppercase tracking-wider hidden md:block">Connected to {config.host}</span>
                 {viewMode === 'data' && activeTab && (
                   <button data-testid="btn-run-query" onClick={() => executeSql(activeTab.query)} disabled={executing} className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"><Play size={12} fill="currentColor" /> {executing ? 'Running...' : 'Run Query'}</button>
                 )}
               </>
            )}
          </div>
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
              {activeTab && (activeTab.type === 'query' || viewMode === 'data') ? (
                <>
                  <div className="flex-1 flex flex-col min-h-0 bg-white overflow-hidden relative">
                    {activeTab.type === 'query' && (
                      <div className="h-1/2 border-b border-gray-200 flex flex-col bg-white overflow-hidden">
                        <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                           <Play size={14} className="text-green-500" />
                           <span className="text-[11px] font-bold text-gray-500 uppercase tracking-tight">SQL Query</span>
                           <span className="text-[10px] text-gray-400 ml-auto italic">Cmd+Enter to Run</span>
                        </div>
                        <div className="flex-1">
                          <Editor
                            height="100%"
                            defaultLanguage="sql"
                            theme="vs"
                            value={activeTab.query}
                            onChange={(val) => updateActiveTab({ query: val || '' })}
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
                    )}

                    <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
                       <div className="flex items-center gap-4">
                         <span className="text-[11px] font-bold text-gray-500 uppercase tracking-tight">Results</span>
                         {activeTab.type === 'table' && activeTab.pk && <span className="text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded border border-green-100">Editable (PK: {activeTab.pk})</span>}
                       </div>
                    </div>
                    <div className="flex-1 overflow-auto pb-12">
                      {error && <div className="p-4 text-red-600 font-mono text-xs whitespace-pre-wrap bg-red-50/30">Error: {error}</div>}
                      {activeTab.results && activeTab.results.rows.length > 0 ? (
                        <table className="w-full border-collapse text-left text-xs font-mono">
                          <thead className="bg-gray-100 sticky top-0 z-10">
                            <tr>
                              {activeTab.results.fields.map((field, i) => {
                                const colInfo = activeTab.structure?.find(c => c.column_name === field.name)
                                                                  return (
                                                                    <th key={i} className="px-3 py-2 border-r border-b border-gray-200 text-gray-600 font-bold whitespace-nowrap">
                                                                      <div className="flex flex-col">
                                                                        <span>{field.name}</span>
                                                                        {colInfo && <span className="text-[9px] font-normal text-gray-400">{colInfo.data_type.replace(/ without time zone$/, '')}</span>}
                                                                      </div>
                                                                    </th>
                                                                  )
                                                                })}
                                                              </tr>
                                                            </thead>
                                                                                                                                                <tbody>
                                                                                                                                                  {activeTab.results.rows.map((row, i) => (
                                                                                                                                                    <tr 
                                                                                                                                                      key={i} 
                                                                                                                                                      data-editing={editingRowIndex === i}
                                                                                                                                                      className={`${editingRowIndex === i ? 'bg-blue-100' : 'hover:bg-blue-50/50'} border-b border-gray-100 transition-colors`}
                                                                                                                                                    >
                                                                                                                                                      {activeTab.results!.fields.map((field, j) => {
                                                                                                                                                                                            const colInfo = activeTab.structure?.find(c => c.column_name === field.name)
                                                                                                                                                                                            const isEditable = activeTab.type === 'table' && !!activeTab.pk && field.name !== activeTab.pk
                                                                                                                                                                                            return (
                                                                                                                                                                                              <td 
                                                                                                                                                                                                key={j} 
                                                                                                                                                                                                data-testid={`cell-${field.name}-${i}`} 
                                                                                                                                                                                                className="border-r border-gray-100 text-gray-600 whitespace-nowrap max-w-xs truncate p-0"
                                                                                                                                                                                                onDoubleClick={() => {
                                                                                                                                                                                                  if (isEditable) {
                                                                                                                                                                                                    setEditingRowIndex(i)
                                                                                                                                                                                                    setEditingCellData({ 
                                                                                                                                                                                                      value: row[field.name], 
                                                                                                                                                                                                      dataType: colInfo?.data_type,
                                                                                                                                                                                                      onSave: (newVal) => handleCellUpdate(row, field.name, newVal)
                                                                                                                                                                                                    })
                                                                                                                                                                                                  }
                                                                                                                                                                                                }}
                                                                                                                                                                                              >
                                                                                                                                                                                                <EditableCell 
                                                                                                                                                                                                  value={row[field.name]} 
                                                                                                                                                                                                  dataType={colInfo?.data_type}
                                                                                                                                                                                                  isEditable={isEditable} 
                                                                                                                                                                                                  onDoubleClick={() => {}} 
                                                                                                                                                                                                />
                                                                                                                                                                                              </td>
                                                                                                                                                                                            )
                                                                                                                                                                                          })}
                                                                                                                                                        
                                                                                                                                                    </tr>
                                                                                                                                                  ))}
                                                                                                                                                </tbody>
                                                                                                                    
                                                                                      </table>
                                                                                    ) : <div className="p-8 text-center text-gray-300 italic text-sm">No data found</div>}
                                                                                  </div>
                                                            
                                                                                  {/* Pagination in bottom right (Only for table tabs) */}
                                                                                  {activeTab.type === 'table' && activeTab.page !== undefined && activeTab.pageSize !== undefined && activeTab.totalRows !== undefined && (
                                                                                    <div className="absolute bottom-4 right-4 flex items-center gap-3 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg px-3 py-1.5 shadow-lg z-20">
                                                                                         <div className="flex items-center gap-1 border-r border-gray-100 pr-2 mr-1">
                                                                                           <button 
                                                                                             data-testid="btn-prev-page"
                                                                                             disabled={activeTab.page <= 1 || executing} 
                                                                                             onClick={() => {
                                                                                               const p = activeTab.page! - 1
                                                                                               fetchTableData(activeTab.schema!, activeTab.name, p, activeTab.pageSize!)
                                                                                             }}
                                                                                             className="p-1 hover:bg-gray-100 rounded disabled:opacity-30 text-gray-600"
                                                                                           >
                                                                                             <ChevronLeft size={14} />
                                                                                           </button>
                                                                                           <input 
                                                                                             data-testid="input-page-number"
                                                                                             type="number" 
                                                                                             value={activeTab.page} 
                                                                                             onChange={(e) => updateActiveTab({ page: parseInt(e.target.value) || 1 })}
                                                                                             onKeyDown={(e) => {
                                                                                               if (e.key === 'Enter') {
                                                                                                 const p = Math.max(1, Math.min(activeTab.page!, Math.ceil(activeTab.totalRows! / activeTab.pageSize!)))
                                                                                                 fetchTableData(activeTab.schema!, activeTab.name, p, activeTab.pageSize!)
                                                                                               }
                                                                                             }}
                                                                                             className="text-center text-xs font-medium focus:outline-none bg-transparent mx-1 no-arrows [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                                                             style={{ width: `${String(activeTab.page).length + 1}ch` }}
                                                                                           />
                                                                                           <span className="text-[10px] text-gray-400">/ {Math.ceil(activeTab.totalRows / activeTab.pageSize) || 1}</span>
                                                                                           <button 
                                                                                             data-testid="btn-next-page"
                                                                                             disabled={activeTab.page >= Math.ceil(activeTab.totalRows / activeTab.pageSize) || executing} 
                                                                                             onClick={() => {
                                                                                               const p = activeTab.page! + 1
                                                                                               fetchTableData(activeTab.schema!, activeTab.name, p, activeTab.pageSize!)
                                                                                             }}
                                                                                             className="p-1 hover:bg-gray-100 rounded disabled:opacity-30 text-gray-600"
                                                                                           >
                                                                                             <ChevronRight size={14} />
                                                                                           </button>
                                                                                         </div>
                                                            
                                                           <select 
                             data-testid="select-page-size"
                             value={activeTab.pageSize} 
                             onChange={(e) => {
                               const size = parseInt(e.target.value)
                               fetchTableData(activeTab.schema!, activeTab.name, 1, size)
                             }}
                             className="text-[10px] font-medium text-gray-600 focus:outline-none bg-transparent cursor-pointer"
                           >
                             <option value="50">50 / page</option>
                             <option value="100">100 / page</option>
                             <option value="500">500 / page</option>
                           </select>

                           <span className="text-[10px] text-gray-400 font-medium border-l border-gray-100 pl-2 ml-1">
                             Total: {activeTab.totalRows}
                           </span>
                      </div>
                    )}
                  </div>
                </>
              ) : activeTab && viewMode === 'structure' ? (
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
                        {activeTab.structure.map((col, i) => (
                          <tr key={i} className="hover:bg-gray-50 border-b border-gray-100 transition-colors">
                            <td className="border-r border-gray-100 p-0 h-10" data-testid={`struct-name-${i}`}>
                              <EditableCell 
                                value={col.column_name} 
                                isEditable={true} 
                                onDoubleClick={() => setEditingCell({
                                  value: col.column_name,
                                  onSave: (val) => handleStructureUpdate(col.column_name, 'column_name', val)
                                })} 
                              />
                            </td>
                            <td className="border-r border-gray-100 p-0 h-10" data-testid={`struct-type-${i}`}>
                              <EditableCell 
                                value={col.data_type} 
                                isEditable={true} 
                                onDoubleClick={() => setEditingCell({
                                  value: col.data_type,
                                  onSave: (val) => handleStructureUpdate(col.column_name, 'data_type', val)
                                })} 
                              />
                            </td>
                            <td className="px-4 py-2 border-r border-gray-100 text-gray-600">{col.is_nullable === 'YES' ? <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs">NULL</span> : <span className="px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded text-xs">NOT NULL</span>}</td>
                            <td className="px-4 py-2 text-gray-400 font-mono text-xs">{col.column_default}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-300 italic bg-gray-50/30">
                  Select a table from the sidebar to view its data
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <DataEditModal 
        isOpen={!!editingCellData} 
        value={editingCellData ? (editingCellData.dataType?.includes('json') && typeof editingCellData.value === 'object' ? JSON.stringify(editingCellData.value, null, 2) : String(editingCellData.value ?? '')) : ''} 
        onClose={() => {
          setEditingCellData(null)
          setEditingRowIndex(null)
        }} 
        onSave={(newVal) => {
          if (editingCellData) {
            editingCellData.onSave(newVal)
            setEditingCellData(null)
            setEditingRowIndex(null)
          }
        }} 
      />
    </div>
  )
}
