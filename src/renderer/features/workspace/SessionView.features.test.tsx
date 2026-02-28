import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SessionView } from './SessionView'
import React from 'react'

// Mock the window.api is already done in setup.tsx, we just get references
const mockApi = (window as any).api

const defaultProps = {
  id: 'session-1',
  isActive: true,
  onUpdateTitle: vi.fn()
}

describe('SessionView Feature Tasks - Keyboard & Filter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default mock implementation for common queries
    mockApi.query.mockImplementation((id, sql) => {
      const s = sql.toLowerCase()
      if (s.includes('select table_name') || s.includes('information_schema.tables')) {
        return Promise.resolve({ 
          success: true, 
          rows: [
            { table_name: 'users', table_schema: 'public' }, 
            { table_name: 'posts', table_schema: 'public' }
          ] 
        })
      }
      if (s.includes('information_schema.columns')) {
        return Promise.resolve({ success: true, rows: [{ column_name: 'id', data_type: 'integer' }, { column_name: 'name', data_type: 'text' }] })
      }
      if (s.includes('primary key')) {
        return Promise.resolve({ success: true, rows: [{ column_name: 'id' }] })
      }
      if (s.includes('from "public"."users"')) {
         if (s.includes('count(*)')) {
           return Promise.resolve({ success: true, rows: [{ count: '1' }] })
         }
         return Promise.resolve({ success: true, rows: [{ id: 1, name: 'Alice' }], fields: [{ name: 'id' }, { name: 'name' }] })
      }
      return Promise.resolve({ success: true, rows: [] })
    })
  })

  const connectAndShowSidebar = async () => {
    mockApi.connect.mockResolvedValue({ success: true })
    render(<SessionView {...defaultProps} />)
    
    // Fill form and connect
    fireEvent.change(screen.getByTestId('input-host'), { target: { value: 'localhost' } })
    fireEvent.click(screen.getByTestId('btn-connect'))
    
    // Wait for sidebar item to appear
    await screen.findByTestId('table-item-users', {}, { timeout: 3000 })
  }

  describe('Keyboard Integration', () => {
    it('switches tabs with Ctrl + Tab', async () => {
      await connectAndShowSidebar()
      
      // Open two tables to have multiple tabs
      fireEvent.click(screen.getByTestId('table-item-users'))
      await screen.findByTestId('tab-table-users')
      
      fireEvent.click(screen.getByTestId('table-item-posts'))
      await screen.findByTestId('tab-table-posts')
      
      // Initially, 'posts' should be active
      expect(screen.getByTestId('tab-table-posts')).toHaveAttribute('data-active', 'true')
      
      // Press Ctrl + Tab
      fireEvent.keyDown(window, { key: 'Tab', ctrlKey: true })
      fireEvent.keyUp(window, { key: 'Control' })
      
      // Now 'users' should be active (assuming it cycles)
      await waitFor(() => {
        expect(screen.getByTestId('tab-table-users')).toHaveAttribute('data-active', 'true')
      })
    })

    it('opens fuzzy search with Cmd + P', async () => {
      await connectAndShowSidebar()
      
      // Press Cmd + P
      fireEvent.keyDown(window, { key: 'p', metaKey: true })
      
      // Check if search input appears
      const searchInput = await screen.findByPlaceholderText(/Filter tables/i)
      expect(searchInput).toBeInTheDocument()
    })

    it('closes current tab with Cmd + W', async () => {
      await connectAndShowSidebar()
      
      fireEvent.click(screen.getByTestId('table-item-users'))
      await waitFor(() => expect(screen.getByTestId('tab-table-users')).toBeInTheDocument())
      
      // Press Cmd + W
      fireEvent.keyDown(window, { key: 'w', metaKey: true })
      
      // Tab should be gone
      await waitFor(() => {
        expect(screen.queryByTestId('tab-table-users')).not.toBeInTheDocument()
      })
    })

    it('opens new Run Query tab with Cmd + T', async () => {
      await connectAndShowSidebar()
      
      // Press Cmd + T
      fireEvent.keyDown(window, { key: 't', metaKey: true })
      
      // Should see a 'New Query' tab
      await waitFor(() => {
        expect(screen.getByText(/New Query/i)).toBeInTheDocument()
      })
    })

    it('refreshes current tab with Cmd + R', async () => {
      await connectAndShowSidebar()
      
      fireEvent.click(screen.getByTestId('table-item-users'))
      await waitFor(() => expect(screen.getByTestId('tab-table-users')).toBeInTheDocument())
      
      // Clear mocks to start fresh for the refresh check
      mockApi.query.mockClear()
      
      // Press Cmd + R
      fireEvent.keyDown(window, { key: 'r', metaKey: true })
      
      // Should trigger a new query
      await waitFor(() => {
        // Find if there's a new SELECT * FROM "public"."users" query
        const selectQueries = mockApi.query.mock.calls.filter(call => 
          call[1].includes('SELECT * FROM "public"."users"')
        )
        expect(selectQueries.length).toBeGreaterThan(0)
      })
    })

    it('focuses filter input with Cmd + F', async () => {
      await connectAndShowSidebar()
      
      fireEvent.click(screen.getByTestId('table-item-users'))
      await waitFor(() => expect(screen.getByTestId('tab-table-users')).toBeInTheDocument())
      
      // Wait for table to be ready
      await screen.findByTestId('cell-name-0')

      // Press Cmd + F
      fireEvent.keyDown(window, { key: 'f', metaKey: true })
      
      // First filter input should be focused
      const filterInput = await screen.findByTestId('filter-value-input')
      await waitFor(() => expect(document.activeElement).toBe(filterInput))
    })

    it('handles Esc and Cmd + Enter in Edit Modal', async () => {
      await connectAndShowSidebar()
      
      fireEvent.click(screen.getByTestId('table-item-users'))
      await waitFor(() => expect(screen.getByTestId('cell-name-0')).toBeInTheDocument())
      
      // Open modal
      fireEvent.doubleClick(screen.getByTestId('cell-name-0').firstChild as HTMLElement)
      const modal = await screen.findByTestId('edit-textarea')
      expect(modal).toBeInTheDocument()
      
      // Test ESC to cancel
      fireEvent.keyDown(modal.parentElement!.parentElement!, { key: 'Escape' })
      await waitFor(() => expect(screen.queryByTestId('edit-textarea')).not.toBeInTheDocument())
      
      // Open again
      fireEvent.doubleClick(screen.getByTestId('cell-name-0').firstChild as HTMLElement)
      const modal2 = await screen.findByTestId('edit-textarea')
      
      // Test Cmd + Enter to save
      fireEvent.keyDown(modal2.parentElement!.parentElement!, { key: 'Enter', metaKey: true })
      await waitFor(() => expect(screen.queryByTestId('edit-textarea')).not.toBeInTheDocument())
    })
  })

  describe('Filter Bar', () => {
    it('renders filter bar and allows adding/removing filters', async () => {
      await connectAndShowSidebar()
      
      fireEvent.click(screen.getByTestId('table-item-users'))
      
      // Should see filter row
      const filterRow = await screen.findByTestId('filter-row-0')
      expect(filterRow).toBeInTheDocument()
      
      // Add filter
      fireEvent.click(screen.getByTestId('btn-add-filter'))
      expect(await screen.findByTestId('filter-row-1')).toBeInTheDocument()
      
      // Remove filter
      fireEvent.click(screen.getByTestId('btn-remove-filter-1'))
      await waitFor(() => expect(screen.queryByTestId('filter-row-1')).not.toBeInTheDocument())
    })

    it('applies filters to query', async () => {
      await connectAndShowSidebar()
      
      fireEvent.click(screen.getByTestId('table-item-users'))
      
      // Set filter values
      const columnDropdown = await screen.findByTestId('filter-column-0')
      fireEvent.click(columnDropdown.firstChild as HTMLElement)
      const nameOption = screen.getAllByText('name').find(el => el.className.includes('text-xs'))
      fireEvent.click(nameOption!)
      
      const valueInput = screen.getByTestId('filter-value-input')
      fireEvent.change(valueInput, { target: { value: 'Alice' } })
      
      // Press Enter to apply
      fireEvent.keyDown(valueInput, { key: 'Enter' })
      
      // Verify query includes WHERE clause
      await waitFor(() => {
        const lastQuery = mockApi.query.mock.calls.find(call => call[1].includes('SELECT * FROM "public"."users"') && call[1].includes('WHERE'))
        expect(lastQuery).toBeDefined()
        expect(lastQuery[1]).toContain("WHERE \"name\" = 'Alice'")
      })
    })
  })
})
