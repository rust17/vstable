import React, { useState, useEffect } from 'react'
import { Database, Plus, Server, Play, Table as TableIcon, Settings, Edit2, ChevronLeft, ChevronRight, X, Trash2, Check } from 'lucide-react'
import Editor from '@monaco-editor/react'
import { StructureView } from './StructureView'

const formatTimestamp = (value: any) => {
  if (value === null || value === undefined || value === '') return ''
  const date = new Date(value)
  if (isNaN(date.getTime())) return String(value)

  const pad = (n: number) => n.toString().padStart(2, '0')
  const y = date.getFullYear()
  const m = pad(date.getMonth() + 1)
  const d = pad(date.getDate())
  const h = pad(date.getHours())
  const min = pad(date.getMinutes())
  const s = pad(date.getSeconds())

  return `${y}-${m}-${d} ${h}:${min}:${s}`
}

const formatDisplayValue = (value: any, dataType?: string) => {
  if (value === null) return <span className="text-gray-300 italic">null</span>
  let display = String(value)
  if (dataType?.includes('json') && typeof value === 'object') {
    display = JSON.stringify(value, null, 2)
  } else if (dataType?.includes('timestamp') || dataType?.includes('date') || dataType?.includes('time')) {
    display = formatTimestamp(value)
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
            onKeyDown={e => {
              if (e.key === 'Escape') onClose()
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') onSave(val)
            }}
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

const TabSwitcher = ({ isOpen, tabs, mruTabIds, selectedIndex }: { isOpen: boolean, tabs: TableTab[], mruTabIds: string[], selectedIndex: number }) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/10 backdrop-blur-[1px]">
      <div className="bg-white w-full max-w-md rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in duration-150">
        <div className="bg-gray-50 px-4 py-2 border-b border-gray-100 flex items-center justify-between">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Switch Tab</span>
          <span className="text-[10px] text-gray-400">Ctrl + Tab to cycle</span>
        </div>
        <div className="py-2 max-h-[60vh] overflow-y-auto elastic-scroll">
          {mruTabIds.map((id, index) => {
            const tab = tabs.find(t => t.id === id)
            if (!tab) return null
            return (
              <div
                key={id}
                className={`px-4 py-2 flex items-center gap-3 transition-colors ${index === selectedIndex ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 text-gray-700'}`}
              >
                {tab.type === 'table' ? <TableIcon size={14} /> : <Play size={14} />}
                <span className="text-sm font-medium truncate flex-1">{tab.name}</span>
                {index === 0 && <span className={`text-[10px] ${index === selectedIndex ? 'text-blue-200' : 'text-gray-400'}`}>Active</span>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const ContextMenu = ({ x, y, onDelete, onClose }: { x: number, y: number, onDelete: () => void, onClose: () => void }) => {
  useEffect(() => {
    const handleClick = () => onClose()
    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [onClose])

  return (
    <div 
      className="fixed z-[300] bg-white border border-gray-200 shadow-lg rounded-lg py-1 min-w-[140px] animate-in fade-in zoom-in-95 duration-100"
      style={{ top: y, left: x }}
      onClick={e => e.stopPropagation()}
    >
      <button 
        onClick={() => { onDelete(); onClose() }}
        className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
      >
        <Trash2 size={14} /> Delete Row
      </button>
    </div>
  )
}

const TableSearchModal = ({ isOpen, onClose, tables, onSelect }: { isOpen: boolean, onClose: () => void, tables: {table_name: string, table_schema: string}[], onSelect: (schema: string, name: string) => void }) => {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
    }
  }, [isOpen])

  const filtered = tables.filter(t => 
    t.table_name.toLowerCase().includes(query.toLowerCase()) || 
    t.table_schema.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 10)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] bg-black/20 backdrop-blur-[2px]" onClick={onClose}>
      <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-in slide-in-from-top-4 duration-200" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-3 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
            <Database size={18} className="text-gray-400" />
            <input
              autoFocus
              placeholder="Search tables..."
              className="flex-1 bg-transparent border-none outline-none text-sm text-gray-800"
              value={query}
              onChange={e => {
                setQuery(e.target.value)
                setSelectedIndex(0)
              }}
              onKeyDown={e => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  setSelectedIndex(prev => (prev + 1) % Math.max(1, filtered.length))
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault()
                  setSelectedIndex(prev => (prev - 1 + filtered.length) % Math.max(1, filtered.length))
                } else if (e.key === 'Enter' && filtered[selectedIndex]) {
                  onSelect(filtered[selectedIndex].table_schema, filtered[selectedIndex].table_name)
                } else if (e.key === 'Escape') {
                  onClose()
                }
              }}
            />
          </div>
        </div>
        <div className="max-h-[50vh] overflow-y-auto py-2 elastic-scroll">
          {filtered.length > 0 ? filtered.map((t, i) => (
            <div
              key={`${t.table_schema}.${t.table_name}`}
              className={`px-4 py-3 flex items-center gap-3 cursor-pointer transition-colors ${i === selectedIndex ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 text-gray-700'}`}
              onClick={() => onSelect(t.table_schema, t.table_name)}
            >
              <TableIcon size={16} className={i === selectedIndex ? 'text-blue-200' : 'text-gray-400'} />
              <div className="flex flex-col">
                <span className="text-sm font-semibold">{t.table_name}</span>
                <span className={`text-[10px] ${i === selectedIndex ? 'text-blue-100' : 'text-gray-400'}`}>{t.table_schema}</span>
              </div>
            </div>
          )) : (
            <div className="px-4 py-8 text-center text-gray-400 text-sm italic">No tables found</div>
          )}
        </div>
        <div className="bg-gray-50 px-4 py-2 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-400">
          <span>↑↓ to navigate, Enter to open</span>
          <span>Esc to close</span>
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

interface FilterCondition {
  id: string
  column: string
  operator: string
  value: string
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
  filters?: FilterCondition[]
  isAddingRow?: boolean
  newRowData?: Record<string, any>
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
  const [mruTabIds, setMruTabIds] = useState<string[]>([])
  const [showTabSwitcher, setShowTabSwitcher] = useState(false)
  const [switcherIndex, setSwitcherIndex] = useState(0)

  const [showTableSearch, setShowTableSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchIndex, setSearchIndex] = useState(0)

  const [executing, setExecuting] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, row: any } | null>(null)

  // Track MRU
  useEffect(() => {
    if (activeTabId && !showTabSwitcher) {
      setMruTabIds(prev => {
        const filtered = prev.filter(id => id !== activeTabId && tabs.some(t => t.id === id))
        return [activeTabId, ...filtered]
      })
    }
  }, [activeTabId, showTabSwitcher, tabs])

  // Cleanup MRU when tabs are closed
  useEffect(() => {
    setMruTabIds(prev => prev.filter(id => tabs.some(t => t.id === id)))
  }, [tabs])
  const [viewMode, setViewMode] = useState<'data' | 'structure'>('data')
  const [isMaximized, setIsMaximized] = useState(false)
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null)
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null)
  const [editingCellData, setEditingCellData] = useState<{value: any, dataType?: string, onSave: (val: string) => void} | null>(null)

  const sidebarFilterRef = React.useRef<HTMLInputElement>(null)
  const filterInputRef = React.useRef<HTMLInputElement>(null)

  const activeTab = tabs.find(t => t.id === activeTabId)

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd + P: Fuzzy table search
      if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
        e.preventDefault()
        setShowTableSearch(true)
      }

      // Cmd + F: Focus filter
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault()
        filterInputRef.current?.focus()
      }

      // Cmd + T: New Query
      if ((e.metaKey || e.ctrlKey) && e.key === 't') {
        e.preventDefault()
        handleNewQuery()
      }

      // Cmd + W: Close current tab
      if ((e.metaKey || e.ctrlKey) && e.key === 'w') {
        e.preventDefault()
        if (activeTabId) handleCloseTab(e as any, activeTabId)
      }

      // Cmd + R: Refresh
      if ((e.metaKey || e.ctrlKey) && e.key === 'r') {
        e.preventDefault()
        if (activeTab) {
          if (activeTab.type === 'table') {
            fetchTableData(activeTab.schema!, activeTab.name, activeTab.page || 1, activeTab.pageSize || 100)
          } else {
            executeSql(activeTab.query)
          }
        }
      }

      // Ctrl + Tab: Switch Tab (MRU)
      if (e.ctrlKey && e.key === 'Tab') {
        e.preventDefault()
        if (mruTabIds.length > 1) {
          if (!showTabSwitcher) {
            setShowTabSwitcher(true)
            setSwitcherIndex(1)
          } else {
            setSwitcherIndex(prev => (prev + 1) % mruTabIds.length)
          }
        }
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control' && showTabSwitcher) {
        const targetId = mruTabIds[switcherIndex]
        if (targetId) setActiveTabId(targetId)
        setShowTabSwitcher(false)
        setSwitcherIndex(0)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [tabs, activeTabId, activeTab, mruTabIds, showTabSwitcher, switcherIndex])

  const updateActiveTab = (updates: Partial<TableTab>) => {
    if (!activeTabId) return
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, ...updates } : t))
  }

  const handleAddFilter = () => {
    if (!activeTab) return
    const newFilter: FilterCondition = { id: crypto.randomUUID(), column: '', operator: '=', value: '' }
    if (activeTab.structure && activeTab.structure.length > 0) {
      newFilter.column = activeTab.structure[0].column_name
    }
    const currentFilters = activeTab.filters || []
    updateActiveTab({ filters: [...currentFilters, newFilter] })
  }

  const handleRemoveFilter = (filterId: string) => {
    if (!activeTab || !activeTab.filters) return
    updateActiveTab({ filters: activeTab.filters.filter(f => f.id !== filterId) })
  }

  const handleUpdateFilter = (filterId: string, field: keyof FilterCondition, val: string) => {
    if (!activeTab || !activeTab.filters) return
    updateActiveTab({ filters: activeTab.filters.map(f => f.id === filterId ? { ...f, [field]: val } : f) })
  }

  const handleApplyFilters = () => {
    if (!activeTab) return
    fetchTableData(activeTab.schema!, activeTab.name, 1, activeTab.pageSize || 100)
  }

  const executeSql = async (sql: string) => {
    if (!sql.trim() || !activeTabId) return
    setExecuting(true)
    setError('')
    setSelectedRowIndex(null)
    setEditingRowIndex(null)
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
    setSelectedRowIndex(null)
    setEditingRowIndex(null)
    try {
      const currentTab = tabs.find(t => t.id === targetId)
      const currentFilters = currentTab?.filters || []

      let whereClause = ''
      if (currentFilters.length > 0) {
        const conditions = currentFilters.filter(f => f.column && f.value).map(f => {
          const val = f.value.replace(/'/g, "''")
          return `"${f.column}" ${f.operator} '${val}'`
        })
        if (conditions.length > 0) {
          whereClause = ` WHERE ${conditions.join(' AND ')}`
        }
      }

      const countResult = await window.api.query(id, `SELECT COUNT(*) FROM "${schema}"."${name}"${whereClause};`)
      let total = 0
      if (countResult.success && countResult.rows && countResult.rows.length > 0) {
        total = parseInt(countResult.rows[0].count || '0')
      }

      const q = `SELECT * FROM "${schema}"."${name}"${whereClause} LIMIT ${size} OFFSET ${(p - 1) * size};`
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

  const handleStartAddRow = () => {
    updateActiveTab({ isAddingRow: true, newRowData: {} })
  }

  const handleCancelAddRow = () => {
    updateActiveTab({ isAddingRow: false, newRowData: {} })
  }

  const handleNewRowChange = (column: string, value: string) => {
    if (!activeTab) return
    const current = activeTab.newRowData || {}
    updateActiveTab({ newRowData: { ...current, [column]: value } })
  }

  const handleSaveNewRow = async () => {
    if (!activeTab) return
    const data = activeTab.newRowData || {}
    const columns = Object.keys(data)
    
    let sql = ''
    if (columns.length === 0) {
      sql = `INSERT INTO "${activeTab.schema}"."${activeTab.name}" DEFAULT VALUES;`
    } else {
      const cols = columns.map(c => `"${c}"`).join(', ')
      const vals = columns.map(c => `'${String(data[c]).replace(/'/g, "''")}'`).join(', ')
      sql = `INSERT INTO "${activeTab.schema}"."${activeTab.name}" (${cols}) VALUES (${vals});`
    }

    setExecuting(true)
    try {
      const result = await window.api.query(id, sql)
      if (result.success) {
        updateActiveTab({ isAddingRow: false, newRowData: {} })
        fetchTableData(activeTab.schema!, activeTab.name, activeTab.page || 1, activeTab.pageSize || 100)
      } else {
        const msg = result.error || 'Insert failed'
        setError(msg)
        window.alert(msg)
      }
    } catch (err: any) {
      setError(err.message)
      window.alert(err.message)
    } finally {
      setExecuting(false)
    }
  }

  const handleDeleteRow = async () => {
    if (!activeTab || !activeTab.pk || !contextMenu) return
    if (!window.confirm('Are you sure you want to delete this row?')) return

    const row = contextMenu.row
    const pkValue = row[activeTab.pk]
    const sql = `DELETE FROM "${activeTab.schema}"."${activeTab.name}" WHERE "${activeTab.pk}" = '${String(pkValue).replace(/'/g, "''")}';`
    
    setExecuting(true)
    try {
      const result = await window.api.query(id, sql)
      if (result.success) {
        fetchTableData(activeTab.schema!, activeTab.name, activeTab.page || 1, activeTab.pageSize || 100)
      } else {
        const msg = result.error || 'Delete failed'
        setError(msg)
        window.alert(msg)
      }
    } catch (err: any) {
      setError(err.message)
      window.alert(err.message)
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
      query: `SELECT * FROM "${schema}"."${name}"`,
      filters: [{ id: crypto.randomUUID(), column: '', operator: '=', value: '' }]
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
      <div className={`${isMaximized ? 'hidden' : 'w-64'} bg-gray-50 border-r border-gray-200 flex flex-col`}>
        <div data-testid="sidebar-scroll" className="p-4 flex-1 overflow-y-auto elastic-scroll">
          <div className="space-y-1">
            {tables.length > 0 && (
              <div className="mt-2">
                <div className="px-2 mb-4">
                  <input
                    ref={sidebarFilterRef}
                    type="text"
                    placeholder="Filter tables..."
                    value={tableFilter}
                    onChange={(e) => setTableFilter(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && filteredTables.length > 0) {
                        handleTableClick(filteredTables[0].table_schema, filteredTables[0].table_name)
                        // Optional: Clear filter after selection? Maybe better to keep it.
                        // setTableFilter('')
                      }
                    }}
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
                onDoubleClick={() => setIsMaximized(!isMaximized)}
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

                    {/* Filter Bar as the primary header for results */}
                    {activeTab.type === 'table' && (
                      <div className="px-4 py-2 border-b border-gray-100 bg-gray-50 flex flex-col gap-2">
                        {(activeTab.filters || []).map((filter, index) => (
                          <div key={filter.id} data-testid={`filter-row-${index}`} className="flex items-center gap-2">
                            <select
                              data-testid={`filter-column-${index}`}
                              className="text-xs border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-[150px]"
                              value={filter.column}
                              onChange={e => handleUpdateFilter(filter.id, 'column', e.target.value)}
                            >
                              {activeTab.structure?.length ? activeTab.structure.map(c => (
                                <option key={c.column_name} value={c.column_name}>{c.column_name}</option>
                              )) : <option value="">Select column...</option>}
                            </select>
                            <select
                              data-testid={`filter-operator-${index}`}
                              className="text-xs border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 w-16"
                              value={filter.operator}
                              onChange={e => handleUpdateFilter(filter.id, 'operator', e.target.value)}
                            >
                              <option value="=">=</option>
                              <option value="!=">!=</option>
                              <option value=">">&gt;</option>
                              <option value="<">&lt;</option>
                              <option value=">=">&gt;=</option>
                              <option value="<=">&lt;=</option>
                              <option value="LIKE">LIKE</option>
                              <option value="ILIKE">ILIKE</option>
                            </select>
                            <input
                              ref={index === 0 ? filterInputRef : null}
                              data-testid={`filter-value-${index}`}
                              type="text"
                              className="flex-1 text-xs border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                              placeholder="Value"
                              value={filter.value}
                              onChange={e => handleUpdateFilter(filter.id, 'value', e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleApplyFilters()
                              }}
                            />
                            <button
                              data-testid={`btn-remove-filter-${index}`}
                              onClick={() => handleRemoveFilter(filter.id)}
                              className="p-1 hover:bg-red-100 text-gray-400 hover:text-red-500 rounded transition-colors"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                        <div className="flex items-center gap-2 mt-1">
                          <button
                            data-testid="btn-add-filter"
                            onClick={handleAddFilter}
                            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded transition-colors border border-transparent hover:border-blue-100"
                          >
                            <Plus size={12} /> Add Filter
                          </button>
                          {activeTab.isAddingRow ? (
                            <>
                              <button
                                data-testid="btn-save-row"
                                onClick={handleSaveNewRow}
                                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded transition-colors shadow-sm"
                              >
                                <Check size={12} /> Save Row
                              </button>
                              <button
                                data-testid="btn-cancel-row"
                                onClick={handleCancelAddRow}
                                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded transition-colors border border-gray-200"
                              >
                                <X size={12} /> Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              data-testid="btn-add-row"
                              onClick={handleStartAddRow}
                              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-600 hover:bg-green-50 rounded transition-colors border border-transparent hover:border-green-100"
                            >
                              <Plus size={12} /> Add Row
                            </button>
                          )}
                          {(activeTab.filters || []).length > 0 && (
                            <button
                              data-testid="btn-apply-filter"
                              onClick={handleApplyFilters}
                              className="px-3 py-1 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors shadow-sm"
                            >
                              Apply Filter
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                    <div data-testid="results-scroll" className="flex-1 overflow-auto pb-12 elastic-scroll">
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
                                data-selected={selectedRowIndex === i}
                                onClick={() => setSelectedRowIndex(i)}
                                className={`${(editingRowIndex === i || selectedRowIndex === i) ? 'bg-blue-100' : 'hover:bg-blue-50/50'} border-b border-gray-100 transition-colors cursor-context-menu`}
                                onContextMenu={(e) => {
                                  e.preventDefault()
                                  setSelectedRowIndex(i)
                                  setContextMenu({ x: e.clientX, y: e.clientY, row })
                                }}
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
                                          setSelectedRowIndex(i)
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
                                        onDoubleClick={() => { }}
                                      />
                                    </td>
                                  )
                                })}
                              </tr>
                            ))}
                            {activeTab.isAddingRow && (
                              <tr className="bg-green-50 sticky bottom-0 z-20 shadow-sm border-t-2 border-green-200">
                                {(activeTab.results?.fields || activeTab.structure?.map(s => ({ name: s.column_name })) || []).map((field, j) => {
                                  const colInfo = activeTab.structure?.find(c => c.column_name === field.name)
                                  const isAuto = colInfo?.column_default?.startsWith('nextval') || colInfo?.data_type === 'serial'

                                  return (
                                    <td key={j} className="border-r border-green-200 p-0 min-w-[100px]">
                                      <input
                                        autoFocus={!isAuto && j === 0}
                                        disabled={!!isAuto}
                                        className={`w-full h-full px-3 py-2 text-xs bg-transparent focus:outline-none focus:bg-white placeholder:text-green-300/50 font-mono ${isAuto ? 'bg-gray-50/50 text-gray-400 cursor-not-allowed italic' : 'text-gray-700'}`}
                                        placeholder={isAuto ? '(auto)' : field.name}
                                        value={activeTab.newRowData?.[field.name] || ''}
                                        onChange={(e) => handleNewRowChange(field.name, e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Escape') handleCancelAddRow()
                                        }}
                                      />
                                    </td>
                                  )
                                })}
                              </tr>
                            )}
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
                <StructureView
                  connectionId={id}
                  schema={activeTab.schema || 'public'}
                  tableName={activeTab.name}
                  onClose={() => setViewMode('data')}
                />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-300 italic bg-gray-50/30">
                  Select a table from the sidebar to view its data
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onDelete={handleDeleteRow}
          onClose={() => setContextMenu(null)}
        />
      )}

      <DataEditModal
        isOpen={!!editingCellData}
        value={editingCellData ? (
          editingCellData.dataType?.includes('json') && typeof editingCellData.value === 'object'
            ? JSON.stringify(editingCellData.value, null, 2)
            : (editingCellData.dataType?.includes('timestamp') || editingCellData.dataType?.includes('date') || editingCellData.dataType?.includes('time'))
              ? formatTimestamp(editingCellData.value)
              : String(editingCellData.value ?? '')
        ) : ''}
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

      <TabSwitcher
        isOpen={showTabSwitcher}
        tabs={tabs}
        mruTabIds={mruTabIds}
        selectedIndex={switcherIndex}
      />

      <TableSearchModal
        isOpen={showTableSearch}
        onClose={() => setShowTableSearch(false)}
        tables={tables}
        onSelect={(schema, name) => {
          handleTableClick(schema, name)
          setShowTableSearch(false)
        }}
      />
    </div>
  )
}
