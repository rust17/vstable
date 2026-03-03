import React from 'react'
import { Play, Table as TableIcon } from 'lucide-react'
import { TableTab } from '../../types/session'

interface TabSwitcherProps {
  isOpen: boolean
  tabs: TableTab[]
  mruTabIds: string[]
  selectedIndex: number
  onSelect: (id: string) => void
}

export const TabSwitcher: React.FC<TabSwitcherProps> = ({ isOpen, tabs, mruTabIds, selectedIndex, onSelect }) => {
  const scrollRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (isOpen && scrollRef.current) {
      const activeItem = scrollRef.current.querySelector('[data-active-item="true"]')
      if (activeItem && typeof activeItem.scrollIntoView === 'function') {
        activeItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    }
  }, [selectedIndex, isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[20vh] bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-[500px] rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-in slide-in-from-top-4 duration-200">
        <div className="bg-gray-50 px-4 py-2 border-b border-gray-100 flex items-center justify-between select-none">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Switch Tab</span>
          </div>
          <span className="text-[10px] text-gray-400 font-medium">Ctrl + Tab to cycle</span>
        </div>
        <div 
          ref={scrollRef}
          className="py-1 max-h-[50vh] overflow-y-auto overscroll-contain bg-white"
        >
          {mruTabIds.map((id, index) => {
            const tab = tabs.find(t => t.id === id)
            if (!tab) return null
            const isActive = index === selectedIndex
            return (
              <div
                key={id}
                onMouseDown={(e) => {
                  e.preventDefault() // prevent focus issues
                }}
                onMouseUp={() => {
                  // Delay slightly to ensure contextmenu event (if any) is fully processed and prevented
                  setTimeout(() => onSelect(id), 10)
                }}
                onContextMenu={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
                data-testid={`tab-switcher-item-${tab.name}`}
                data-active-item={isActive}
                className={`px-4 py-3 flex items-center gap-3 transition-colors cursor-pointer select-none ${isActive ? 'bg-primary-600 text-white active-tab-item' : 'hover:bg-gray-50 text-gray-700'}`}
              >
                <div className={`${isActive ? 'text-white' : 'text-gray-400'}`}>
                  {tab.type === 'table' ? <TableIcon size={16} /> : <Play size={16} />}
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-sm font-semibold truncate">{tab.name}</span>
                  {tab.type === 'table' && <span className={`text-[10px] ${isActive ? 'text-primary-100' : 'text-gray-400'}`}>{tab.schema}.{tab.name}</span>}
                </div>
                {index === 0 && <span className={`text-[10px] px-1.5 py-0.5 rounded border ${isActive ? 'bg-primary-500/50 border-primary-400 text-white' : 'bg-gray-100 border-gray-200 text-gray-400'}`}>Active</span>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
