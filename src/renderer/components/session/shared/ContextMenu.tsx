import React, { useEffect } from 'react'
import { Trash2 } from 'lucide-react'

interface ContextMenuProps {
  x: number
  y: number
  onDelete: () => void
  onClose: () => void
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, onDelete, onClose }) => {
  useEffect(() => {
    const handleClick = () => onClose()
    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [onClose])

  return (
    <div 
      className="fixed z-[300] bg-white border border-gray-200 shadow-lg rounded-lg py-1 min-w-[140px] animate-in fade-in zoom-in-95 duration-100"
      style={{ top: y, left: x }}
      onClick={e => e.stopPropagation()}
    >
      <button 
        onClick={() => { onDelete(); onClose() }}
        className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
      >
        <Trash2 size={14} /> Delete Row
      </button>
    </div>
  )
}
