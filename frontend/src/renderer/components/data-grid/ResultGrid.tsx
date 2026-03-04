import React, { useState, useRef } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { formatDisplayValue } from '../../utils/format';
import { SortCondition } from '../../types/session';

interface ResultGridProps {
  rows: any[];
  fields: any[];
  structure?: any[];
  pk?: string | null;
  loading?: boolean;
  error?: string | null;
  isAddingRow?: boolean;
  newRowData?: Record<string, any>;
  sorts?: SortCondition[];
  onCellDoubleClick?: (row: any, field: string, value: any, type?: string) => void;
  onNewRowChange?: (column: string, value: string) => void;
  onContextMenu?: (e: React.MouseEvent, selectedRows: any[]) => void;
  onSelectionChange?: (indices: Set<number>) => void;
  onSortChange?: (sorts: SortCondition[]) => void;
}

export const ResultGrid: React.FC<ResultGridProps> = ({
  rows,
  fields,
  structure,
  pk,
  loading,
  error,
  isAddingRow,
  newRowData,
  sorts = [],
  onCellDoubleClick,
  onNewRowChange,
  onContextMenu,
  onSelectionChange,
  onSortChange,
}) => {
  const [selectedRowIndices, setSelectedRowIndices] = useState<Set<number>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);

  const handleHeaderClick = (e: React.MouseEvent, column: string) => {
    if (!onSortChange) return;

    // If the user is selecting text (e.g. three-finger drag on Mac), don't trigger sort
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      return;
    }

    const isMac = window.navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const multiSort = isMac ? e.metaKey : e.ctrlKey;

    const existingIndex = sorts.findIndex((s) => s.column === column);
    let newSorts: SortCondition[] = multiSort ? [...sorts] : [];

    if (existingIndex > -1) {
      const current = sorts[existingIndex];
      if (current.direction === 'ASC') {
        const next: SortCondition = { column, direction: 'DESC' };
        if (multiSort) newSorts[existingIndex] = next;
        else newSorts = [next];
      } else {
        // DESC -> None
        if (multiSort) newSorts.splice(existingIndex, 1);
        else newSorts = [];
      }
    } else {
      // None -> ASC
      const next: SortCondition = { column, direction: 'ASC' };
      if (multiSort) newSorts.push(next);
      else newSorts = [next];
    }

    onSortChange(newSorts);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only left click on the container or table (not on input/button)
    if (e.button !== 0) return;
    if (
      (e.target as HTMLElement).tagName === 'INPUT' ||
      (e.target as HTMLElement).tagName === 'BUTTON'
    )
      return;

    // If not holding Cmd/Ctrl/Shift, clear selection on start
    const isMac = window.navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;
    if (!cmdOrCtrl && !e.shiftKey) {
      setSelectedRowIndices(new Set());
      if (onSelectionChange) onSelectionChange(new Set());
    }
  };

  const handleRowClick = (e: React.MouseEvent, index: number) => {
    let newSelection = new Set<number>();
    const isMac = window.navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

    if (cmdOrCtrl) {
      newSelection = new Set(selectedRowIndices);
      if (newSelection.has(index)) {
        newSelection.delete(index);
      } else {
        newSelection.add(index);
      }
      setLastSelectedIndex(index);
    } else if (e.shiftKey && lastSelectedIndex !== null) {
      newSelection = new Set(selectedRowIndices);
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);
      for (let i = start; i <= end; i++) {
        newSelection.add(i);
      }
    } else {
      newSelection.add(index);
      setLastSelectedIndex(index);
    }

    setSelectedRowIndices(newSelection);
    if (onSelectionChange) onSelectionChange(newSelection);
  };

  const handleContextMenu = (e: React.MouseEvent, index: number | null) => {
    e.preventDefault();
    e.stopPropagation();
    let currentSelection = selectedRowIndices;
    if (index !== null && !selectedRowIndices.has(index)) {
      currentSelection = new Set([index]);
      setSelectedRowIndices(currentSelection);
      setLastSelectedIndex(index);
      if (onSelectionChange) onSelectionChange(currentSelection);
    }

    const selectedRows = Array.from(currentSelection)
      .map((idx) => rows[idx])
      .filter(Boolean);
    if (onContextMenu) onContextMenu(e, selectedRows);
  };

  if (loading)
    return <div className="p-8 text-center text-gray-400 italic text-sm">Loading data...</div>;
  if (error)
    return (
      <div className="p-4 text-red-600 font-mono text-xs whitespace-pre-wrap bg-red-50/30">
        Error: {error}
      </div>
    );

  return (
    <div
      ref={containerRef}
      data-testid="results-scroll"
      className="flex-1 overflow-auto pb-12 elastic-scroll overscroll-y-auto relative"
      onMouseDown={handleMouseDown}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setSelectedRowIndices(new Set());
        setLastSelectedIndex(null);
        if (onSelectionChange) onSelectionChange(new Set());
        if (onContextMenu) onContextMenu(e, []);
      }}
    >
      {(!rows || rows.length === 0) && !isAddingRow ? (
        <div className="p-8 text-center text-gray-300 italic text-sm h-full">No data found</div>
      ) : (
        <table
          ref={tableRef}
          className="w-full border-collapse text-left text-xs font-mono relative select-text"
        >
          <thead className="bg-gray-100 sticky top-0 z-10 select-text">
            <tr>
              {fields.map((field, i) => {
                const colInfo = structure?.find((c) => c.column_name === field.name);
                const sortIndex = sorts.findIndex((s) => s.column === field.name);
                const sort = sortIndex > -1 ? sorts[sortIndex] : null;

                return (
                  <th
                    key={i}
                    className="px-4 py-2.5 border-r border-b border-gray-200 whitespace-nowrap bg-gray-50/80 hover:bg-gray-100/80 cursor-pointer group transition-colors"
                    onClick={(e) => handleHeaderClick(e, field.name)}
                  >
                    <div className="flex flex-col items-start gap-1">
                      <div className="flex items-center gap-1.5 w-full">
                        <span className="cursor-text text-gray-700 font-bold group-hover:text-primary-600 transition-colors">
                          {field.name}
                        </span>
                        <div className="flex items-center">
                          {sort && (
                            <div className="flex items-center text-primary-600">
                              {sort.direction === 'ASC' ? (
                                <ArrowUp size={12} />
                              ) : (
                                <ArrowDown size={12} />
                              )}
                              {sorts.length > 1 && (
                                <span className="text-[9px] font-bold ml-0.5">{sortIndex + 1}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      {colInfo?.data_type && (
                        <span className="text-[10px] font-medium text-gray-500 bg-gray-200/60 rounded px-1.5 py-0.5 select-none">
                          {colInfo.data_type.replace(/ without time zone$/, '')}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={i}
                data-selected={selectedRowIndices.has(i) ? 'true' : 'false'}
                onClick={(e) => {
                  // If user is selecting text, don't trigger row selection
                  const selection = window.getSelection();
                  if (selection && selection.toString().length > 0) return;
                  handleRowClick(e, i);
                }}
                className={`${selectedRowIndices.has(i) ? 'bg-primary-100' : 'hover:bg-primary-50/50'} border-b border-gray-100 transition-colors cursor-context-menu`}
                onContextMenu={(e) => handleContextMenu(e, i)}
              >
                {fields.map((field, j) => {
                  const colInfo = structure?.find((c) => c.column_name === field.name);
                  return (
                    <td
                      key={j}
                      data-testid={`cell-${field.name}-${i}`}
                      className="border-r border-gray-100 text-gray-600 whitespace-nowrap max-w-xs truncate p-0 select-text"
                      onDoubleClick={() => {
                        const newSelection = new Set([i]);
                        setSelectedRowIndices(newSelection);
                        setLastSelectedIndex(i);
                        if (onSelectionChange) onSelectionChange(newSelection);
                        if (onCellDoubleClick) {
                          onCellDoubleClick(row, field.name, row[field.name], colInfo?.data_type);
                        }
                      }}
                    >
                      <div className="w-full h-full px-4 py-2.5 cursor-text">
                        <div className="max-h-20 overflow-hidden text-ellipsis whitespace-nowrap select-text">
                          {formatDisplayValue(row[field.name], colInfo?.data_type) || (
                            <span className="text-gray-300 italic select-none">null</span>
                          )}
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
            {isAddingRow && (
              <tr className="bg-green-50 sticky bottom-0 z-20 shadow-sm border-t-2 border-green-200">
                {(fields.length > 0
                  ? fields
                  : (structure || []).map((s) => ({ name: s.column_name }))
                ).map((field, j) => {
                  const colInfo = structure?.find((c) => c.column_name === field.name);
                  const isAuto =
                    colInfo?.column_default?.startsWith('nextval') ||
                    colInfo?.data_type === 'serial';

                  return (
                    <td key={j} className="border-r border-green-200 p-0 min-w-[100px]">
                      <input
                        autoFocus={!isAuto && j === 0}
                        disabled={!!isAuto}
                        className={`w-full h-full px-4 py-2.5 text-xs bg-transparent focus:outline-none focus:bg-white placeholder:text-green-300/50 font-mono ${isAuto ? 'bg-gray-50/50 text-gray-400 cursor-not-allowed italic' : 'text-gray-700'}`}
                        placeholder={isAuto ? '(auto)' : field.name}
                        value={newRowData?.[field.name] || ''}
                        onChange={(e) =>
                          onNewRowChange && onNewRowChange(field.name, e.target.value)
                        }
                      />
                    </td>
                  );
                })}
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
};
