import React, { useState } from 'react'
import { formatDisplayValue } from '../../../utils/format'

interface ResultGridProps {
  rows: any[]
  fields: any[]
  structure?: any[]
  pk?: string | null
  loading?: boolean
  error?: string | null
  isAddingRow?: boolean
  newRowData?: Record<string, any>
  onCellDoubleClick?: (row: any, field: string, value: any, type?: string) => void
  onNewRowChange?: (column: string, value: string) => void
  onContextMenu?: (e: React.MouseEvent, row: any) => void
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
  onCellDoubleClick,
  onNewRowChange,
  onContextMenu
}) => {
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null)

  if (loading) return <div className="p-8 text-center text-gray-400 italic text-sm">Loading data...</div>
  if (error) return <div className="p-4 text-red-600 font-mono text-xs whitespace-pre-wrap bg-red-50/30">Error: {error}</div>

  return (
    <div 
        data-testid="results-scroll" 
        className="flex-1 overflow-auto pb-12 elastic-scroll overscroll-y-auto"
        onContextMenu={(e) => {
            if (e.target === e.currentTarget) {
                e.preventDefault()
                setSelectedRowIndex(null)
                if (onContextMenu) onContextMenu(e, null)
            }
        }}
    >
      {(!rows || rows.length === 0) && !isAddingRow ? (
        <div className="p-8 text-center text-gray-300 italic text-sm h-full">No data found</div>
      ) : (
      <table className="w-full border-collapse text-left text-xs font-mono">
        <thead className="bg-gray-100 sticky top-0 z-10 select-text">
          <tr>
            {fields.map((field, i) => {
              const colInfo = structure?.find(c => c.column_name === field.name)
              return (
                <th key={i} className="px-3 py-2 border-r border-b border-gray-200 text-gray-600 font-bold whitespace-nowrap">
                  <div className="flex flex-col">
                    <span className="cursor-text">{field.name}</span>
                    {colInfo && <span className="text-[9px] font-normal text-gray-400">{colInfo.data_type.replace(/ without time zone$/, '')}</span>}
                  </div>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              data-selected={selectedRowIndex === i ? 'true' : 'false'}
              onClick={() => setSelectedRowIndex(i)}
              className={`${selectedRowIndex === i ? 'bg-blue-100' : 'hover:bg-blue-50/50'} border-b border-gray-100 transition-colors cursor-context-menu`}
              onContextMenu={(e) => {
                e.preventDefault()
                setSelectedRowIndex(i)
                if (onContextMenu) onContextMenu(e, row)
              }}
            >
              {fields.map((field, j) => {
                const colInfo = structure?.find(c => c.column_name === field.name)
                return (
                  <td
                    key={j}
                    data-testid={`cell-${field.name}-${i}`}
                    className="border-r border-gray-100 text-gray-600 whitespace-nowrap max-w-xs truncate p-0"
                    onDoubleClick={() => {
                        setSelectedRowIndex(i)
                        if (onCellDoubleClick) {
                            onCellDoubleClick(row, field.name, row[field.name], colInfo?.data_type)
                        }
                    }}
                  >
                    <div className="w-full h-full px-3 py-2 cursor-pointer">
                        <div className="max-h-20 overflow-hidden text-ellipsis whitespace-nowrap">
                            {formatDisplayValue(row[field.name], colInfo?.data_type) || <span className="text-gray-300 italic">null</span>}
                        </div>
                    </div>
                  </td>
                )
              })}
            </tr>
          ))}
          {isAddingRow && (
            <tr className="bg-green-50 sticky bottom-0 z-20 shadow-sm border-t-2 border-green-200">
              {(fields.length > 0 ? fields : (structure || []).map(s => ({ name: s.column_name }))).map((field, j) => {
                const colInfo = structure?.find(c => c.column_name === field.name)
                const isAuto = colInfo?.column_default?.startsWith('nextval') || colInfo?.data_type === 'serial'

                return (
                  <td key={j} className="border-r border-green-200 p-0 min-w-[100px]">
                    <input
                      autoFocus={!isAuto && j === 0}
                      disabled={!!isAuto}
                      className={`w-full h-full px-3 py-2 text-xs bg-transparent focus:outline-none focus:bg-white placeholder:text-green-300/50 font-mono ${isAuto ? 'bg-gray-50/50 text-gray-400 cursor-not-allowed italic' : 'text-gray-700'}`}
                      placeholder={isAuto ? '(auto)' : field.name}
                      value={newRowData?.[field.name] || ''}
                      onChange={(e) => onNewRowChange && onNewRowChange(field.name, e.target.value)}
                    />
                  </td>
                )
              })}
            </tr>
          )}
        </tbody>
      </table>
      )}
    </div>
  )
}
