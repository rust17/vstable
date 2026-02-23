import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SessionView } from './SessionView'
import React from 'react'

// Mock context already handled by setup.tsx
const mockApi = (window as any).api

const defaultProps = {
  id: 'session-1',
  isActive: true,
  onUpdateTitle: vi.fn()
}

describe('SessionView UI Tasks - Maximize & Rubber Band', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockApi.query.mockImplementation(() => Promise.resolve({ success: true, rows: [], fields: [] }))
    mockApi.connect.mockResolvedValue({ success: true })
  })

  const connectAndOpenTab = async () => {
    render(<SessionView {...defaultProps} />)
    fireEvent.change(screen.getByTestId('input-host'), { target: { value: 'localhost' } })
    fireEvent.click(screen.getByTestId('btn-connect'))
    
    await waitFor(() => expect(screen.queryByTestId('connection-form')).not.toBeInTheDocument())

    // Open a query tab
    fireEvent.click(screen.getByTestId('btn-new-query'))
    return await screen.findByTestId('tab-table-New Query')
  }

  describe('Tab Maximization', () => {
    it('maximizes and restores the editor area on double click', async () => {
      const tab = await connectAndOpenTab()
      
      // Sidebar should be visible initially
      const sidebar = screen.getByTestId('session-view-session-1').firstChild
      expect(sidebar).toBeInTheDocument()
      expect(sidebar).not.toHaveClass('hidden')

      // Double click tab to maximize
      fireEvent.doubleClick(tab)
      
      // Expect sidebar to be hidden
      await waitFor(() => {
        expect(sidebar).toHaveClass('hidden')
      })

      // Double click tab again to restore
      fireEvent.doubleClick(tab)
      
      await waitFor(() => {
        expect(sidebar).not.toHaveClass('hidden')
      })
    })
  })

  describe('Rubber Band Effect', () => {
    it('applies overscroll behavior to scrollable areas', async () => {
      await connectAndOpenTab()
      
      // Sidebar scroll area
      const sidebarScroll = screen.getByTestId('sidebar-scroll')
      expect(sidebarScroll.className).toMatch(/overscroll-/)
      
      await waitFor(() => {
        expect(sidebarScroll.className).toMatch(/overscroll-/)
      })
    })
  })

  describe('Data Filtering', () => {
    const setupTable = async () => {
        mockApi.query.mockImplementation((id, sql) => {
            if (sql.includes('SELECT table_name')) return Promise.resolve({ success: true, rows: [{ table_name: 'orders', table_schema: 'public' }] })
            if (sql.includes('information_schema.columns')) return Promise.resolve({ success: true, rows: [{column_name: 'status', data_type: 'text'}, {column_name: 'total', data_type: 'numeric'}] })
            return Promise.resolve({ success: true, rows: [], fields: [] })
        })
        render(<SessionView {...defaultProps} />)
        fireEvent.click(screen.getByTestId('btn-connect'))
        await waitFor(() => screen.getByTestId('table-item-orders'))
        fireEvent.click(screen.getByTestId('table-item-orders'))
        return await screen.findByTestId('filter-bar')
    }

    it('adds and removes filter rows', async () => {
        await setupTable()
        
        const addFilterBtn = screen.getByTestId('btn-add-filter')
        fireEvent.click(addFilterBtn)
        
        expect(screen.getAllByTestId('filter-row')).toHaveLength(1)
        
        fireEvent.click(addFilterBtn)
        expect(screen.getAllByTestId('filter-row')).toHaveLength(2)
        
        const removeBtns = screen.getAllByTestId('btn-remove-filter')
        fireEvent.click(removeBtns[0])
        expect(screen.getAllByTestId('filter-row')).toHaveLength(1)
    })

    it('applies filters on Enter key press', async () => {
        await setupTable()
        fireEvent.click(screen.getByTestId('btn-add-filter'))
        
        const input = screen.getByTestId('filter-value-input')
        fireEvent.change(input, { target: { value: 'completed' } })
        
        // Mock query reset to track new calls
        mockApi.query.mockClear()
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })
        
        await waitFor(() => {
            expect(mockApi.query).toHaveBeenCalledWith(expect.any(String), expect.stringContaining("WHERE \"status\" = 'completed'"))
        })
    })

    it('combines multiple filters with AND logic', async () => {
        await setupTable()
        fireEvent.click(screen.getByTestId('btn-add-filter'))
        fireEvent.click(screen.getByTestId('btn-add-filter'))
        
        const inputs = screen.getAllByTestId('filter-value-input')
        const columnSelects = screen.getAllByTestId('filter-column-select')
        
        fireEvent.change(columnSelects[0], { target: { value: 'status' } })
        fireEvent.change(inputs[0], { target: { value: 'active' } })
        
        fireEvent.change(columnSelects[1], { target: { value: 'total' } })
        fireEvent.change(inputs[1], { target: { value: '100' } })
        
        mockApi.query.mockClear()
        fireEvent.click(screen.getByTestId('btn-apply-filters'))
        
        await waitFor(() => {
            const sql = mockApi.query.mock.calls.find(call => call[1].includes('WHERE'))?.[1]
            expect(sql).toContain('"status" = \'active\'')
            expect(sql).toContain('AND')
            expect(sql).toContain('"total" = \'100\'')
        })
    })
  })
})
