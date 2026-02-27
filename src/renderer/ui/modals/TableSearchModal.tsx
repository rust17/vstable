import React, { useState, useEffect } from 'react'
import { Database, Table as TableIcon } from 'lucide-react'

interface TableSearchModalProps {
  isOpen: boolean
  onClose: () => void
  tables: {table_name: string, table_schema: string}[]
  onSelect: (schema: string, name: string) => void
}

export const TableSearchModal: React.FC<TableSearchModalProps> = ({ isOpen, onClose, tables, onSelect }) => {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
    }
  }, [isOpen])

  const filtered = tables.filter(t => 
    t.table_name.toLowerCase().includes(query.toLowerCase()) || 
    t.table_schema.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 10)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] bg-black/20 backdrop-blur-[2px]" onClick={onClose}>
      <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-in slide-in-from-top-4 duration-200" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-3 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
            <Database size={18} className="text-gray-400" />
            <input
              autoFocus
              placeholder="Search tables..."
              className="flex-1 bg-transparent border-none outline-none text-sm text-gray-800"
              value={query}
              onChange={e => {
                setQuery(e.target.value)
                setSelectedIndex(0)
              }}
              onKeyDown={e => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  setSelectedIndex(prev => (prev + 1) % Math.max(1, filtered.length))
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault()
                  setSelectedIndex(prev => (prev - 1 + filtered.length) % Math.max(1, filtered.length))
                } else if (e.key === 'Enter' && filtered[selectedIndex]) {
                  onSelect(filtered[selectedIndex].table_schema, filtered[selectedIndex].table_name)
                } else if (e.key === 'Escape') {
                  onClose()
                }
              }}
            />
          </div>
        </div>
        <div className="max-h-[50vh] overflow-y-auto py-2 elastic-scroll overscroll-y-auto">
          {filtered.length > 0 ? filtered.map((t, i) => (
            <div
              key={`${t.table_schema}.${t.table_name}`}
              className={`px-4 py-3 flex items-center gap-3 cursor-pointer transition-colors ${i === selectedIndex ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 text-gray-700'}`}
              onClick={() => onSelect(t.table_schema, t.table_name)}
            >
              <TableIcon size={16} className={i === selectedIndex ? 'text-blue-200' : 'text-gray-400'} />
              <div className="flex flex-col">
                <span className="text-sm font-semibold">{t.table_name}</span>
                <span className={`text-[10px] ${i === selectedIndex ? 'text-blue-100' : 'text-gray-400'}`}>{t.table_schema}</span>
              </div>
            </div>
          )) : (
            <div className="px-4 py-8 text-center text-gray-400 text-sm italic">No tables found</div>
          )}
        </div>
        <div className="bg-gray-50 px-4 py-2 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-400">
          <span>↑↓ to navigate, Enter to open</span>
          <span>Esc to close</span>
        </div>
      </div>
    </div>
  )
}
