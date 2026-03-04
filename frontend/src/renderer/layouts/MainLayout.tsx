import React, { useEffect, useState, useRef } from 'react'
import { SessionProvider, useSession } from '../stores/useSessionStore'
import { useWorkspaceStore, createWorkspaceStore, WorkspaceContext } from '../stores/useWorkspaceStore'
import { useShortcutStore } from '../stores/useShortcutStore'
import { useDatabaseMetadata } from '../features/navigator/hooks/useDatabaseMetadata'
import { DatabaseTree } from '../features/navigator/DatabaseTree'
import { ConnectionForm } from '../features/connection/ConnectionForm'
import { TableTabPane } from '../features/table-viewer/TableDataTab'
import { QueryTabPane } from '../features/query-editor/QueryEditorTab'
import { StructureView } from '../features/schema-designer/StructureView'
import { TabSwitcher } from '../components/ui/TabSwitcher'
import { TableSearchModal } from '../features/navigator/components/TableSearchModal'
import { CreateDatabaseModal } from '../features/navigator/components/CreateDatabaseModal'
import { AlertModal } from '../components/ui/AlertModal'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import { TabWorkspace } from './TabWorkspace'

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
    tabs, activeTabId,
    openTable, openStructure, updateTab, closeTab,
    mruTabIds, showTabSwitcher, setShowTabSwitcher, switcherIndex, setSwitcherIndex, setActiveTabId
  } = useWorkspaceStore(s => s)

  const {
    databases, schemas, currentSchema, setCurrentSchema, tables,
    fetchDatabases, fetchTables
  } = useDatabaseMetadata()

  const [showTableSearch, setShowTableSearch] = useState(false)
  const [showCreateDb, setShowCreateDb] = useState(false)
  const [isMaximized, setIsMaximized] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(256)
  const [isResizing, setIsResizing] = useState(false)
  const [alertMessage, setAlertMessage] = useState<string | null>(null)
  const [confirmConfig, setConfirmConfig] = useState<{ 
      message: string, 
      onConfirm: () => void, 
      confirmText?: string,
      title?: string
  } | null>(null)

  const activeTab = tabs.find(t => t.id === activeTabId)

  // Use global shortcuts
  useShortcutStore(isActive, setShowTableSearch)

  // Update window title
  useEffect(() => {
    if (isActive && config.database) {
      document.title = `${config.database} - vstable`
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
        setConfirmConfig({
            title: 'Success',
            message: `Database "${name}" created. Switch to it?`,
            confirmText: 'Switch',
            onConfirm: () => handleSwitchDatabase(name)
        })
    } else {
        setAlertMessage('Failed to create database: ' + res.error)
    }
  }

  const handleDeleteDatabase = async (name: string | string[]) => {
      const names = Array.isArray(name) ? name : [name]
      if (names.includes(config.database)) {
          setAlertMessage("Cannot delete the currently connected database.")
          return
      }
      const message = names.length > 1
          ? `Are you sure you want to DELETE ${names.length} databases?`
          : `Are you sure you want to DELETE database "${names[0]}"?`

      setConfirmConfig({
          title: 'Delete Database',
          message,
          confirmText: 'Delete',
          onConfirm: async () => {
              for (const n of names) {
                  const res = await query(`DROP DATABASE ${quote(n)};`)
                  if (!res.success) {
                      setAlertMessage(`Failed to delete database "${n}": ` + res.error)
                      break
                  }
              }
              fetchDatabases()
          }
      })
  }

  const handleSelectTable = async (schema: string, name: string) => {
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
  }

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
             onSelectTable={handleSelectTable}
             onSwitchDatabase={handleSwitchDatabase}             onCreateDatabase={() => setShowCreateDb(true)}
             onDeleteDatabase={handleDeleteDatabase}
             onCreateTable={() => openStructure(currentSchema, '', 'create')}
             onDeleteTable={async (schema, name) => {
                 const names = Array.isArray(name) ? name : [name]
                 const message = names.length > 1
                     ? `Delete ${names.length} tables from ${schema}?`
                     : `Delete table ${schema}.${names[0]}?`

                 setConfirmConfig({
                     title: 'Delete Table',
                     message,
                     confirmText: 'Delete',
                     onConfirm: async () => {
                        const tableList = names.map(n => {
                            if (capabilities?.supportsSchemas) return `${quote(schema)}.${quote(n)}`
                            return quote(n)
                        }).join(', ')
                        const res = await query(`DROP TABLE ${tableList}`)
                        if (res.success) {
                            fetchTables()
                        } else {
                            setAlertMessage('Failed to delete tables: ' + res.error)
                        }
                     }
                 })
             }}
             onRefreshTables={fetchTables}
           />
        </div>

        {/* Resize Handle */}
        <div
           onMouseDown={() => setIsResizing(true)}
           className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary-400/50 transition-colors z-50 ${isResizing ? 'bg-primary-500' : ''}`}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
         {/* Tab Bar Workspace */}
         <TabWorkspace isMaximized={isMaximized} setIsMaximized={setIsMaximized} />

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

      <TabSwitcher
        isOpen={showTabSwitcher}
        tabs={tabs}
        mruTabIds={mruTabIds}
        selectedIndex={switcherIndex}
        onSelect={(id) => {
            setShowTabSwitcher(false)
            setActiveTabId(id)
            setSwitcherIndex(0)
        }}
      />

      <TableSearchModal
        isOpen={showTableSearch}
        onClose={() => setShowTableSearch(false)}
        tables={tables}
        onSelect={(schema, name) => {
            handleSelectTable(schema, name)
            setShowTableSearch(false)
        }}
      />

      <CreateDatabaseModal
        isOpen={showCreateDb}
        onClose={() => setShowCreateDb(false)}
        onCreate={handleCreateDatabase}
      />

      <AlertModal 
        isOpen={!!alertMessage} 
        message={alertMessage || ''} 
        onClose={() => setAlertMessage(null)} 
      />

      <ConfirmModal
        isOpen={!!confirmConfig}
        title={confirmConfig?.title}
        message={confirmConfig?.message || ''}
        confirmText={confirmConfig?.confirmText}
        onConfirm={() => confirmConfig?.onConfirm()}
        onClose={() => setConfirmConfig(null)}
      />
    </div>
    )}
    </div>
  )
}

export const SessionView: React.FC<SessionViewProps> = (props) => {
  return (
    <SessionProvider id={props.id} onUpdateTitle={props.onUpdateTitle}>
       <WorkspaceStoreWrapper isActive={props.isActive} />
    </SessionProvider>
  )
}

const WorkspaceStoreWrapper: React.FC<{ isActive: boolean }> = ({ isActive }) => {
  const [store] = useState(() => createWorkspaceStore())

  return (
    <WorkspaceContext.Provider value={store}>
       <SessionContent isActive={isActive} />
    </WorkspaceContext.Provider>
  )
}