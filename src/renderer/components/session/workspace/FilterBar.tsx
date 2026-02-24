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
  focusKey?: number
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters, structure, isAddingRow, onAddFilter, onUpdateFilter, onRemoveFilter, onApplyFilters, onStartAddRow, onCancelAddRow, onSaveRow, pk, focusKey
}) => {
  const filterInputRef = useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (focusKey && filterInputRef.current) {
        filterInputRef.current.focus()
    }
  }, [focusKey])

  return (
    <div className="bg-gray-50 border-b border-gray-100">
      {filters.length > 0 && (
        <div className="px-4 py-2 flex flex-col gap-1.5 border-b border-gray-100/50">
          {filters.map((filter, index) => (
            <div key={filter.id} data-testid={`filter-row-${index}`} className="flex items-center gap-2">
              <div className="flex items-center bg-white border border-gray-200 rounded overflow-hidden shadow-sm focus-within:ring-1 focus-within:ring-blue-500 transition-all">
                <select
                  data-testid={`filter-column-${index}`}
                  className="text-[11px] px-2 py-1 bg-transparent border-r border-gray-100 outline-none hover:bg-gray-50 cursor-pointer min-w-[120px]"
                  value={filter.column}
                  onChange={e => onUpdateFilter(filter.id, 'column', e.target.value)}
                >
                  {structure.length ? structure.map(c => (
                    <option key={c.column_name} value={c.column_name}>{c.column_name}</option>
                  )) : <option value="">Select column...</option>}
                </select>
                <select
                  data-testid={`filter-operator-${index}`}
                  className="text-[11px] px-2 py-1 bg-transparent border-r border-gray-100 outline-none hover:bg-gray-50 cursor-pointer w-16 text-center font-mono"
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
                  data-testid={index === 0 ? "filter-value-input" : `filter-value-${index}`}
                  type="text"
                  className="flex-1 text-[11px] px-3 py-1 bg-transparent outline-none placeholder:text-gray-300 min-w-[200px]"
                  placeholder="Search value..."
                  value={filter.value}
                  onChange={e => onUpdateFilter(filter.id, 'value', e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') onApplyFilters()
                  }}
                />
              </div>
              <div className="flex items-center gap-1">
                <button
                  data-testid={`btn-remove-filter-${index}`}
                  onClick={() => onRemoveFilter(filter.id)}
                  className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                  title="Remove Filter"
                >
                  <div className="w-3 h-0.5 bg-current rounded-full"></div>
                </button>
                {index === filters.length - 1 && (
                  <button
                    data-testid="btn-add-filter"
                    onClick={onAddFilter}
                    className="p-1 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-all"
                    title="Add Filter"
                  >
                    <Plus size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="px-4 py-1.5 flex items-center gap-3 h-9">
        {filters.length === 0 && (
          <button
            data-testid="btn-add-filter"
            onClick={onAddFilter}
            className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
          >
            <Plus size={14} /> Add Filter
          </button>
        )}
        
        {filters.length > 0 && (
          <button
            data-testid="btn-apply-filter"
            onClick={onApplyFilters}
            className="px-3 py-1 text-[11px] font-bold bg-blue-600 text-white rounded hover:bg-blue-700 transition-all shadow-sm active:scale-95"
          >
            Apply
          </button>
        )}

        <div className="h-4 w-px bg-gray-200 mx-1"></div>

        {isAddingRow ? (
          <div className="flex items-center gap-2">
            <button
              data-testid="btn-save-row"
              onClick={onSaveRow}
              className="flex items-center gap-1 px-3 py-1 text-[11px] font-bold text-white bg-green-600 hover:bg-green-700 rounded transition-all shadow-sm active:scale-95"
            >
              <Check size={14} /> Save Row
            </button>
            <button
              data-testid="btn-cancel-row"
              onClick={onCancelAddRow}
              className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-gray-500 hover:bg-gray-100 rounded transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            data-testid="btn-add-row"
            onClick={onStartAddRow}
            className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-gray-500 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
          >
            <Plus size={14} /> Add Row
          </button>
        )}

        {pk && (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[10px] font-mono text-gray-400 select-none bg-gray-100/50 px-2 py-0.5 rounded border border-gray-200/50">
              Editable (PK: <span className="text-blue-500 font-bold">{pk}</span>)
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
