import React, { useEffect, useState } from 'react'
import { Plus, Settings, Play, Table as TableIcon, X } from 'lucide-react'
import { SessionProvider, useSession } from '../../providers/SessionProvider'
import { useWorkspace } from '../../hooks/useWorkspace'
import { useDatabaseMetadata } from '../../hooks/useDatabaseMetadata'
import { DatabaseTree } from '../navigator/DatabaseTree'
import { ConnectionForm } from '../navigator/ConnectionForm'
import { TableTabPane } from './TableTabPane'
import { QueryTabPane } from './QueryTabPane'
import { StructureView } from '../schema-designer/StructureView'
import { TabSwitcher } from '../../ui/tab-switcher/TabSwitcher'
import { TableSearchModal } from '../../ui/modals/TableSearchModal'
import { CreateDatabaseModal } from '../../ui/modals/CreateDatabaseModal'
import { Tooltip } from '../../ui/tooltip/Tooltip'

interface SessionViewProps {
  id: string
  isActive: boolean
  onUpdateTitle: (title: string) => void
}

const SessionContent: React.FC<{ isActive: boolean }> = ({ isActive }) => {
  const { isConnected, config, sessionId, query, buildQuery, connect, disconnect, capabilities } = useSession()
  const q = capabilities?.quoteChar || '"'
  const quote = (id: string) => `${q}${id}${q}`

  const {
    tabs, activeTabId, setActiveTabId,
    openTable, openQuery, openStructure, closeTab, updateTab,
    mruTabIds, showTabSwitcher, setShowTabSwitcher, switcherIndex, setSwitcherIndex
  } = useWorkspace()

  const showTabSwitcherRef = React.useRef(showTabSwitcher)
  useEffect(() => {
    showTabSwitcherRef.current = showTabSwitcher
  }, [showTabSwitcher])

  const {
    databases, schemas, currentSchema, setCurrentSchema, tables,
    fetchDatabases, fetchTables
  } = useDatabaseMetadata()

  const [showTableSearch, setShowTableSearch] = useState(false)
  const [showCreateDb, setShowCreateDb] = useState(false)
  const [isMaximized, setIsMaximized] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(256)
  const [isResizing, setIsResizing] = useState(false)

  const activeTab = tabs.find(t => t.id === activeTabId)
  const [tabContextMenu, setTabContextMenu] = useState<{ x: number, y: number, tabId: string } | null>(null)
  const tabContainerRef = React.useRef<HTMLDivElement>(null)

  const handleCloseOthers = (tabId: string) => {
      tabs.forEach(t => { if (t.id !== tabId) closeTab(t.id) })
  }

  const handleCloseAll = () => {
      tabs.forEach(t => closeTab(t.id))
  }

  const handleCloseToRight = (tabId: string) => {
      const idx = tabs.findIndex(t => t.id === tabId)
      if (idx !== -1) {
          tabs.slice(idx + 1).forEach(t => closeTab(t.id))
      }
  }

  // Scroll active tab into view
  useEffect(() => {
    if (activeTabId && tabContainerRef.current) {
      const activeElement = tabContainerRef.current.querySelector(`[data-active="true"]`)
      if (activeElement && typeof activeElement.scrollIntoView === 'function') {
        activeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
      }
    }
  }, [activeTabId])

  // Update window title
  useEffect(() => {
    if (isActive && config.database) {
      document.title = `${config.database} - QuickPG`
    }
  }, [isActive, config.database])

  // Handle resizing
  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(150, Math.min(600, e.clientX))
      setSidebarWidth(newWidth)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing])

  const handleSwitchDatabase = async (db: string) => {
     if(db === config.database) return
     await disconnect()
     await connect({ ...config, database: db })
  }

  const handleCreateDatabase = async (name: string) => {
    setShowCreateDb(false)
    const res = await query(`CREATE DATABASE ${quote(name)};`)
    if (res.success) {
        fetchDatabases()
        if (confirm(`Database "${name}" created. Switch to it?`)) {
            handleSwitchDatabase(name)
        }
    } else {
        alert('Failed to create database: ' + res.error)
    }
  }

  const handleDeleteDatabase = async (name: string | string[]) => {
      const names = Array.isArray(name) ? name : [name]
      if (names.includes(config.database)) {
          alert("Cannot delete the currently connected database.")
          return
      }
      const message = names.length > 1
          ? `Are you sure you want to DELETE ${names.length} databases?`
          : `Are you sure you want to DELETE database "${names[0]}"?`

      if (!confirm(message)) return

      for (const n of names) {
          const res = await query(`DROP DATABASE ${quote(n)};`)
          if (!res.success) {
              alert(`Failed to delete database "${n}": ` + res.error)
              break
          }
      }
      fetchDatabases()
  }

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isActive) return
    const handleKeyDown = (e: KeyboardEvent) => {
        // Cmd+W: Close Tab
        if ((e.metaKey || e.ctrlKey) && e.key === 'w' && activeTabId) {
            e.preventDefault()
            closeTab(activeTabId)
        }
        // Cmd+T: New Query
        if ((e.metaKey || e.ctrlKey) && e.key === 't') {
            e.preventDefault()
            openQuery()
        }
        // Cmd+R: Refresh
        if ((e.metaKey || e.ctrlKey) && e.key === 'r' && activeTabId) {
            e.preventDefault()
            updateTab(activeTabId, { refreshKey: Date.now() })
        }
        // Cmd+F: Focus Filter
        if ((e.metaKey || e.ctrlKey) && e.key === 'f' && activeTabId) {
            e.preventDefault()
            updateTab(activeTabId, { focusKey: Date.now() })
        }
        // Cmd+P: Fuzzy Search
        if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
            e.preventDefault()
            setShowTableSearch(true)
        }
        // Ctrl+Tab: Switch Tab
        if (e.ctrlKey && e.key === 'Tab') {
            e.preventDefault()
            setShowTabSwitcher(true)
            setSwitcherIndex(prev => {
               // On first press of Ctrl+Tab, we want to go to the NEXT MRU tab (index 1)
               if (!showTabSwitcher) return mruTabIds.length > 1 ? 1 : 0
               const next = prev + 1
               return next >= mruTabIds.length ? 0 : next
            })
        }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control') {
         if (showTabSwitcherRef.current) {
           setShowTabSwitcher(false)
           showTabSwitcherRef.current = false
           const selectedId = mruTabIds[switcherIndex]
           if (selectedId && tabs.some(t => t.id === selectedId)) {
             setActiveTabId(selectedId)
           }
           setSwitcherIndex(0)
         }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
        window.removeEventListener('keydown', handleKeyDown)
        window.removeEventListener('keyup', handleKeyUp)
    }
  }, [isActive, activeTabId, closeTab, openQuery, mruTabIds, showTabSwitcher, switcherIndex])

  return (
    <div
      data-theme={config.dialect === 'mysql' ? 'mysql' : 'postgres'}
      className="h-full w-full"
      style={{ display: isActive ? 'flex' : 'none' }}
    >
      {!isConnected ? (
        <ConnectionForm />
      ) : (
        <div data-testid={`session-view-${sessionId}`} className="flex h-full w-full overflow-hidden bg-white text-gray-900">
          {/* Sidebar */}
          <div className={`${isMaximized ? 'hidden' : ''} bg-gray-50 border-r border-gray-200 flex flex-col relative`} style={{ width: isMaximized ? 0 : sidebarWidth }}>
        <div className="flex-1 min-h-0 overflow-hidden">
           <DatabaseTree
             databases={databases}
             schemas={schemas}
             currentSchema={currentSchema}
             tables={tables}
             activeTable={activeTab?.type === 'table' ? { schema: activeTab.schema!, name: activeTab.name } : null}
             onSelectSchema={setCurrentSchema}
             onSelectTable={async (schema, name) => {
                 const tab = openTable(schema, name)
                 // Ensure structure is loaded
                 if (!tab.structure || tab.structure.length === 0) {
                     const colSql = buildQuery('listColumns', { db: config.database, schema, table: name })
                     const res = await query(colSql)
                     if (res.success && res.rows) {
                         // Normalize keys to lowercase for consistent access across dialects
                         const normalizedRows = res.rows.map((row: any) => {
                            const normalized: any = {}
                            Object.keys(row).forEach(key => {
                                normalized[key.toLowerCase()] = row[key]
                            })
                            return normalized
                         })

                         const pkSql = buildQuery('getPrimaryKey', { db: config.database, schema, table: name })
                         const pkRes = await query(pkSql)
                         const pkRow = pkRes.success && pkRes.rows && pkRes.rows[0]
                         const pk = pkRow ? (pkRow.column_name || pkRow.COLUMN_NAME || Object.values(pkRow)[0]) : null

                         updateTab(tab.id, { structure: normalizedRows, pk: pk as string })
                     }
                 }
             }}
             onSwitchDatabase={handleSwitchDatabase}
             onCreateDatabase={() => setShowCreateDb(true)}
             onDeleteDatabase={handleDeleteDatabase}
             onCreateTable={() => openStructure(currentSchema, '', 'create')}
             onDeleteTable={async (schema, name) => {
                 const names = Array.isArray(name) ? name : [name]
                 const message = names.length > 1
                     ? `Delete ${names.length} tables from ${schema}?`
                     : `Delete table ${schema}.${names[0]}?`

                 if(confirm(message)) {
                     const tableList = names.map(n => {
                         if (capabilities?.supportsSchemas) return `${quote(schema)}.${quote(n)}`
                         return quote(n)
                     }).join(', ')
                     const res = await query(`DROP TABLE ${tableList}`)
                     if (res.success) {
                        fetchTables()
                     } else {
                        alert('Failed to delete tables: ' + res.error)
                     }
                 }
             }}
             onRefreshTables={fetchTables}
           />
        </div>
        <div className="h-12 px-4 border-t border-gray-200 flex items-center gap-2 shrink-0">
            <Settings size={16} className="text-gray-400 cursor-pointer hover:text-gray-600" />
        </div>

        {/* Resize Handle */}
        <div
           onMouseDown={() => setIsResizing(true)}
           className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary-400/50 transition-colors z-50 ${isResizing ? 'bg-primary-500' : ''}`}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
         {/* Tab Bar */}
         <div
            className="border-b border-gray-200 flex items-center px-2 justify-between bg-[#f8f9fa] h-11 gap-2 select-none overflow-hidden"
            onDoubleClick={(e) => {
                if (e.target === e.currentTarget) setIsMaximized(!isMaximized)
            }}
         >
            <div
                ref={tabContainerRef}
                className="flex items-end gap-1 overflow-x-auto no-drag scrollbar-hide flex-1 h-full"
                onDoubleClick={(e) => {
                    if (e.target === e.currentTarget) setIsMaximized(!isMaximized)
                }}
            >
                {tabs.map(tab => (
                    <Tooltip key={tab.id} content={tab.type === 'table' ? `${tab.schema}.${tab.name}` : tab.name}>
                        <div
                            data-testid={`tab-table-${tab.name}`}
                            data-active={activeTabId === tab.id}
                            onClick={() => setActiveTabId(tab.id)}
                            onDoubleClick={() => setIsMaximized(!isMaximized)}
                            onContextMenu={(e) => {
                                e.preventDefault()
                                setTabContextMenu({ x: e.clientX, y: e.clientY, tabId: tab.id })
                            }}
                            className={`group flex items-center gap-2 px-4 h-9 text-[11px] font-medium rounded-t-lg cursor-pointer transition-all border-x border-t ${activeTabId === tab.id ? 'bg-white text-primary-600 border-gray-200 -mb-[1px] z-10 shadow-[0_-1px_3px_rgba(0,0,0,0.02)]' : 'bg-transparent text-gray-500 hover:bg-gray-200/50 border-transparent'}`}
                        >
                            {tab.type === 'table' ? <TableIcon size={12} className={activeTabId === tab.id ? 'text-primary-500' : 'text-gray-400'} /> : tab.type === 'query' ? <Play size={12} className={activeTabId === tab.id ? 'text-primary-500' : 'text-gray-400'} /> : <Settings size={12} className={activeTabId === tab.id ? 'text-primary-500' : 'text-gray-400'} />}
                            <span className="truncate max-w-[120px]">{tab.name}</span>
                            <button
                                data-testid={`close-tab-${tab.name}`}
                                onClick={(e) => { e.stopPropagation(); closeTab(tab.id) }}
                                className={`p-0.5 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-700 transition-opacity ${activeTabId === tab.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                            >
                                <X size={10} />
                            </button>
                        </div>
                    </Tooltip>
                ))}
            </div>
         </div>

         {/* Tab Content */}
         <div className="flex-1 flex flex-col overflow-hidden relative bg-white">
            {tabs.map(tab => (
                <div
                  key={tab.id}
                  data-testid={activeTabId === tab.id ? 'active-tab-content' : `inactive-tab-content-${tab.id}`}
                  className="w-full h-full"
                  style={{ display: activeTabId === tab.id ? 'block' : 'none' }}
                >
                    {tab.type === 'table' ? (
                        <TableTabPane
                            tab={tab}
                            isActive={activeTabId === tab.id}
                            onUpdateTab={(updates) => updateTab(tab.id, updates)}
                            connectionId={sessionId}
                            onOpenStructure={(schema, name) => openStructure(schema, name, 'edit')}
                        />
                    ) : tab.type === 'query' ? (
                        <QueryTabPane
                            tab={tab}
                            isActive={activeTabId === tab.id}
                            onUpdateTab={(updates) => updateTab(tab.id, updates)}
                        />
                    ) : (
                        <StructureView
                            connectionId={sessionId}
                            schema={tab.initialSchema || currentSchema}
                            tableName={tab.initialTableName || ''}
                            mode={tab.mode || 'edit'}
                            onClose={() => closeTab(tab.id)}
                            onSaveSuccess={(schema, name) => {
                                updateTab(tab.id, {
                                    mode: 'edit',
                                    name: `Structure: ${name}`,
                                    initialSchema: schema,
                                    initialTableName: name
                                })
                                fetchTables()
                            }}
                        />
                    )}
                </div>
            ))}
            {tabs.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-300 italic bg-gray-50/30">
                  Select a table from the sidebar to view its data
                </div>
            )}
         </div>
      </div>

      {tabContextMenu && (
        <>
            <div className="fixed inset-0 z-[100]" onClick={() => setTabContextMenu(null)} />
            <div 
                className="fixed z-[101] bg-white border border-gray-200 shadow-xl rounded-lg py-1 min-w-[160px] animate-in fade-in zoom-in-95 duration-100"
                style={{ top: tabContextMenu.y, left: tabContextMenu.x }}
            >
                <button 
                    onClick={() => { closeTab(tabContextMenu.tabId); setTabContextMenu(null) }}
                    className="w-full text-left px-3 py-1.5 text-[11px] text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-between"
                >
                    Close <span className="text-[9px] text-gray-400">Cmd+W</span>
                </button>
                <button 
                    onClick={() => { handleCloseOthers(tabContextMenu.tabId); setTabContextMenu(null) }}
                    className="w-full text-left px-3 py-1.5 text-[11px] text-gray-700 hover:bg-gray-50 transition-colors"
                >
                    Close Others
                </button>
                <button 
                    onClick={() => { handleCloseToRight(tabContextMenu.tabId); setTabContextMenu(null) }}
                    className="w-full text-left px-3 py-1.5 text-[11px] text-gray-700 hover:bg-gray-50 transition-colors"
                >
                    Close Tabs to Right
                </button>
                <div className="border-t border-gray-100 my-1" />
                <button 
                    onClick={() => { handleCloseAll(); setTabContextMenu(null) }}
                    className="w-full text-left px-3 py-1.5 text-[11px] text-red-600 hover:bg-red-50 transition-colors"
                >
                    Close All
                </button>
            </div>
        </>
      )}

      <TabSwitcher
        isOpen={showTabSwitcher}
        tabs={tabs}
        mruTabIds={mruTabIds}
        selectedIndex={switcherIndex}
        onSelect={(id) => {
            setShowTabSwitcher(false)
            showTabSwitcherRef.current = false
            setActiveTabId(id)
            setSwitcherIndex(0)
        }}
      />

      <TableSearchModal
        isOpen={showTableSearch}
        onClose={() => setShowTableSearch(false)}
        tables={tables}
        onSelect={(schema, name) => {
            openTable(schema, name)
            setShowTableSearch(false)
        }}
      />

      <CreateDatabaseModal
        isOpen={showCreateDb}
        onClose={() => setShowCreateDb(false)}
        onCreate={handleCreateDatabase}
      />
    </div>
    )}
    </div>
  )
}

export const SessionView: React.FC<SessionViewProps> = (props) => {
  return (
    <SessionProvider id={props.id} onUpdateTitle={props.onUpdateTitle}>
       <SessionContent isActive={props.isActive} />
    </SessionProvider>
  )
}
