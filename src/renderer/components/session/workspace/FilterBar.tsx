import React, { useRef } from 'react'
import { Plus, X, Check } from 'lucide-react'
import { FilterCondition } from '../../../types/session'

interface FilterBarProps {
  filters: FilterCondition[]
  structure: any[]
  isAddingRow: boolean
  onAddFilter: () => void
  onUpdateFilter: (id: string, field: keyof FilterCondition, val: string) => void
  onRemoveFilter: (id: string) => void
  onApplyFilters: () => void
  onStartAddRow: () => void
  onCancelAddRow: () => void
  onSaveRow: () => void
  pk?: string | null
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters, structure, isAddingRow, onAddFilter, onUpdateFilter, onRemoveFilter, onApplyFilters, onStartAddRow, onCancelAddRow, onSaveRow, pk
}) => {
  const filterInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="px-4 py-2 border-b border-gray-100 bg-gray-50 flex flex-col gap-2">
      {filters.map((filter, index) => (
        <div key={filter.id} data-testid={`filter-row-${index}`} className="flex items-center gap-2">
          <select
            data-testid={`filter-column-${index}`}
            className="text-xs border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-[150px]"
            value={filter.column}
            onChange={e => onUpdateFilter(filter.id, 'column', e.target.value)}
          >
            {structure.length ? structure.map(c => (
              <option key={c.column_name} value={c.column_name}>{c.column_name}</option>
            )) : <option value="">Select column...</option>}
          </select>
          <select
            data-testid={`filter-operator-${index}`}
            className="text-xs border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 w-16"
            value={filter.operator}
            onChange={e => onUpdateFilter(filter.id, 'operator', e.target.value)}
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
            onChange={e => onUpdateFilter(filter.id, 'value', e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') onApplyFilters()
            }}
          />
          <button
            data-testid={`btn-remove-filter-${index}`}
            onClick={() => onRemoveFilter(filter.id)}
            className="p-1 hover:bg-red-100 text-gray-400 hover:text-red-500 rounded transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      ))}
      <div className="flex items-center gap-2 mt-1">
        <button
          data-testid="btn-add-filter"
          onClick={onAddFilter}
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded transition-colors border border-transparent hover:border-blue-100"
        >
          <Plus size={12} /> Add Filter
        </button>
        {isAddingRow ? (
          <>
            <button
              data-testid="btn-save-row"
              onClick={onSaveRow}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded transition-colors shadow-sm"
            >
              <Check size={12} /> Save Row
            </button>
            <button
              data-testid="btn-cancel-row"
              onClick={onCancelAddRow}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded transition-colors border border-gray-200"
            >
              <X size={12} /> Cancel
            </button>
          </>
        ) : (
          <button
            data-testid="btn-add-row"
            onClick={onStartAddRow}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-600 hover:bg-green-50 rounded transition-colors border border-transparent hover:border-green-100"
          >
            <Plus size={12} /> Add Row
          </button>
        )}
        {filters.length > 0 && (
          <button
            data-testid="btn-apply-filter"
            onClick={onApplyFilters}
            className="px-3 py-1 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors shadow-sm"
          >
            Apply Filter
          </button>
        )}
        {pk && (
          <span className="ml-auto text-[10px] font-mono text-gray-400 bg-gray-100 px-2 py-1 rounded border border-gray-200 select-none" title="Primary Key">
            Editable (PK: {pk})
          </span>
        )}
      </div>
    </div>
  )
}
