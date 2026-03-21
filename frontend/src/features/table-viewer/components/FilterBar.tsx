import { Check, Plus, Search, Settings, X } from 'lucide-react';
import React, { useRef, useState } from 'react';
import type { FilterCondition } from '../../../types/session';

interface CustomDropdownProps {
  value: string;
  options: { label: string; value: string }[];
  onChange: (val: string) => void;
  className?: string;
  listClassName?: string;
  align?: 'left' | 'center';
  testId?: string;
  disabled?: boolean;
  searchable?: boolean;
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({
  value,
  options,
  onChange,
  className,
  listClassName,
  align = 'left',
  testId,
  disabled,
  searchable,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredOptions = searchable
    ? options.filter((opt) => opt.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : options;

  return (
    <div
      className={`relative ${className} ${disabled ? 'pointer-events-none' : ''}`}
      data-testid={testId}
    >
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`px-3 py-1.5 cursor-pointer hover:bg-gray-100/50 transition-colors truncate flex items-center h-full ${align === 'center' ? 'justify-center' : ''} ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
      >
        {options.find((o) => o.value === value)?.label || value}
      </div>
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-20"
            onClick={() => {
              setIsOpen(false);
              setSearchQuery('');
            }}
          />
          <div
            className={`absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-30 overflow-hidden animate-in fade-in zoom-in-95 duration-100 ${listClassName}`}
          >
            {searchable && (
              <div className="px-2 py-1.5 border-b border-gray-100 bg-gray-50/50">
                <div className="relative">
                  <Search
                    size={12}
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="text"
                    className="w-full bg-white border border-gray-200 rounded px-7 py-1 text-[10px] outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400/30"
                    placeholder="column"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>
            )}
            <div className="max-h-[250px] overflow-y-auto py-1">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt) => (
                  <div
                    key={opt.value}
                    className={`px-3 py-1.5 text-xs hover:bg-gray-50 cursor-pointer ${align === 'center' ? 'text-center' : ''} ${opt.value === value ? 'text-primary-600 bg-primary-50 font-semibold' : 'text-gray-700'}`}
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                      setSearchQuery('');
                    }}
                  >
                    {opt.label}
                  </div>
                ))
              ) : (
                <div className="px-3 py-2 text-[10px] text-gray-400 text-center italic">
                  No matches
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

interface FilterBarProps {
  filters: FilterCondition[];
  structure: any[];
  isAddingRow: boolean;
  onAddFilter: () => void;
  onUpdateFilter: (id: string, field: keyof FilterCondition, val: any) => void;
  onRemoveFilter: (id: string) => void;
  onApplyFilters: () => void;
  onStartAddRow: () => void;
  onCancelAddRow: () => void;
  onSaveRow: () => void;
  pk?: string | null;
  focusKey?: number;
  onOpenStructure?: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  structure,
  isAddingRow,
  onAddFilter,
  onUpdateFilter,
  onRemoveFilter,
  onApplyFilters,
  onStartAddRow,
  onCancelAddRow,
  onSaveRow,
  pk,
  focusKey,
  onOpenStructure,
}) => {
  const filterInputRef = useRef<HTMLInputElement>(null);

  const operators = [
    { label: '=', value: '=' },
    { label: '!=', value: '!=' },
    { label: '>', value: '>' },
    { label: '<', value: '<' },
    { label: '>=', value: '>=' },
    { label: '<=', value: '<=' },
    { label: 'LIKE', value: 'LIKE' },
    { label: 'ILIKE', value: 'ILIKE' },
    { label: 'IN', value: 'IN' },
    { label: 'NOT IN', value: 'NOT IN' },
    { label: 'IS NULL', value: 'IS NULL' },
    { label: 'IS NOT NULL', value: 'IS NOT NULL' },
    { label: 'BETWEEN', value: 'BETWEEN' },
  ];

  React.useEffect(() => {
    if (focusKey && filterInputRef.current) {
      filterInputRef.current.focus();
    }
  }, [focusKey]);

  return (
    <div className="bg-white border-b border-gray-200/60 flex flex-col px-4 py-2 gap-2 min-h-[95px] justify-center">
      <div className="flex flex-col gap-2 w-full">
        {filters.map((filter, index) => (
          <div
            key={filter.id}
            data-testid={`filter-row-${index}`}
            className="flex items-center gap-2 w-full"
          >
            <input
              type="checkbox"
              checked={filter.enabled}
              onChange={(e) => onUpdateFilter(filter.id, 'enabled', e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer h-4 w-4"
              title="Enable/Disable Filter"
            />
            <div
              className={`flex flex-1 items-center bg-gray-50 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-white transition-all focus-within:ring-1 focus-within:ring-primary-400/30 focus-within:bg-white focus-within:border-primary-300 overflow-visible h-[34px] ${!filter.enabled ? 'opacity-50' : ''}`}
            >
              <CustomDropdown
                testId={`filter-column-${index}`}
                className="text-[11px] border-r border-gray-100 min-w-[140px] font-medium text-gray-700 h-full"
                value={filter.column}
                options={structure.map((c) => ({ label: c.column_name, value: c.column_name }))}
                onChange={(val) => onUpdateFilter(filter.id, 'column', val)}
                disabled={!filter.enabled}
                searchable={true}
              />
              <CustomDropdown
                testId={`filter-operator-${index}`}
                className="text-[11px] border-r border-gray-100 min-w-[120px] font-mono text-primary-600 h-full"
                listClassName="min-w-[100px]"
                align="center"
                value={filter.operator}
                options={operators}
                onChange={(val) => onUpdateFilter(filter.id, 'operator', val)}
                disabled={!filter.enabled}
              />
              {filter.operator !== 'IS NULL' && filter.operator !== 'IS NOT NULL' && (
                <>
                  <input
                    ref={index === 0 ? filterInputRef : null}
                    data-testid={index === 0 ? 'filter-value-input' : `filter-value-${index}`}
                    type="text"
                    className={`flex-1 text-[11px] px-4 py-1.5 bg-transparent outline-none placeholder:text-gray-400 text-gray-700 h-full ${!filter.enabled ? 'cursor-not-allowed' : ''}`}
                    placeholder={
                      filter.operator === 'IN' || filter.operator === 'NOT IN'
                        ? 'e.g., val1, val2'
                        : 'Filter by value...'
                    }
                    value={filter.value}
                    onChange={(e) => onUpdateFilter(filter.id, 'value', e.target.value)}
                    disabled={!filter.enabled}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onApplyFilters();
                    }}
                  />
                  {filter.operator === 'BETWEEN' && (
                    <>
                      <span className="text-[10px] font-bold text-gray-400 px-2 select-none self-center">
                        AND
                      </span>
                      <input
                        data-testid={`filter-value2-${index}`}
                        type="text"
                        className={`flex-1 text-[11px] px-4 py-1.5 bg-transparent outline-none placeholder:text-gray-400 text-gray-700 h-full ${!filter.enabled ? 'cursor-not-allowed' : ''}`}
                        placeholder="Filter by value..."
                        value={filter.value2 || ''}
                        onChange={(e) => onUpdateFilter(filter.id, 'value2', e.target.value)}
                        disabled={!filter.enabled}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') onApplyFilters();
                        }}
                      />
                    </>
                  )}
                </>
              )}
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
  );
};
