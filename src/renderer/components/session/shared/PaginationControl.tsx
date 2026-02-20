import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationControlProps {
  page: number
  pageSize: number
  totalRows: number
  loading: boolean
  onPageChange: (newPage: number) => void
  onPageSizeChange: (newSize: number) => void
}

export const PaginationControl: React.FC<PaginationControlProps> = ({
  page,
  pageSize,
  totalRows,
  loading,
  onPageChange,
  onPageSizeChange
}) => {
  const totalPages = Math.ceil(totalRows / pageSize) || 1
  
  return (
    <div className="flex items-center gap-3 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg px-3 py-1.5 shadow-lg z-20">
      <div className="flex items-center gap-1 border-r border-gray-100 pr-2 mr-1">
        <button
          data-testid="btn-prev-page"
          disabled={page <= 1 || loading}
          onClick={() => onPageChange(page - 1)}
          className="p-1 hover:bg-gray-100 rounded disabled:opacity-30 text-gray-600"
        >
          <ChevronLeft size={14} />
        </button>
        <input
          data-testid="input-page-number"
          type="number"
          value={page}
          onChange={(e) => onPageChange(parseInt(e.target.value) || 1)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const p = Math.max(1, Math.min(page, totalPages))
              onPageChange(p)
            }
          }}
          className="text-center text-xs font-medium focus:outline-none bg-transparent mx-1 no-arrows [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          style={{ width: `${String(page).length + 1}ch` }}
        />
        <span className="text-[10px] text-gray-400">/ {totalPages}</span>
        <button
          data-testid="btn-next-page"
          disabled={page >= totalPages || loading}
          onClick={() => onPageChange(page + 1)}
          className="p-1 hover:bg-gray-100 rounded disabled:opacity-30 text-gray-600"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      <select
        data-testid="select-page-size"
        value={pageSize}
        onChange={(e) => onPageSizeChange(parseInt(e.target.value))}
        className="text-[10px] font-medium text-gray-600 focus:outline-none bg-transparent cursor-pointer"
      >
        <option value="50">50 / page</option>
        <option value="100">100 / page</option>
        <option value="500">500 / page</option>
      </select>

      <span className="text-[10px] text-gray-400 font-medium border-l border-gray-100 pl-2 ml-1">
        Total: {totalRows}
      </span>
    </div>
  )
}
