import { useEffect } from 'react'
import { useWorkspaceStore } from './useWorkspaceStore'

export const useShortcutStore = (isActive: boolean, setShowTableSearch: (val: boolean) => void) => {
  const {
    activeTabId,
    closeTab,
    openQuery,
    updateTab,
    showTabSwitcher,
    setShowTabSwitcher,
    setSwitcherIndex,
    mruTabIds,
    tabs,
    setActiveTabId,
    switcherIndex
  } = useWorkspaceStore(s => s)

  useEffect(() => {
    if (!isActive) return

    let isTabSwitcherOpen = showTabSwitcher

    const handleKeyDown = (e: KeyboardEvent) => {
        // Cmd+W: Close Tab
        if ((e.metaKey || e.ctrlKey) && e.key === 'w' && activeTabId) {
            e.preventDefault()
            closeTab(activeTabId)
        }
        // Cmd+T: New Query
        if ((e.metaKey || e.ctrlKey) && e.key === 't') {
            e.preventDefault()
            openQuery()
        }
        // Cmd+R: Refresh
        if ((e.metaKey || e.ctrlKey) && e.key === 'r' && activeTabId) {
            e.preventDefault()
            updateTab(activeTabId, { refreshKey: Date.now() })
        }
        // Cmd+F: Focus Filter
        if ((e.metaKey || e.ctrlKey) && e.key === 'f' && activeTabId) {
            e.preventDefault()
            updateTab(activeTabId, { focusKey: Date.now() })
        }
        // Cmd+P: Fuzzy Search
        if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
            e.preventDefault()
            setShowTableSearch(true)
        }
        // Ctrl+Tab: Switch Tab
        if (e.ctrlKey && e.key === 'Tab') {
            e.preventDefault()
            isTabSwitcherOpen = true
            setShowTabSwitcher(true)
            setSwitcherIndex(prev => {
               if (!showTabSwitcher) return mruTabIds.length > 1 ? 1 : 0
               const next = prev + 1
               return next >= mruTabIds.length ? 0 : next
            })
        }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control') {
         if (isTabSwitcherOpen) {
           isTabSwitcherOpen = false
           setShowTabSwitcher(false)
           
           // FIX: Switch to the selected tab when Control is released
           const selectedId = mruTabIds[switcherIndex]
           if (selectedId) {
             setActiveTabId(selectedId)
           }
           setSwitcherIndex(0)
         }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    
    return () => {
        window.removeEventListener('keydown', handleKeyDown)
        window.removeEventListener('keyup', handleKeyUp)
    }
  }, [isActive, activeTabId, closeTab, openQuery, mruTabIds, showTabSwitcher, setShowTabSwitcher, setSwitcherIndex, setShowTableSearch, updateTab, switcherIndex, setActiveTabId])
}