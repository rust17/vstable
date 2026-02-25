import React, { useEffect } from 'react'
import { Trash2, Plus } from 'lucide-react'

interface ContextMenuProps {
  x: number
  y: number
  onDelete: () => void
  onAdd: () => void
  onClose: () => void
  isRowSelected: boolean
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, onDelete, onAdd, onClose, isRowSelected }) => {
  useEffect(() => {
    const handleClick = () => onClose()
    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [onClose])

  return (
    <div 
      className="fixed z-[300] bg-white border border-gray-200 shadow-xl rounded-lg py-1 min-w-[160px] animate-in fade-in zoom-in-95 duration-100"
      style={{ top: y, left: x }}
      onClick={e => e.stopPropagation()}
    >
      <button 
        disabled={!isRowSelected}
        onClick={() => { if (isRowSelected) { onDelete(); onClose(); } }}
        className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 font-medium transition-colors ${isRowSelected ? 'text-red-600 hover:bg-red-50' : 'text-gray-300 cursor-not-allowed'}`}
      >
        <Trash2 size={14} /> Delete Row
      </button>
      <button 
        disabled={isRowSelected}
        onClick={() => { if (!isRowSelected) { onAdd(); onClose(); } }}
        className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 font-medium transition-colors ${!isRowSelected ? 'text-blue-600 hover:bg-blue-50' : 'text-gray-300 cursor-not-allowed'}`}
      >
        <Plus size={14} /> Add Row
      </button>
    </div>
  )
}
