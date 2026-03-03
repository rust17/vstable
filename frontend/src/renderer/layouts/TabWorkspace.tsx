import React, { useEffect, useRef, useState } from 'react'
import { Plus, Settings, Play, Table as TableIcon, X } from 'lucide-react'
import { useWorkspaceStore } from '../stores/useWorkspaceStore'
import { Tooltip } from '../components/ui/Tooltip'
import { TableTab } from '../types/session'

interface TabWorkspaceProps {
  isMaximized: boolean
  setIsMaximized: (val: boolean) => void
}

export const TabWorkspace: React.FC<TabWorkspaceProps> = ({ isMaximized, setIsMaximized }) => {
  const {
    tabs,
    activeTabId,
    setActiveTabId,
    closeTab,
    closeOthers,
    closeToRight,
    closeAll
  } = useWorkspaceStore(s => s)

  const [tabContextMenu, setTabContextMenu] = useState<{ x: number, y: number, tabId: string } | null>(null)
  const tabContainerRef = useRef<HTMLDivElement>(null)

  // Scroll active tab into view
  useEffect(() => {
    if (activeTabId && tabContainerRef.current) {
      const activeElement = tabContainerRef.current.querySelector(`[data-active="true"]`)
      if (activeElement && typeof activeElement.scrollIntoView === 'function') {
        activeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
      }
    }
  }, [activeTabId])

  return (
    <>
      <div
        className="border-b border-gray-200 flex items-center px-2 justify-between bg-[#f8f9fa] h-11 gap-2 select-none overflow-hidden"
        onDoubleClick={(e) => {
            if (e.target === e.currentTarget) setIsMaximized(!isMaximized)
        }}
      >
        <div
            ref={tabContainerRef}
            className="flex items-end gap-1 overflow-x-auto no-drag scrollbar-hide flex-1 h-full"
            onDoubleClick={(e) => {
                if (e.target === e.currentTarget) setIsMaximized(!isMaximized)
            }}
        >
            {tabs.map((tab: TableTab) => (
                <Tooltip key={tab.id} content={tab.type === 'table' ? `${tab.schema}.${tab.name}` : tab.name}>
                    <div
                        data-testid={`tab-table-${tab.name}`}
                        data-active={activeTabId === tab.id}
                        onClick={() => setActiveTabId(tab.id)}
                        onDoubleClick={() => setIsMaximized(!isMaximized)}
                        onContextMenu={(e) => {
                            e.preventDefault()
                            setTabContextMenu({ x: e.clientX, y: e.clientY, tabId: tab.id })
                        }}
                        className={`group flex items-center gap-2 px-4 h-9 text-[11px] font-medium rounded-t-lg cursor-pointer transition-all border-x border-t ${activeTabId === tab.id ? 'bg-white text-primary-600 border-gray-200 -mb-[1px] z-10 shadow-[0_-1px_3px_rgba(0,0,0,0.02)]' : 'bg-transparent text-gray-500 hover:bg-gray-200/50 border-transparent'}`}
                    >
                        {tab.type === 'table' ? <TableIcon size={12} className={activeTabId === tab.id ? 'text-primary-500' : 'text-gray-400'} /> : tab.type === 'query' ? <Play size={12} className={activeTabId === tab.id ? 'text-primary-500' : 'text-gray-400'} /> : <Settings size={12} className={activeTabId === tab.id ? 'text-primary-500' : 'text-gray-400'} />}
                        <span className="truncate max-w-[120px]">{tab.name}</span>
                        <button
                            data-testid={`close-tab-${tab.name}`}
                            onClick={(e) => { e.stopPropagation(); closeTab(tab.id) }}
                            className={`p-0.5 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-700 transition-opacity ${activeTabId === tab.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                        >
                            <X size={10} />
                        </button>
                    </div>
                </Tooltip>
            ))}
        </div>
      </div>

      {tabContextMenu && (
        <>
            <div className="fixed inset-0 z-[100]" onClick={() => setTabContextMenu(null)} />
            <div 
                className="fixed z-[101] bg-white border border-gray-200 shadow-xl rounded-lg py-1 min-w-[160px] animate-in fade-in zoom-in-95 duration-100"
                style={{ top: tabContextMenu.y, left: tabContextMenu.x }}
            >
                <button 
                    onClick={() => { closeTab(tabContextMenu.tabId); setTabContextMenu(null) }}
                    className="w-full text-left px-3 py-1.5 text-[11px] text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-between"
                >
                    Close <span className="text-[9px] text-gray-400">Cmd+W</span>
                </button>
                <button 
                    onClick={() => { closeOthers(tabContextMenu.tabId); setTabContextMenu(null) }}
                    className="w-full text-left px-3 py-1.5 text-[11px] text-gray-700 hover:bg-gray-50 transition-colors"
                >
                    Close Others
                </button>
                <button 
                    onClick={() => { closeToRight(tabContextMenu.tabId); setTabContextMenu(null) }}
                    className="w-full text-left px-3 py-1.5 text-[11px] text-gray-700 hover:bg-gray-50 transition-colors"
                >
                    Close Tabs to Right
                </button>
                <div className="border-t border-gray-100 my-1" />
                <button 
                    onClick={() => { closeAll(); setTabContextMenu(null) }}
                    className="w-full text-left px-3 py-1.5 text-[11px] text-red-600 hover:bg-red-50 transition-colors"
                >
                    Close All
                </button>
            </div>
        </>
      )}
    </>
  )
}