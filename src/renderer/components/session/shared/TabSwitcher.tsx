import React from 'react'
import { Play, Table as TableIcon } from 'lucide-react'
import { TableTab } from '../../../types/session'

interface TabSwitcherProps {
  isOpen: boolean
  tabs: TableTab[]
  mruTabIds: string[]
  selectedIndex: number
}

export const TabSwitcher: React.FC<TabSwitcherProps> = ({ isOpen, tabs, mruTabIds, selectedIndex }) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/10 backdrop-blur-[1px]">
      <div className="bg-white w-full max-w-md rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in duration-150">
        <div className="bg-gray-50 px-4 py-2 border-b border-gray-100 flex items-center justify-between">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Switch Tab</span>
          <span className="text-[10px] text-gray-400">Ctrl + Tab to cycle</span>
        </div>
        <div className="py-2 max-h-[60vh] overflow-y-auto elastic-scroll overscroll-y-auto">
          {mruTabIds.map((id, index) => {
            const tab = tabs.find(t => t.id === id)
            if (!tab) return null
            return (
              <div
                key={id}
                className={`px-4 py-2 flex items-center gap-3 transition-colors ${index === selectedIndex ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 text-gray-700'}`}
              >
                {tab.type === 'table' ? <TableIcon size={14} /> : <Play size={14} />}
                <span className="text-sm font-medium truncate flex-1">{tab.name}</span>
                {index === 0 && <span className={`text-[10px] ${index === selectedIndex ? 'text-blue-200' : 'text-gray-400'}`}>Active</span>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
