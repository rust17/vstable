import React, { useEffect, useState } from 'react'
import { Settings } from 'lucide-react'
import { TableTab, FilterCondition } from '../../types/session'
import { useSession } from '../../providers/SessionProvider'
import { useTableData } from '../../hooks/useTableData'
import { ResultGrid } from '../../ui/data-grid/ResultGrid'
import { PaginationControl } from '../../ui/pagination/PaginationControl'
import { FilterBar } from './FilterBar'
import { StructureView } from '../schema-designer/StructureView'
import { DataEditModal } from '../../ui/modals/DataEditModal'
import { ContextMenu } from '../../ui/context-menu/ContextMenu'
import { formatTimestamp } from '../../utils/format'

interface TableTabPaneProps {
  tab: TableTab
  isActive: boolean
  onUpdateTab: (updates: Partial<TableTab>) => void
  connectionId: string
  onOpenStructure: (schema: string, name: string) => void
}

export const TableTabPane: React.FC<TableTabPaneProps> = ({ tab, isActive, onUpdateTab, connectionId, onOpenStructure }) => {
  const { sessionId, query, buildQuery, config, capabilities } = useSession()
  const { data, loading, error, totalRows, fetchData, deleteRow, deleteRows, updateCell, insertRow } = useTableData(tab)
  
  const [editingCell, setEditingCell] = useState<{ row: any, field: string, value: any, dataType?: string } | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, selectedRows: any[] } | null>(null)

  // Fetch PK if not present
  useEffect(() => {
    if (!tab.pk && tab.name && (tab.schema || !capabilities?.supportsSchemas)) {
      const fetchPk = async () => {
        const pkQuery = buildQuery('getPrimaryKey', {
            db: config.database,
            table: tab.name,
            schema: tab.schema || config.database
        })
        if (!pkQuery) return

        const res = await query(pkQuery)
        if (res.success && res.rows && res.rows.length > 0) {
          const pkCol = res.rows[0].column_name || Object.values(res.rows[0])[0]
          onUpdateTab({ pk: pkCol as string })
        }
      }
      fetchPk()
    }
  }, [tab.id, tab.name, tab.schema, tab.pk, query, onUpdateTab, capabilities, buildQuery, config.database])

  // Initial fetch
  useEffect(() => {
    if (isActive && !tab.results) {
      fetchData(tab.page || 1, tab.pageSize || 100, tab.filters || [], tab.sorts || [])
    }
  }, [isActive, tab.id, fetchData]) 

  // Refresh data when PK is discovered to ensure correct sorting
  useEffect(() => {
    if (isActive && tab.pk && tab.results) {
      fetchData(tab.page || 1, tab.pageSize || 100, tab.filters || [], tab.sorts || [])
    }
  }, [isActive, tab.pk]) 

  // Handle refresh and focus shortcuts
  useEffect(() => {
    if (isActive && tab.refreshKey) {
        handleRefresh()
    }
  }, [tab.refreshKey])

  useEffect(() => {
    if (isActive && tab.focusKey) {
        if (!tab.filters || tab.filters.length === 0) {
            handleAddFilter()
        }
    }
  }, [tab.focusKey])

  const handlePageChange = (newPage: number) => {
    onUpdateTab({ page: newPage })
    fetchData(newPage, tab.pageSize || 100, tab.filters || [], tab.sorts || [])
  }

  const handlePageSizeChange = (newSize: number) => {
    onUpdateTab({ pageSize: newSize, page: 1 })
    fetchData(1, newSize, tab.filters || [], tab.sorts || [])
  }

  const handleRefresh = () => {
    fetchData(tab.page || 1, tab.pageSize || 100, tab.filters || [], tab.sorts || [])
  }

  const handleSortChange = (newSorts: any[]) => {
    onUpdateTab({ sorts: newSorts })
    fetchData(tab.page || 1, tab.pageSize || 100, tab.filters || [], newSorts)
  }

  // Filter handlers
  const handleAddFilter = () => {
    const newFilter: FilterCondition = { id: crypto.randomUUID(), column: '', operator: '=', value: '', enabled: true }
    if (tab.structure && tab.structure.length > 0) {
      newFilter.column = tab.structure[0].column_name
    }
    const currentFilters = tab.filters || []
    onUpdateTab({ filters: [...currentFilters, newFilter] })
  }

  const handleRemoveFilter = (id: string) => {
    const newFilters = (tab.filters || []).filter(f => f.id !== id)
    onUpdateTab({ filters: newFilters })
  }

  const handleUpdateFilter = (id: string, field: keyof FilterCondition, val: any) => {
    const newFilters = (tab.filters || []).map(f => f.id === id ? { ...f, [field]: val } : f)
    onUpdateTab({ filters: newFilters })
  }

  const handleApplyFilters = () => {
    onUpdateTab({ page: 1 })
    fetchData(1, tab.pageSize || 100, tab.filters || [], tab.sorts || [])
  }

  // Row operations
  const handleStartAddRow = () => onUpdateTab({ isAddingRow: true, newRowData: {} })
  const handleCancelAddRow = () => onUpdateTab({ isAddingRow: false, newRowData: {} })
  
  const handleNewRowChange = (column: string, value: string) => {
    const current = tab.newRowData || {}
    onUpdateTab({ newRowData: { ...current, [column]: value } })
  }

  const handleSaveNewRow = async () => {
    const res = await insertRow(tab.newRowData || {})
    if (res.success) {
      onUpdateTab({ isAddingRow: false, newRowData: {} })
      handleRefresh()
    } else {
      alert(res.error || 'Insert failed')
    }
  }

  const handleCellUpdate = async (newValue: string) => {
      if (!editingCell || !tab.pk) return
      const res = await updateCell(tab.pk, editingCell.row[tab.pk], editingCell.field, newValue)
      if (res.success) {
          handleRefresh()
          setEditingCell(null)
      } else {
          alert(res.error)
      }
  }

  const getEditValue = () => {
      if (!editingCell) return ''
      const { value, dataType } = editingCell
      if (dataType?.includes('json') && typeof value === 'object') {
        return JSON.stringify(value, null, 2)
      } else if (dataType?.includes('timestamp') || dataType?.includes('date') || dataType?.includes('time')) {
        return formatTimestamp(value)
      }
      return String(value ?? '')
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-white">
      <FilterBar
        filters={tab.filters || []}
        structure={tab.structure || []}
        isAddingRow={!!tab.isAddingRow}
        onAddFilter={handleAddFilter}
        onUpdateFilter={handleUpdateFilter}
        onRemoveFilter={handleRemoveFilter}
        onApplyFilters={handleApplyFilters}
        onStartAddRow={handleStartAddRow}
        onCancelAddRow={handleCancelAddRow}
        onSaveRow={handleSaveNewRow}
        pk={tab.pk}
        focusKey={tab.focusKey}
        onOpenStructure={() => onOpenStructure(tab.schema || 'public', tab.name)}
      />

      <ResultGrid
        rows={data?.rows || []}
        fields={data?.fields || []}
        structure={tab.structure}
        pk={tab.pk}
        sorts={tab.sorts || []}
        onSortChange={handleSortChange}
        loading={loading}
        error={error}
        isAddingRow={tab.isAddingRow}
        newRowData={tab.newRowData}
        onNewRowChange={handleNewRowChange}
        onCellDoubleClick={(row, field, val, type) => {
            if (tab.pk && field !== tab.pk) {
                setEditingCell({ row, field, value: val, dataType: type })
            }
        }}
        onContextMenu={(e, selectedRows) => {
           setContextMenu({ x: e.clientX, y: e.clientY, selectedRows })
        }}
      />

      <div className="h-12 flex justify-between items-center px-4 border-t border-gray-200 bg-gray-50 shrink-0">
        <div className="flex-1"></div>
        <PaginationControl
          page={tab.page || 1}
          pageSize={tab.pageSize || 100}
          totalRows={totalRows}
          loading={loading}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      </div>
      
      <DataEditModal 
          isOpen={!!editingCell}
          onClose={() => setEditingCell(null)}
          value={getEditValue()}
          dataType={editingCell?.dataType}
          title={tab.pk ? `Editable (PK: ${tab.pk})` : 'Edit Data'}
          onSave={handleCellUpdate}
      />

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          selectedCount={contextMenu.selectedRows.length}
          onDelete={() => {
              if (tab.pk && contextMenu.selectedRows.length > 0) {
                  const message = contextMenu.selectedRows.length > 1 
                      ? `Are you sure you want to delete these ${contextMenu.selectedRows.length} rows?` 
                      : 'Are you sure you want to delete this row?'
                  
                  if (window.confirm(message)) {
                      const pkValues = contextMenu.selectedRows.map(r => r[tab.pk!])
                      deleteRows(tab.pk, pkValues).then(res => {
                          if(res.success) handleRefresh()
                          else alert(res.error)
                          setContextMenu(null)
                      })
                  }
              }
          }}
          onAdd={() => {
              handleStartAddRow()
              setContextMenu(null)
          }}
          onClose={() => setContextMenu(null)}
          isRowSelected={contextMenu.selectedRows.length > 0}
        />
      )}
    </div>
  )
}
