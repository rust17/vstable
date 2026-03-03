import React, { useRef, useState } from 'react'
import { Plus, X, Check, Settings } from 'lucide-react'
import { FilterCondition } from '../../../types/session'

interface CustomDropdownProps {
  value: string
  options: { label: string; value: string }[]
  onChange: (val: string) => void
  className?: string
  listClassName?: string
  align?: 'left' | 'center'
  testId?: string
  disabled?: boolean
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({ value, options, onChange, className, listClassName, align = 'left', testId, disabled }) => {
  const [isOpen, setIsOpen] = useState(false)
  
  return (
    <div className={`relative ${className} ${disabled ? 'pointer-events-none' : ''}`} data-testid={testId}>
      <div 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`px-3 py-1.5 cursor-pointer hover:bg-gray-100/50 transition-colors truncate flex items-center h-full ${align === 'center' ? 'justify-center' : ''} ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
      >
        {options.find(o => o.value === value)?.label || value}
      </div>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setIsOpen(false)} />
          <div className={`absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-30 overflow-hidden animate-in fade-in zoom-in-95 duration-100 ${listClassName}`}>
            <div className="max-h-[250px] overflow-y-auto py-1">
              {options.map(opt => (
                <div 
                  key={opt.value}
                  className={`px-3 py-1.5 text-xs hover:bg-gray-50 cursor-pointer ${align === 'center' ? 'text-center' : ''} ${opt.value === value ? 'text-primary-600 bg-primary-50 font-semibold' : 'text-gray-700'}`}
                  onClick={() => {
                    onChange(opt.value)
                    setIsOpen(false)
                  }}
                >
                  {opt.label}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

interface FilterBarProps {
  filters: FilterCondition[]
  structure: any[]
  isAddingRow: boolean
  onAddFilter: () => void
  onUpdateFilter: (id: string, field: keyof FilterCondition, val: any) => void
  onRemoveFilter: (id: string) => void
  onApplyFilters: () => void
  onStartAddRow: () => void
  onCancelAddRow: () => void
  onSaveRow: () => void
  pk?: string | null
  focusKey?: number
  onOpenStructure?: () => void
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters, structure, isAddingRow, onAddFilter, onUpdateFilter, onRemoveFilter, onApplyFilters, onStartAddRow, onCancelAddRow, onSaveRow, pk, focusKey, onOpenStructure
}) => {
  const filterInputRef = useRef<HTMLInputElement>(null)

  const operators = [
    { label: '=', value: '=' },
    { label: '!=', value: '!=' },
    { label: '>', value: '>' },
    { label: '<', value: '<' },
    { label: '>=', value: '>=' },
    { label: '<=', value: '<=' },
    { label: 'LIKE', value: 'LIKE' },
    { label: 'ILIKE', value: 'ILIKE' },
  ]

  React.useEffect(() => {
    if (focusKey && filterInputRef.current) {
        filterInputRef.current.focus()
    }
  }, [focusKey])

  return (
    <div className="bg-white border-b border-gray-200/60 flex flex-col px-4 py-2 gap-2 min-h-[95px] justify-center">
      <div className="flex flex-col gap-2 w-full">
          {filters.map((filter, index) => (
            <div key={filter.id} data-testid={`filter-row-${index}`} className="flex items-center gap-2 w-full">
              <input
                type="checkbox"
                checked={filter.enabled}
                onChange={e => onUpdateFilter(filter.id, 'enabled', e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer h-4 w-4"
                title="Enable/Disable Filter"
              />
              <div className={`flex flex-1 items-center bg-gray-50 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-white transition-all focus-within:ring-1 focus-within:ring-primary-400/30 focus-within:bg-white focus-within:border-primary-300 overflow-visible h-[34px] ${!filter.enabled ? 'opacity-50' : ''}`}>
                <CustomDropdown
                  testId={`filter-column-${index}`}
                  className="text-[11px] border-r border-gray-100 min-w-[140px] font-medium text-gray-700 h-full"
                  value={filter.column}
                  options={structure.map(c => ({ label: c.column_name, value: c.column_name }))}
                  onChange={val => onUpdateFilter(filter.id, 'column', val)}
                  disabled={!filter.enabled}
                />
                <CustomDropdown
                  testId={`filter-operator-${index}`}
                  className="text-[11px] border-r border-gray-100 w-16 font-mono text-primary-600 h-full"
                  align="center"
                  value={filter.operator}
                  options={operators}
                  onChange={val => onUpdateFilter(filter.id, 'operator', val)}
                  disabled={!filter.enabled}
                />
                <input
                  ref={index === 0 ? filterInputRef : null}
                  data-testid={index === 0 ? "filter-value-input" : `filter-value-${index}`}
                  type="text"
                  className={`flex-1 text-[11px] px-4 py-1.5 bg-transparent outline-none placeholder:text-gray-400 text-gray-700 h-full ${!filter.enabled ? 'cursor-not-allowed' : ''}`}
                  placeholder="Filter by value..."
                  value={filter.value}
                  onChange={e => onUpdateFilter(filter.id, 'value', e.target.value)}
                  disabled={!filter.enabled}
                  onKeyDown={e => {
                    if (e.key === 'Enter') onApplyFilters()
                  }}
                />
              </div>
              <div className="flex items-center gap-1">
                <button
                  data-testid={`btn-remove-filter-${index}`}
                  onClick={() => onRemoveFilter(filter.id)}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                  title="Remove Filter"
                >
                  <X size={14} />
                </button>
                {index === filters.length - 1 && (
                  <button
                    data-testid="btn-add-filter"
                    onClick={onAddFilter}
                    className="p-1.5 text-gray-400 hover:text-primary-500 hover:bg-primary-50 rounded transition-all"
                    title="Add Filter"
                  >
                    <Plus size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
          
          {filters.length === 0 && (
            <div className="flex items-center w-full">
               <button
                data-testid="btn-add-filter"
                onClick={onAddFilter}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all border border-gray-200 bg-gray-50 hover:border-primary-300"
              >
                <Plus size={14} /> Add Filter
              </button>
            </div>
          )}
      </div>

      <div className="flex items-center gap-3 h-9">
        {isAddingRow && (
          <div className="flex items-center gap-2">
            <button
              data-testid="btn-save-row"
              onClick={onSaveRow}
              className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-all shadow-sm active:scale-95"
            >
              <Check size={14} /> Save Row
            </button>
            <button
              data-testid="btn-cancel-row"
              onClick={onCancelAddRow}
              className="flex items-center gap-1 px-2 py-1.5 text-[11px] font-medium text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        {(pk || onOpenStructure) && (
          <div className="ml-auto flex items-center gap-3">
            {pk && (
              <span className="text-[10px] font-mono text-gray-400 select-none bg-gray-50 px-2 py-1 rounded border border-gray-200">
                Editable (PK: <span className="text-primary-500 font-bold">{pk}</span>)
              </span>
            )}
            {onOpenStructure && (
              <button 
                data-testid="tab-structure" 
                onClick={onOpenStructure} 
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-gray-500 hover:text-primary-600 hover:bg-gray-50 rounded-lg transition-all border border-gray-200"
              >
                <Settings size={12} />
                <span>Edit Structure</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
