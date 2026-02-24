import React, { useEffect, useState } from 'react'
import { TableTab, FilterCondition } from '../../../types/session'
import { useTableData } from '../hooks/useTableData'
import { ResultGrid } from '../shared/ResultGrid'
import { PaginationControl } from '../shared/PaginationControl'
import { FilterBar } from './FilterBar'
import { StructureView } from '../../StructureView'
import { DataEditModal } from '../shared/DataEditModal'
import { ContextMenu } from '../shared/ContextMenu'
import { formatTimestamp } from '../../../utils/format'

interface TableTabPaneProps {
  tab: TableTab
  isActive: boolean
  onUpdateTab: (updates: Partial<TableTab>) => void
  connectionId: string
}

export const TableTabPane: React.FC<TableTabPaneProps> = ({ tab, isActive, onUpdateTab, connectionId }) => {
  const { data, loading, error, totalRows, fetchData, deleteRow, updateCell, insertRow } = useTableData(tab)
  const [viewMode, setViewMode] = useState<'data' | 'structure'>('data')
  
  const [editingCell, setEditingCell] = useState<{ row: any, field: string, value: any, dataType?: string } | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, row: any } | null>(null)

  // Initial fetch
  useEffect(() => {
    if (isActive && !tab.results && viewMode === 'data') {
      fetchData(tab.page || 1, tab.pageSize || 100, tab.filters || [])
    }
  }, [isActive, tab.id, fetchData])

  // Handle refresh and focus shortcuts
  useEffect(() => {
    if (isActive && tab.refreshKey) {
        handleRefresh()
    }
  }, [tab.refreshKey])

  const handlePageChange = (newPage: number) => {
    onUpdateTab({ page: newPage })
    fetchData(newPage, tab.pageSize || 100, tab.filters || [])
  }

  const handlePageSizeChange = (newSize: number) => {
    onUpdateTab({ pageSize: newSize, page: 1 })
    fetchData(1, newSize, tab.filters || [])
  }

  const handleRefresh = () => {
    fetchData(tab.page || 1, tab.pageSize || 100, tab.filters || [])
  }

  // Filter handlers
  const handleAddFilter = () => {
    const newFilter: FilterCondition = { id: crypto.randomUUID(), column: '', operator: '=', value: '' }
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

  const handleUpdateFilter = (id: string, field: keyof FilterCondition, val: string) => {
    const newFilters = (tab.filters || []).map(f => f.id === id ? { ...f, [field]: val } : f)
    onUpdateTab({ filters: newFilters })
  }

  const handleApplyFilters = () => {
    onUpdateTab({ page: 1 })
    fetchData(1, tab.pageSize || 100, tab.filters || [])
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

  if (viewMode === 'structure') {
      return (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
             <div className="flex items-center gap-2 p-2 border-b border-gray-200 bg-gray-50">
                 <button onClick={() => setViewMode('data')} className="text-xs text-blue-600 hover:underline">Back to Data</button>
             </div>
             <StructureView 
                connectionId={connectionId}
                schema={tab.schema || 'public'}
                tableName={tab.name}
                onClose={() => setViewMode('data')}
             />
          </div>
      )
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
    <div className="flex-1 flex flex-col h-full overflow-hidden relative">
      <div className="flex justify-end px-2 py-1 bg-gray-100 border-b border-gray-200">
         <div className="flex bg-gray-200/50 p-0.5 rounded text-[10px]">
            <button data-testid="tab-data" onClick={() => setViewMode('data')} className={`px-2 py-0.5 rounded ${viewMode === 'data' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>Data</button>
            <button data-testid="tab-structure" onClick={() => setViewMode('structure')} className={`px-2 py-0.5 rounded ${viewMode === 'structure' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>Structure</button>
         </div>
      </div>

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
      />

      <ResultGrid
        rows={data?.rows || []}
        fields={data?.fields || []}
        structure={tab.structure}
        pk={tab.pk}
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
        onContextMenu={(e, row) => {
           if (tab.pk) {
               setContextMenu({ x: e.clientX, y: e.clientY, row })
           }
        }}
      />

      <div className="absolute bottom-4 right-4">
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
          onDelete={() => {
              if (tab.pk && contextMenu.row) {
                  if (window.confirm('Are you sure you want to delete this row?')) {
                      deleteRow(tab.pk, contextMenu.row[tab.pk]).then(res => {
                          if(res.success) handleRefresh()
                          else alert(res.error)
                      })
                  }
              }
          }}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  )
}
