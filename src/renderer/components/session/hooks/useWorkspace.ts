import { useState, useCallback, useEffect } from 'react'
import { TableTab, FilterCondition } from '../../../types/session'

export const useWorkspace = (initialTabs: TableTab[] = []) => {
  const [tabs, setTabs] = useState<TableTab[]>(initialTabs)
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const [mruTabIds, setMruTabIds] = useState<string[]>([])
  const [switcherIndex, setSwitcherIndex] = useState(0)
  const [showTabSwitcher, setShowTabSwitcher] = useState(false)

  // Track MRU
  useEffect(() => {
    if (activeTabId && !showTabSwitcher) {
      setMruTabIds(prev => {
        const filtered = prev.filter(id => id !== activeTabId && tabs.some(t => t.id === id))
        return [activeTabId, ...filtered]
      })
    }
  }, [activeTabId, showTabSwitcher, tabs])

  // Cleanup MRU when tabs are closed
  useEffect(() => {
    setMruTabIds(prev => prev.filter(id => tabs.some(t => t.id === id)))
  }, [tabs])

  const openTable = useCallback((schema: string, name: string) => {
    // We allow multiple tabs for the same table now to support isolation
    const tabId = crypto.randomUUID()
    const newTab: TableTab = {
      id: tabId,
      type: 'table',
      schema,
      name,
      pk: null,
      page: 1,
      pageSize: 100,
      totalRows: 0,
      results: null,
      structure: [],
      query: `SELECT * FROM "${schema}"."${name}"`,
      filters: [{ id: crypto.randomUUID(), column: '', operator: '=', value: '' }]
    }

    setTabs(prev => [...prev, newTab])
    setActiveTabId(tabId)
    return newTab
  }, [tabs])

  const openQuery = useCallback(() => {
    const tabId = crypto.randomUUID()
    const newTab: TableTab = {
      id: tabId,
      type: 'query',
      name: 'New Query',
      results: null,
      query: '-- Write your SQL here\nSELECT * FROM '
    }
    setTabs(prev => [...prev, newTab])
    setActiveTabId(tabId)
    return newTab
  }, [])

  const closeTab = useCallback((tabId: string) => {
    setTabs(prev => {
      const newTabs = prev.filter(t => t.id !== tabId)
      if (activeTabId === tabId) {
        setActiveTabId(newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null)
      }
      return newTabs
    })
  }, [activeTabId])

  const updateTab = useCallback((tabId: string, updates: Partial<TableTab>) => {
    setTabs(prev => prev.map(t => t.id === tabId ? { ...t, ...updates } : t))
  }, [])

  const activeTab = tabs.find(t => t.id === activeTabId)

  return {
    tabs,
    activeTab,
    activeTabId,
    setActiveTabId,
    mruTabIds,
    showTabSwitcher,
    setShowTabSwitcher,
    switcherIndex,
    setSwitcherIndex,
    openTable,
    openQuery,
    closeTab,
    updateTab
  }
}
